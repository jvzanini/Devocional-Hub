/**
 * Processamento de transcrições com Google Gemini (gratuito)
 * Crie sua API Key GRATUITA em: https://aistudio.google.com/app/apikey
 * Adicione GEMINI_API_KEY no .env
 *
 * Limites gratuitos do gemini-1.5-flash:
 *   - 15 requisições/minuto
 *   - 1.000.000 tokens/dia
 *   - Completamente suficiente para uso diário
 */

export interface ProcessedTranscript {
  cleanText: string;
  chapterRefs: Array<{ book: string; chapter: number }>;
  chapterRefString: string;
  summary: string;
}

// ─── Mapeamento de livros da Bíblia ──────────────────────────────────────────

const BIBLE_BOOKS: Array<{ pattern: RegExp; bookId: string; name: string }> = [
  { pattern: /\bmateus\b/i, bookId: "MAT", name: "Mateus" },
  { pattern: /\bmarcos\b/i, bookId: "MRK", name: "Marcos" },
  { pattern: /\blucas\b/i, bookId: "LUK", name: "Lucas" },
  { pattern: /\bjo[aã]o\b/i, bookId: "JHN", name: "João" },
  { pattern: /\batos\b/i, bookId: "ACT", name: "Atos" },
  { pattern: /\bromanos\b/i, bookId: "ROM", name: "Romanos" },
  { pattern: /\b1\s*cor[íi]ntios\b/i, bookId: "1CO", name: "1 Coríntios" },
  { pattern: /\b2\s*cor[íi]ntios\b/i, bookId: "2CO", name: "2 Coríntios" },
  { pattern: /\bgálatas\b|\bgalatas\b/i, bookId: "GAL", name: "Gálatas" },
  { pattern: /\bef[eé]sios\b/i, bookId: "EPH", name: "Efésios" },
  { pattern: /\bfilipenses\b/i, bookId: "PHP", name: "Filipenses" },
  { pattern: /\bcolossenses\b/i, bookId: "COL", name: "Colossenses" },
  { pattern: /\b1\s*tess?alonicenses\b/i, bookId: "1TH", name: "1 Tessalonicenses" },
  { pattern: /\b2\s*tess?alonicenses\b/i, bookId: "2TH", name: "2 Tessalonicenses" },
  { pattern: /\b1\s*tim[oó]teo\b/i, bookId: "1TI", name: "1 Timóteo" },
  { pattern: /\b2\s*tim[oó]teo\b/i, bookId: "2TI", name: "2 Timóteo" },
  { pattern: /\btito\b/i, bookId: "TIT", name: "Tito" },
  { pattern: /\bhebreus\b/i, bookId: "HEB", name: "Hebreus" },
  { pattern: /\btiago\b/i, bookId: "JAS", name: "Tiago" },
  { pattern: /\b1\s*pedro\b/i, bookId: "1PE", name: "1 Pedro" },
  { pattern: /\b2\s*pedro\b/i, bookId: "2PE", name: "2 Pedro" },
  { pattern: /\b1\s*jo[aã]o\b/i, bookId: "1JN", name: "1 João" },
  { pattern: /\b2\s*jo[aã]o\b/i, bookId: "2JN", name: "2 João" },
  { pattern: /\b3\s*jo[aã]o\b/i, bookId: "3JN", name: "3 João" },
  { pattern: /\bjudas\b/i, bookId: "JUD", name: "Judas" },
  { pattern: /\bapocalipse\b/i, bookId: "REV", name: "Apocalipse" },
  { pattern: /\bgênesis\b|\bgenesis\b/i, bookId: "GEN", name: "Gênesis" },
  { pattern: /\bêxodo\b|\bexodo\b/i, bookId: "EXO", name: "Êxodo" },
  { pattern: /\blevítico\b|\blevitico\b/i, bookId: "LEV", name: "Levítico" },
  { pattern: /\bnúmeros\b|\bnumeros\b/i, bookId: "NUM", name: "Números" },
  { pattern: /\bdeuteronômio\b|\bdeuteronomio\b/i, bookId: "DEU", name: "Deuteronômio" },
  { pattern: /\bjosué\b|\bjosue\b/i, bookId: "JOS", name: "Josué" },
  { pattern: /\bju[íi]zes\b/i, bookId: "JDG", name: "Juízes" },
  { pattern: /\brute\b/i, bookId: "RUT", name: "Rute" },
  { pattern: /\b1\s*samuel\b/i, bookId: "1SA", name: "1 Samuel" },
  { pattern: /\b2\s*samuel\b/i, bookId: "2SA", name: "2 Samuel" },
  { pattern: /\b1\s*reis\b/i, bookId: "1KI", name: "1 Reis" },
  { pattern: /\b2\s*reis\b/i, bookId: "2KI", name: "2 Reis" },
  { pattern: /\bsalmos\b|\bsalmo\b/i, bookId: "PSA", name: "Salmos" },
  { pattern: /\bprov[eé]rbios\b/i, bookId: "PRO", name: "Provérbios" },
  { pattern: /\bisaías\b|\bisaias\b/i, bookId: "ISA", name: "Isaías" },
  { pattern: /\bjeremias\b/i, bookId: "JER", name: "Jeremias" },
  { pattern: /\bezequiel\b/i, bookId: "EZK", name: "Ezequiel" },
  { pattern: /\bdaniel\b/i, bookId: "DAN", name: "Daniel" },
];

