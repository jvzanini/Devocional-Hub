/**
 * Auto-ajuste de planos de leitura baseado na análise de transcrição.
 *
 * Após processar uma sessão, compara os capítulos realmente lidos
 * (extraídos da transcrição) com os capítulos planejados para aquele dia
 * e ajusta os dias futuros do plano automaticamente.
 */

import { prisma } from "@/lib/db";
import { BIBLE_BOOKS, findBookByCode } from "@/lib/bible-books";
import { downloadFile } from "@/lib/storage";

const TAG = "[ReadingPlanSync]";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converte string de capítulos como "3-5" em array [3, 4, 5]
 */
function parseChaptersRange(chapters: string): number[] {
  const result: number[] = [];
  for (const part of chapters.split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) result.push(n);
    }
  }
  return result;
}

/**
 * Converte array de capítulos [3, 4, 5] em string compacta "3-5"
 */
function formatChaptersRange(chapters: number[]): string {
  if (chapters.length === 0) return "";
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

/**
 * Adiciona N dias a uma data (UTC, sem horário)
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Compara duas datas ignorando horário (apenas ano/mês/dia UTC)
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// ─── Extração de capítulos da transcrição ─────────────────────────────────────

/**
 * Identifica capítulos específicos mencionados na transcrição.
 *
 * Procura padrões como:
 * - "capítulo 10", "cap 10", "cap. 10"
 * - "Gênesis 10", "Gn 10"
 * - "capítulos 10 e 11", "capítulos 10, 11 e 12"
 * - "capítulo 10 a 12", "cap 10 ao 12"
 */
export function extractChaptersFromTranscription(
  text: string,
  bookCode: string
): number[] {
  const book = findBookByCode(bookCode);
  if (!book) {
    console.log(`${TAG} Livro não encontrado para código: ${bookCode}`);
    return [];
  }

  const chapters = new Set<number>();
  const maxChapter = book.chapters;

  // Escapa caracteres especiais de regex no nome/abreviação
  const escapeName = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Variações do nome do livro para busca
  const nameVariants = [
    escapeName(book.name),
    escapeName(book.abbr),
    // Sem acentos (normalização simples)
    escapeName(book.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
    escapeName(book.abbr.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
  ];
  const namePattern = nameVariants.join("|");

  // Padrão 1: "capítulo X", "cap X", "cap. X"
  const capPrefixPattern =
    /cap[íi]tulos?\s*\.?\s*(\d+(?:\s*(?:,\s*\d+)*(?:\s*(?:e|a|ao|até)\s*\d+)*))/gi;

  let match: RegExpExecArray | null;
  while ((match = capPrefixPattern.exec(text)) !== null) {
    extractNumbersFromMatch(match[1], chapters, maxChapter);
  }

  // Padrão 2: "NomeLivro X" ou "Abrev X" (ex: "Gênesis 10", "Gn 10")
  const bookNamePattern = new RegExp(
    `(?:${namePattern})\\s*\\.?\\s*(\\d+(?:\\s*(?:,\\s*\\d+)*(?:\\s*(?:e|a|ao|até)\\s*\\d+)*))`,
    "gi"
  );

  while ((match = bookNamePattern.exec(text)) !== null) {
    extractNumbersFromMatch(match[1], chapters, maxChapter);
  }

  const result = [...chapters].sort((a, b) => a - b);
  console.log(
    `${TAG} Capítulos extraídos para ${book.name} (${bookCode}): [${result.join(", ")}]`
  );
  return result;
}

/**
 * Extrai números individuais de uma string como "10, 11 e 12" ou "10 a 12"
 */
function extractNumbersFromMatch(
  raw: string,
  chapters: Set<number>,
  maxChapter: number
): void {
  // Verifica se tem range ("X a Y", "X ao Y", "X até Y")
  const rangeMatch = raw.match(/(\d+)\s*(?:a|ao|até)\s*(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    for (let i = start; i <= end && i <= maxChapter; i++) {
      if (i >= 1) chapters.add(i);
    }
    return;
  }

  // Extrai números separados por vírgula e/ou "e"
  const numbers = raw.match(/\d+/g);
  if (numbers) {
    for (const n of numbers) {
      const num = parseInt(n, 10);
      if (num >= 1 && num <= maxChapter) {
        chapters.add(num);
      }
    }
  }
}

// ─── Sincronização principal ──────────────────────────────────────────────────

/**
 * Sincroniza o plano de leitura com base na transcrição de uma sessão.
 *
 * Fluxo:
 * 1. Busca a sessão e sua transcrição limpa
 * 2. Encontra o plano IN_PROGRESS para a data da sessão
 * 3. Extrai capítulos da transcrição
 * 4. Compara com capítulos planejados
 * 5. Ajusta dias futuros se necessário
 */
export async function syncReadingPlanWithTranscription(
  sessionId: string
): Promise<void> {
  try {
    console.log(`${TAG} Iniciando sincronização para sessão ${sessionId}`);

    // 1. Buscar sessão com documentos
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { documents: true },
    });

    if (!session) {
      console.log(`${TAG} Sessão ${sessionId} não encontrada`);
      return;
    }

    if (!session.chapterRef) {
      console.log(`${TAG} Sessão ${sessionId} não tem chapterRef definido`);
      return;
    }

    // Extrair bookCode do chapterRef (formato esperado: "GEN.10" ou "GEN")
    const bookCode = session.chapterRef.split(".")[0];
    console.log(
      `${TAG} Sessão ${sessionId}: data=${session.date.toISOString()}, chapterRef=${session.chapterRef}, bookCode=${bookCode}`
    );

    // 2. Buscar transcrição limpa
    const transcriptDoc = session.documents.find(
      (d) => d.type === "TRANSCRIPT_CLEAN"
    );

    if (!transcriptDoc) {
      console.log(
        `${TAG} Nenhum documento TRANSCRIPT_CLEAN encontrado para sessão ${sessionId}`
      );
      return;
    }

    let transcriptText: string;
    try {
      const buffer = await downloadFile(transcriptDoc.storagePath);
      transcriptText = buffer.toString("utf-8");
    } catch (err) {
      console.log(
        `${TAG} Erro ao ler transcrição (${transcriptDoc.storagePath}): ${err}`
      );
      return;
    }

    if (!transcriptText || transcriptText.trim().length === 0) {
      console.log(`${TAG} Transcrição vazia para sessão ${sessionId}`);
      return;
    }

    // 3. Extrair capítulos da transcrição
    const actualChapters = extractChaptersFromTranscription(
      transcriptText,
      bookCode
    );

    if (actualChapters.length === 0) {
      console.log(
        `${TAG} Nenhum capítulo identificado na transcrição da sessão ${sessionId}`
      );
      return;
    }

    // 4. Encontrar plano IN_PROGRESS que cobre essa data
    const sessionDate = session.date;

    const activePlan = await prisma.readingPlan.findFirst({
      where: {
        bookCode: bookCode,
        status: "IN_PROGRESS",
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate },
      },
      include: {
        days: { orderBy: { date: "asc" } },
      },
    });

    if (!activePlan) {
      console.log(
        `${TAG} Nenhum plano IN_PROGRESS encontrado para ${bookCode} na data ${sessionDate.toISOString()}`
      );
      return;
    }

    console.log(
      `${TAG} Plano encontrado: ${activePlan.id} (${activePlan.bookName})`
    );

    // 5. Encontrar o dia planejado para a data da sessão
    const planDay = activePlan.days.find((d) => isSameDay(d.date, sessionDate));

    if (!planDay) {
      console.log(
        `${TAG} Nenhum ReadingPlanDay encontrado para ${sessionDate.toISOString()} no plano ${activePlan.id}`
      );
      return;
    }

    const plannedChapters = parseChaptersRange(planDay.chapters);
    const actualChaptersStr = formatChaptersRange(actualChapters);

    console.log(
      `${TAG} Planejado: [${plannedChapters.join(", ")}] | Lido: [${actualChapters.join(", ")}]`
    );

    // 6. Calcular diferença
    const maxPlanned = Math.max(...plannedChapters);
    const maxActual = Math.max(...actualChapters);
    const minPlanned = Math.min(...plannedChapters);
    const minActual = Math.min(...actualChapters);

    // Quantos capítulos a mais ou a menos foram lidos
    const plannedCount = plannedChapters.length;
    const actualCount = actualChapters.length;
    const chapterDiff = actualCount - plannedCount;

    // Determinar se está AHEAD ou BEHIND
    // BEHIND: leu menos capítulos que o planejado OU leu capítulos anteriores
    // AHEAD: leu mais capítulos que o planejado OU leu capítulos além
    let dayShift = 0;
    let logNote = "";

    if (maxActual < maxPlanned || actualCount < plannedCount) {
      // BEHIND: empurrar dias futuros para frente
      // Calcula quantos dias precisa empurrar baseado nos capítulos restantes
      const chaptersNotRead = plannedChapters.filter(
        (c) => !actualChapters.includes(c)
      );
      const chaptersPerDay = activePlan.chaptersPerDay || 1;
      dayShift = Math.ceil(chaptersNotRead.length / chaptersPerDay);

      logNote = `BEHIND: Leu [${actualChaptersStr}] em vez de [${planDay.chapters}]. ` +
        `${chaptersNotRead.length} cap. faltaram. Empurrando ${dayShift} dia(s).`;
      console.log(`${TAG} ${logNote}`);
    } else if (maxActual > maxPlanned || actualCount > plannedCount) {
      // AHEAD: puxar dias futuros para trás
      const extraChapters = actualChapters.filter(
        (c) => !plannedChapters.includes(c)
      );
      const chaptersPerDay = activePlan.chaptersPerDay || 1;
      dayShift = -Math.ceil(extraChapters.length / chaptersPerDay);

      logNote = `AHEAD: Leu [${actualChaptersStr}] em vez de [${planDay.chapters}]. ` +
        `${extraChapters.length} cap. extras. Puxando ${Math.abs(dayShift)} dia(s).`;
      console.log(`${TAG} ${logNote}`);
    } else {
      // ON TRACK: sem ajuste necessário
      logNote = `ON TRACK: Leu [${actualChaptersStr}] conforme planejado [${planDay.chapters}].`;
      console.log(`${TAG} ${logNote}`);
    }

    // 7. Atualizar o dia atual com capítulos realmente lidos
    await prisma.readingPlanDay.update({
      where: { id: planDay.id },
      data: {
        completed: true,
        actualChapters: actualChaptersStr,
        logNote: logNote,
      },
    });
    console.log(`${TAG} ReadingPlanDay ${planDay.id} atualizado com leitura real`);

    // 8. Ajustar dias futuros se necessário
    if (dayShift !== 0) {
      await adjustFutureDays(activePlan, sessionDate, dayShift, bookCode);
    }

    console.log(`${TAG} Sincronização concluída para sessão ${sessionId}`);
  } catch (error) {
    console.log(`${TAG} Erro na sincronização: ${error}`);
  }
}

// ─── Ajuste de dias futuros ───────────────────────────────────────────────────

/**
 * Ajusta as datas dos dias futuros do plano.
 *
 * Se dayShift > 0 (BEHIND): empurra dias futuros N dias para frente
 * Se dayShift < 0 (AHEAD): puxa dias futuros N dias para trás
 *
 * Também verifica se o ajuste afeta planos UPCOMING subsequentes.
 */
async function adjustFutureDays(
  plan: {
    id: string;
    bookCode: string;
    endDate: Date;
    days: { id: string; date: Date; completed: boolean }[];
  },
  sessionDate: Date,
  dayShift: number,
  bookCode: string
): Promise<void> {
  try {
    console.log(
      `${TAG} Ajustando dias futuros do plano ${plan.id}: shift=${dayShift > 0 ? "+" : ""}${dayShift} dia(s)`
    );

    // Selecionar apenas dias futuros (não concluídos e após a data da sessão)
    const futureDays = plan.days.filter(
      (d) => !d.completed && d.date > sessionDate
    );

    if (futureDays.length === 0) {
      console.log(`${TAG} Nenhum dia futuro para ajustar`);
      return;
    }

    console.log(`${TAG} ${futureDays.length} dias futuros serão ajustados`);

    // Atualizar cada dia futuro com a nova data
    // Quando empurramos para frente (dayShift > 0), processamos do último para o primeiro
    // para evitar conflito de unique constraint [planId, date]
    const sortedDays =
      dayShift > 0
        ? [...futureDays].sort((a, b) => b.date.getTime() - a.date.getTime())
        : [...futureDays].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const day of sortedDays) {
      const newDate = addDays(day.date, dayShift);
      await prisma.readingPlanDay.update({
        where: { id: day.id },
        data: { date: newDate },
      });
    }

    // Atualizar endDate do plano
    const newEndDate = addDays(plan.endDate, dayShift);
    await prisma.readingPlan.update({
      where: { id: plan.id },
      data: { endDate: newEndDate },
    });

    console.log(
      `${TAG} Plano ${plan.id}: endDate atualizado para ${newEndDate.toISOString()}`
    );

    // 9. Verificar se o ajuste afeta planos UPCOMING subsequentes
    if (dayShift > 0) {
      await adjustUpcomingPlans(newEndDate, dayShift);
    }
  } catch (error) {
    console.log(`${TAG} Erro ao ajustar dias futuros: ${error}`);
  }
}

