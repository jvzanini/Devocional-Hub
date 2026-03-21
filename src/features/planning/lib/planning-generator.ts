/**
 * Gerador de cards de planejamento teológico
 *
 * Para cada capítulo do plano de leitura:
 * 1. Buscar texto bíblico NVI
 * 2. Gerar análise teológica via IA
 * 3. Identificar referências complementares
 * 4. Buscar texto completo das referências
 * 5. Gerar links de estudo
 * 6. Salvar PlanningCard no banco
 */

import { prisma } from "@/shared/lib/db";
import { callAI } from "@/features/pipeline/lib/ai";
import { getChapterText } from "@/features/bible/lib/bible";
import { fetchReferences } from "./reference-fetcher";
import { generateCardImages } from "./image-generator";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

interface GeneratedCard {
  bookName: string;
  bookCode: string;
  chapter: number;
  analysis: string;
  references: string;
  studyLinks: string[];
  themeGroup: string | null;
}

/**
 * Gerar um card de planejamento para um capítulo específico
 */
async function generateSingleCard(
  bookCode: string,
  bookName: string,
  chapter: number
): Promise<GeneratedCard> {
  // 1. Buscar texto bíblico
  let bibleText = "";
  try {
    const chapterData = await getChapterText(bookCode, chapter);
    bibleText = chapterData.content;
  } catch (err) {
    console.warn(`[PlanningGenerator] Erro ao buscar ${bookName} ${chapter}:`, err);
    bibleText = `(Texto de ${bookName} ${chapter} não disponível)`;
  }

  // 2. Gerar análise via IA
  const prompt = `Você é um teólogo e estudioso bíblico experiente. Analise ${bookName} ${chapter} e produza um card de planejamento para preparação de devocional.

TEXTO BÍBLICO (NVI):
${bibleText.substring(0, 6000)}

Produza a análise em formato JSON com os campos abaixo. Use português brasileiro.

{
  "abordagem": "Como abordar este capítulo no devocional — tom, ênfases, contexto histórico e teológico",
  "temas": [
    {
      "titulo": "Nome do tema",
      "versiculos": "1-5",
      "descricao": "Análise do tema com aprofundamento teológico e histórico"
    }
  ],
  "aplicacoes": "Aplicações práticas e espirituais para a vida do crente hoje",
  "contexto_historico": "Contexto histórico, cultural e geográfico relevante",
  "referencias_complementares": ["Rm 8:28", "Jo 3:16", "Fp 2:3-5", "Sl 23:1-3", "Hb 11:1"],
  "tema_grupo": null,
  "links_estudo": [
    "https://www.bibliaonline.com.br/nvi/${bookCode.toLowerCase()}/${chapter}",
    "https://biblia.com.br/${bookName.toLowerCase().replace(/ /g, '-')}-${chapter}",
    "https://www.estudosdabiblia.net/${bookCode.toLowerCase()}${chapter}.htm",
    "https://www.gotquestions.org/Portugues/${bookName.toLowerCase().replace(/ /g, '-')}-${chapter}.html",
    "https://hermeneutica.com/${bookName.toLowerCase().replace(/ /g, '-')}-capitulo-${chapter}"
  ]
}

IMPORTANTE:
- Fornecer pelo menos 5 referências complementares relevantes
- Fornecer exatamente 5 links de estudo (podem ser aproximações de URLs reais)
- Não forçar agrupamentos temáticos — "tema_grupo" deve ser null para capítulos individuais
- A análise deve ser profunda e teologicamente fundamentada
- Usar sempre português brasileiro com acentos corretos`;

  let analysisJson: GeneratedCard;

  try {
    const response = await callAI(prompt, 4000);

    // Extrair JSON da resposta
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta da IA não contém JSON válido");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 3. Buscar texto completo das referências
    const refs = parsed.referencias_complementares || [];
    const fetchedRefs = await fetchReferences(refs);

    const referencesData = fetchedRefs.map((r) => ({
      label: r.label,
      text: r.text,
    }));

    analysisJson = {
      bookName,
      bookCode,
      chapter,
      analysis: JSON.stringify({
        abordagem: parsed.abordagem || "",
        temas: parsed.temas || [],
        aplicacoes: parsed.aplicacoes || "",
        contexto_historico: parsed.contexto_historico || "",
      }),
      references: JSON.stringify(referencesData),
      studyLinks: parsed.links_estudo || [],
      themeGroup: parsed.tema_grupo || null,
    };
  } catch (err) {
    console.error(`[PlanningGenerator] Erro na IA para ${bookName} ${chapter}:`, err);
    analysisJson = {
      bookName,
      bookCode,
      chapter,
      analysis: JSON.stringify({
        abordagem: `Análise de ${bookName} ${chapter} — geração automática falhou. Revise manualmente.`,
        temas: [],
        aplicacoes: "",
        contexto_historico: "",
      }),
      references: JSON.stringify([]),
      studyLinks: [],
      themeGroup: null,
    };
  }

  return analysisJson;
}

/**
 * Gerar cards para todos os capítulos de um plano de leitura
 * Gera UM card por vez para qualidade
 */
export async function generatePlanningCards(planId: string): Promise<number> {
  const plan = await prisma.readingPlan.findUnique({
    where: { id: planId },
    include: { days: { orderBy: { date: "asc" } } },
  });

  if (!plan) {
    throw new Error(`Plano ${planId} não encontrado`);
  }

  const book = BIBLE_BOOKS.find((b) => b.code === plan.bookCode);
  if (!book) {
    throw new Error(`Livro ${plan.bookCode} não encontrado`);
  }

  // Coletar todos os capítulos únicos do plano
  const chapters = new Set<number>();
  for (const day of plan.days) {
    const chaptersStr = day.chapters;
    // Formato: "1-5" ou "1, 3, 5" ou "3"
    if (chaptersStr.includes("-")) {
      const [start, end] = chaptersStr.split("-").map((n) => parseInt(n.trim(), 10));
      for (let i = start; i <= end; i++) chapters.add(i);
    } else {
      chaptersStr.split(",").forEach((n) => chapters.add(parseInt(n.trim(), 10)));
    }
  }

  const sortedChapters = Array.from(chapters).sort((a, b) => a - b);

  // Verificar cards já existentes
  const existingCards = await prisma.planningCard.findMany({
    where: { planId },
    select: { chapter: true },
  });
  const existingChapters = new Set(existingCards.map((c) => c.chapter));

  let generated = 0;

  for (const chapter of sortedChapters) {
    if (existingChapters.has(chapter)) continue;

    console.log(`[PlanningGenerator] Gerando card para ${book.name} ${chapter}...`);

    const card = await generateSingleCard(book.code, book.name, chapter);

    // Gerar imagens via DALL-E (fallback: array vazio → ícone placeholder na UI)
    let imageUrls: string[] = [];
    try {
      const themes = JSON.parse(card.analysis)?.temas?.map((t: { titulo: string }) => t.titulo) || [];
      imageUrls = await generateCardImages(book.name, chapter, themes);
      console.log(`[PlanningGenerator] ${imageUrls.length} imagem(ns) gerada(s) para ${book.name} ${chapter}`);
    } catch (err) {
      console.warn(`[PlanningGenerator] Geração de imagens falhou para ${book.name} ${chapter}:`, err);
    }

    await prisma.planningCard.create({
      data: {
        planId,
        bookName: card.bookName,
        bookCode: card.bookCode,
        chapter: card.chapter,
        analysis: card.analysis,
        references: card.references,
        studyLinks: card.studyLinks,
        imageUrls,
        themeGroup: card.themeGroup,
      },
    });

    generated++;
  }

  return generated;
}