/**
 * Extrai referências bíblicas do texto (ex: "Romanos 10", "capítulo 10 de Romanos")
 */
export function extractChapterRefsFromText(
  text: string
): Array<{ book: string; chapter: number; name: string }> {
  const found: Array<{ book: string; chapter: number; name: string }> = [];
  const seen = new Set<string>();

  for (const book of BIBLE_BOOKS) {
    // Padrão 1: "Romanos 10" ou "Romanos capítulo 10"
    const p1 = new RegExp(
      book.pattern.source + `\\s+(?:cap[íi]tulo\\s+)?(\\d+)`,
      "gi"
    );
    // Padrão 2: "capítulo 10 de Romanos"
    const p2 = new RegExp(
      `cap[íi]tulo\\s+(\\d+)\\s+(?:de\\s+)?` + book.pattern.source,
      "gi"
    );

    for (const pat of [p1, p2]) {
      let match;
      while ((match = pat.exec(text)) !== null) {
        const chapter = parseInt(match[1] ?? match[match.length - 1], 10);
        if (!chapter || chapter < 1 || chapter > 150) continue;
        const key = `${book.bookId}-${chapter}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({ book: book.bookId, chapter, name: book.name });
      }
    }
  }

  return found;
}

// ─── Gemini API ───────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no .env");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API erro ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Usa o Gemini para filtrar a transcrição:
 * - Remove cumprimentos, bate-papo, tarefas, artefatos de música
 * - Mantém APENAS o conteúdo da explicação do capítulo bíblico
 * - Gera o resumo
 */
async function processWithGemini(rawTranscript: string): Promise<{
  cleanText: string;
  chapterRef: string;
  summary: string;
}> {
  const prompt = `Você é um assistente que processa transcrições de devocionais bíblicos em português brasileiro.

A transcrição abaixo é de uma reunião Zoom de devocional diário onde o pastor explica um capítulo da Bíblia.
O texto pode conter partes irrelevantes como:
- Cumprimentos e bate-papo inicial ("Bom dia galera", "Glória a Deus", etc.)
- Conteúdo fragmentado e incoerente gerado por música tocada durante a reunião
- Tarefas ou recados para membros ("João precisa fazer X", "Ian verificar Y")
- Despedidas e comentários sociais

Sua tarefa:
1. Extrair APENAS o conteúdo relevante da explicação do capítulo bíblico
2. Identificar qual(is) capítulo(s) da Bíblia foram ensinados
3. Gerar um resumo em 3-4 parágrafos do ensinamento

Responda APENAS com JSON válido neste formato:
{
  "cleanText": "texto limpo apenas com o conteúdo do ensinamento bíblico...",
  "chapterRef": "Nome do Livro Capítulo (ex: Romanos 10)",
  "summary": "resumo em 3-4 parágrafos..."
}

TRANSCRIÇÃO:
${rawTranscript.substring(0, 15000)}`;

  const responseText = await callGemini(prompt);

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini não retornou JSON válido");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    cleanText: parsed.cleanText ?? rawTranscript,
    chapterRef: parsed.chapterRef ?? "",
    summary: parsed.summary ?? "",
  };
}

/**
 * Processamento local (fallback sem API):
 * Remove linhas óbvias de cumprimentos e fragmentos curtos
 */
function processLocally(rawTranscript: string): {
  cleanText: string;
  chapterRef: string;
  summary: string;
} {
  const refs = extractChapterRefsFromText(rawTranscript);
  const chapterRef = refs.map((r) => `${r.name} ${r.chapter}`).join(", ") || "Não identificado";

  // Remove linhas muito curtas (cumprimentos) e artefatos óbvios
  const lines = rawTranscript
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 40); // Linhas curtas são geralmente bate-papo

  const cleanText = lines.join("\n").trim() || rawTranscript;
  const summary = `Devocional sobre ${chapterRef}.`;

  return { cleanText, chapterRef, summary };
}

// ─── Exportação principal ─────────────────────────────────────────────────────

/**
 * Processa a transcrição bruta do Zoom:
 * - Com GEMINI_API_KEY: usa IA para filtragem inteligente (recomendado)
 * - Sem GEMINI_API_KEY: usa processamento local básico
 */
export async function processTranscript(rawTranscript: string): Promise<ProcessedTranscript> {
  let cleanText: string;
  let chapterRefString: string;
  let summary: string;

  if (process.env.GEMINI_API_KEY) {
    const result = await processWithGemini(rawTranscript);
    cleanText = result.cleanText;
    chapterRefString = result.chapterRef;
    summary = result.summary;
  } else {
    const result = processLocally(rawTranscript);
    cleanText = result.cleanText;
    chapterRefString = result.chapterRef;
    summary = result.summary;
  }

  // Extrai referências estruturadas para buscar na API.Bible
  const chapterRefs = extractChapterRefsFromText(
    chapterRefString + " " + cleanText
  ).map((r) => ({ book: r.book, chapter: r.chapter }));

  return { cleanText, chapterRefs, chapterRefString, summary };
}