/**
 * Se empurramos o plano atual para frente, verifica se o próximo plano UPCOMING
 * precisa ter sua startDate ajustada para não sobrepor.
 */
async function adjustUpcomingPlans(
  currentPlanNewEndDate: Date,
  dayShift: number
): Promise<void> {
  try {
    // Buscar o próximo plano UPCOMING que começa logo após a endDate original
    const nextPlan = await prisma.readingPlan.findFirst({
      where: {
        status: "UPCOMING",
        startDate: { lte: addDays(currentPlanNewEndDate, 1) },
      },
      orderBy: { startDate: "asc" },
      include: {
        days: { orderBy: { date: "asc" } },
      },
    });

    if (!nextPlan) {
      console.log(`${TAG} Nenhum plano UPCOMING afetado`);
      return;
    }

    // Verificar se há sobreposição
    if (nextPlan.startDate <= currentPlanNewEndDate) {
      console.log(
        `${TAG} Plano UPCOMING ${nextPlan.id} (${nextPlan.bookName}) será ajustado em +${dayShift} dia(s)`
      );

      // Ajustar todas as datas do plano UPCOMING
      // Processar do último para o primeiro para evitar conflito de unique
      const sortedDays = [...nextPlan.days].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );

      for (const day of sortedDays) {
        const newDate = addDays(day.date, dayShift);
        await prisma.readingPlanDay.update({
          where: { id: day.id },
          data: { date: newDate },
        });
      }

      // Atualizar startDate e endDate do plano UPCOMING
      await prisma.readingPlan.update({
        where: { id: nextPlan.id },
        data: {
          startDate: addDays(nextPlan.startDate, dayShift),
          endDate: addDays(nextPlan.endDate, dayShift),
        },
      });

      console.log(
        `${TAG} Plano UPCOMING ${nextPlan.id} ajustado: ` +
          `start=${addDays(nextPlan.startDate, dayShift).toISOString()}, ` +
          `end=${addDays(nextPlan.endDate, dayShift).toISOString()}`
      );
    }
  } catch (error) {
    console.log(`${TAG} Erro ao ajustar planos UPCOMING: ${error}`);
  }
}
