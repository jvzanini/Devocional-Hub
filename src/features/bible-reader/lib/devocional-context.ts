/**
 * Resolver de contexto devocional — determina livro/capítulo a exibir
 *
 * Busca o plano de leitura ativo (IN_PROGRESS) e encontra o dia atual.
 * Fallback: Gênesis 1, versão NVI (ID 644 na Holy Bible API).
 */

import { prisma } from "@/shared/lib/db";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

export interface DevocionalContext {
  bookId: string;       // Código USFM (ex: "ROM")
  chapterNumber: number;
  bookName: string;     // Nome em PT-BR (ex: "Romanos")
  referenceLabel: string; // Ex: "Romanos 11"
  preferredBibleVersionId?: string;
}

// Versão NVI padrão (Holy Bible API ID)
const DEFAULT_BIBLE_VERSION_ID = "644";

// Fallback: Gênesis 1
const FALLBACK_CONTEXT: DevocionalContext = {
  bookId: "GEN",
  chapterNumber: 1,
  bookName: "Gênesis",
  referenceLabel: "Gênesis 1",
  preferredBibleVersionId: DEFAULT_BIBLE_VERSION_ID,
};

/**
 * Resolver contexto devocional a partir do plano de leitura ativo
 */
export async function resolveDevocionalContext(): Promise<DevocionalContext> {
  try {
    // Buscar plano de leitura ativo
    const activePlan = await prisma.readingPlan.findFirst({
      where: { status: "IN_PROGRESS" },
      include: {
        days: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!activePlan) {
      return FALLBACK_CONTEXT;
    }

    // Encontrar o dia de hoje no plano
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDay = activePlan.days.find((day) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });

    // Se não há dia hoje, pegar o próximo dia não completado
    const targetDay = todayDay || activePlan.days.find((day) => !day.completed);

    if (!targetDay) {
      return FALLBACK_CONTEXT;
    }

    // Extrair o primeiro capítulo do dia
    const chaptersStr = targetDay.chapters;
    let firstChapter = 1;

    const rangeMatch = chaptersStr.match(/^(\d+)/);
    if (rangeMatch) {
      firstChapter = parseInt(rangeMatch[1], 10);
    }

    // Buscar livro do plano
    const book = BIBLE_BOOKS.find(
      (b) => b.code === activePlan.bookCode || b.name === activePlan.bookName
    );

    if (!book) {
      return FALLBACK_CONTEXT;
    }

    return {
      bookId: book.code,
      chapterNumber: firstChapter,
      bookName: book.name,
      referenceLabel: `${book.name} ${firstChapter}`,
      preferredBibleVersionId: DEFAULT_BIBLE_VERSION_ID,
    };
  } catch (error) {
    console.error("[DevocionalContext] Erro ao resolver contexto:", error);
    return FALLBACK_CONTEXT;
  }
}
