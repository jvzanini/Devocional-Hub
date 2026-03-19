/**
 * Processamento de transcrições com IA
 *
 * Providers disponíveis:
 * 1. OpenRouter (primário) — Nemotron 120B gratuito via openrouter.ai
 *    - OPENROUTER_API_KEY no .env
 *    - Modelo: nvidia/nemotron-3-super-120b-a12b:free (262K contexto)
 *
 * 2. Google Gemini (fallback) — gemini-2.5-flash gratuito
 *    - GEMINI_API_KEY no .env
 */

export interface ProcessedTranscript {
  cleanText: string;
  chapterRefs: Array<{ book: string; chapter: number }>;
  chapterRefString: string;
  summary: string;
  specificChapters: number[];
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

// ─── Modelos disponíveis ──────────────────────────────────────────────────────
//
// Cascata de prioridade:
//   1. OpenAI (primário, configurável via admin) — padrão: gpt-4.1-mini
//   2. OpenRouter (fallback gratuito) — Nemotron 120B, Step 3.5, Nemotron 30B
//   3. Gemini 2.5 Flash (fallback gratuito)
//

/** Modelos OpenAI disponíveis para seleção no painel admin */
export const OPENAI_MODELS = [
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Rápido e econômico" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "Mais capaz, custo moderado" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", description: "Mais rápido e barato" },
  { id: "gpt-4o", name: "GPT-4o", description: "Multimodal, alta qualidade" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Versão compacta do 4o" },
  { id: "o4-mini", name: "o4-mini", description: "Raciocínio avançado, compacto" },
  { id: "o3", name: "o3", description: "Raciocínio avançado" },
  { id: "o3-mini", name: "o3-mini", description: "Raciocínio avançado, econômico" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Legado, mais barato" },
];

const OPENROUTER_MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 120B" },
  { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 30B" },
];

// ─── Providers ─────────────────────────────────────────────────────────────────

async function callOpenAI(model: string, prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI (${model}) erro ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenAI (${model}) retornou resposta vazia`);
  return content;
}

async function callOpenRouter(model: string, prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://devocional.nexusai360.com",
      "X-OpenRouter-Title": "DevocionalHub",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter (${model}) erro ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenRouter (${model}) retornou resposta vazia`);
  return content;
}

async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API erro ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini retornou resposta vazia");
  return content;
}

// ─── Chamada unificada com cascata de fallbacks ──────────────────────────────
// Prioridade: OpenAI (modelo configurável) → OpenRouter gratuito → Gemini

async function getAISettings(): Promise<{ model: string }> {
  try {
    const { prisma } = await import("@/lib/db");
    const setting = await prisma.appSetting.findUnique({ where: { key: "aiModel" } });
    return { model: setting?.value || "gpt-4.1-mini" };
  } catch {
    return { model: "gpt-4.1-mini" };
  }
}

async function callAI(prompt: string, maxTokens = 16384): Promise<string> {
  const errors: string[] = [];
  const aiSettings = await getAISettings();

  // 1. OpenAI (primário)
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log(`[AI] Tentando OpenAI ${aiSettings.model}...`);
      return await callOpenAI(aiSettings.model, prompt, maxTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI] OpenAI ${aiSettings.model} falhou: ${msg}`);
      errors.push(`OpenAI ${aiSettings.model}: ${msg}`);
    }
  }

  // 2. OpenRouter gratuito (fallback)
  if (process.env.OPENROUTER_API_KEY) {
    for (const m of OPENROUTER_MODELS) {
      try {
        console.log(`[AI] Tentando ${m.name} (fallback)...`);
        return await callOpenRouter(m.id, prompt, maxTokens);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI] ${m.name} falhou: ${msg}`);
        errors.push(`${m.name}: ${msg}`);
      }
    }
  }

  // 3. Gemini (último fallback)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log("[AI] Tentando Gemini 2.5 Flash (fallback)...");
      return await callGemini(prompt, maxTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI] Gemini falhou: ${msg}`);
      errors.push(`Gemini: ${msg}`);
    }
  }

  // Todos falharam
  throw new Error(
    `Todos os modelos de IA falharam:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`
  );
}

/**
 * Usa o Gemini para filtrar a transcrição:
 * - Remove cumprimentos, bate-papo, tarefas, artefatos de música
 * - Mantém APENAS o conteúdo da explicação do capítulo bíblico
 * - Gera o resumo
 */
async function processWithAI(rawTranscript: string, mainSpeakerName?: string): Promise<{
  cleanText: string;
  chapterRef: string;
  summary: string;
  specificChapters: number[];
}> {
  const speakerNote = mainSpeakerName
    ? `\nIMPORTANTE: O orador principal (pregador) é "${mainSpeakerName}" ou o nome mais semelhante que aparecer na transcrição. Foque na fala deste orador. As falas de outros participantes são secundárias (perguntas, comentários).`
    : "";

  const prompt = `Você é um assistente que processa transcrições de devocionais bíblicos em português brasileiro.

A transcrição abaixo é de uma reunião Zoom de devocional diário onde o pastor explica um capítulo da Bíblia.${speakerNote}

O texto pode conter partes irrelevantes como:
- Cumprimentos e bate-papo inicial ("Bom dia galera", "Glória a Deus", etc.)
- Conteúdo fragmentado e incoerente gerado por música tocada durante a reunião
- Tarefas ou recados para membros
- Despedidas e comentários sociais

Sua tarefa:
1. Extrair APENAS o conteúdo relevante da explicação do capítulo bíblico (focando no orador principal)
2. Identificar qual(is) capítulo(s) da Bíblia foram ensinados
3. Gerar um resumo em 3-4 parágrafos do ensinamento

Responda APENAS com JSON válido neste formato:
{
  "cleanText": "texto limpo apenas com o conteúdo do ensinamento bíblico...",
  "chapterRef": "Nome do Livro Capítulo (ex: Romanos 10)",
  "summary": "resumo em 3-4 parágrafos...",
  "specificChapters": [10, 11]
}

O campo "specificChapters" deve conter os números dos capítulos específicos que foram discutidos em detalhe durante o devocional (apenas números inteiros).

TRANSCRIÇÃO:
${rawTranscript.substring(0, 15000)}`;

  const responseText = await callAI(prompt);

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini não retornou JSON válido");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    cleanText: parsed.cleanText ?? rawTranscript,
    chapterRef: parsed.chapterRef ?? "",
    summary: parsed.summary ?? "",
    specificChapters: Array.isArray(parsed.specificChapters) ? parsed.specificChapters.map(Number).filter((n: number) => !isNaN(n)) : [],
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
  specificChapters: number[];
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

  return { cleanText, chapterRef, summary, specificChapters: refs.map(r => r.chapter) };
}

// ─── Exportação principal ─────────────────────────────────────────────────────

/**
 * Processa a transcrição bruta do Zoom:
 * - Com GEMINI_API_KEY: usa IA para filtragem inteligente (recomendado)
 * - Sem GEMINI_API_KEY: usa processamento local básico
 */
export async function processTranscript(rawTranscript: string, mainSpeakerName?: string): Promise<ProcessedTranscript> {
  let cleanText: string;
  let chapterRefString: string;
  let summary: string;

  let specificChapters: number[] = [];

  if (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY) {
    const result = await processWithAI(rawTranscript, mainSpeakerName);
    cleanText = result.cleanText;
    chapterRefString = result.chapterRef;
    summary = result.summary;
    specificChapters = result.specificChapters;
  } else {
    const result = processLocally(rawTranscript);
    cleanText = result.cleanText;
    chapterRefString = result.chapterRef;
    summary = result.summary;
    specificChapters = result.specificChapters;
  }

  // Extrai referências estruturadas para buscar na API.Bible
  const chapterRefs = extractChapterRefsFromText(
    chapterRefString + " " + cleanText
  ).map((r) => ({ book: r.book, chapter: r.chapter }));

  return { cleanText, chapterRefs, chapterRefString, summary, specificChapters };
}

// ─── Pesquisa Teológica (Gemini) ──────────────────────────────────────────

/**
 * Gera pesquisa teológica rica com insights, hebraico/grego, curiosidades
 * históricas e cruzamento com a transcrição. Output: 2000-4000 palavras.
 */
export async function generateTheologicalResearch(
  chapterRef: string,
  cleanTranscript: string,
  bibleText: string
): Promise<string> {
  const prompt = `Você é um teólogo pastoral com profundo conhecimento bíblico. Gere uma pesquisa teológica rica e acessível sobre ${chapterRef}.

FONTES DISPONÍVEIS:
1. Transcrição do devocional (o que foi ensinado):
${cleanTranscript.substring(0, 8000)}

2. Texto bíblico (NVI):
${bibleText.substring(0, 8000)}

GERE UMA PESQUISA COMPLETA COM:

## Visão Geral do Texto
- Contexto histórico e literário do capítulo/livro
- Quem escreveu, para quem, em que circunstâncias

## Palavras-Chave no Original
- 5-8 palavras importantes no hebraico (AT) ou grego (NT)
- Transliteração, significado literal e profundo
- Como o significado original enriquece a compreensão

## Insights e Revelações
- Pontos-chave do texto que merecem atenção especial
- Conexões com outros textos bíblicos (referências cruzadas)
- O que foi destacado na transcrição e por quê é relevante

## Curiosidades Históricas e Culturais
- Costumes, práticas, geografia da época
- Elementos que o leitor moderno pode não perceber
- Como o contexto cultural ilumina o texto

## Aplicação Prática
- Como os princípios se aplicam à vida diária
- Pontos de reflexão e meditação
- Conexão com temas centrais do devocional

ESTILO:
- Tom pastoral, acessível, de estudo e aprofundamento
- Sem linguagem acadêmica rebuscada — deve ser compreensível para qualquer pessoa
- Focado em entendimento e edificação
- Aproximadamente 2500-3500 palavras
- Em português brasileiro

Responda APENAS com o texto da pesquisa (sem JSON, sem markdown de código).`;

  return await callAI(prompt);
}

// ─── Knowledge Base para NotebookLM ──────────────────────────────────────

/**
 * Constrói uma base de conhecimento unificada otimizada para o NotebookLM
 * gerar slides, infográficos e vídeo resumo de alta qualidade.
 */
export function buildNotebookKnowledgeBase(
  cleanTranscript: string,
  bibleText: string,
  theologicalResearch: string,
  chapterRef: string
): string {
  return `═══════════════════════════════════════════════════════════════
BASE DE CONHECIMENTO — DEVOCIONAL: ${chapterRef}
═══════════════════════════════════════════════════════════════

Este documento contém todo o material necessário para gerar conteúdos visuais e narrativos sobre o devocional de ${chapterRef}. Use TODAS as seções abaixo como fonte de informação.

───────────────────────────────────────────────────────────────
SEÇÃO 1: TEXTO BÍBLICO (NVI) — ${chapterRef}
───────────────────────────────────────────────────────────────

${bibleText.substring(0, 30000)}

───────────────────────────────────────────────────────────────
SEÇÃO 2: TRANSCRIÇÃO DO DEVOCIONAL
───────────────────────────────────────────────────────────────

O pastor explicou ${chapterRef} durante o devocional diário. Os pontos principais da explanação foram:

${cleanTranscript.substring(0, 30000)}

───────────────────────────────────────────────────────────────
SEÇÃO 3: PESQUISA TEOLÓGICA E CONTEXTUAL
───────────────────────────────────────────────────────────────

${theologicalResearch.substring(0, 30000)}

───────────────────────────────────────────────────────────────
INSTRUÇÕES PARA GERAÇÃO DE CONTEÚDO
───────────────────────────────────────────────────────────────

Ao gerar SLIDES (Apresentação):
- Organize em tópicos claros com títulos impactantes
- Inclua versículos-chave como citações destacadas
- Use pontos concisos e diretos por slide
- Inclua significados de palavras no original (hebraico/grego)
- Finalize com aplicação prática

Ao gerar INFOGRÁFICO:
- Crie fluxos visuais e comparações
- Use timeline quando aplicável (contexto histórico)
- Destaque dados: números de versículos, palavras no original
- Organize visualmente os tópicos principais
- Inclua curiosidades históricas como blocos visuais

Ao gerar VÍDEO RESUMO (Audio Overview):
- Use narrativa conversacional e envolvente
- Conte a história por trás do texto bíblico
- Intercale explicação com aplicação prática
- Tom pastoral, como uma conversa entre amigos sobre a Bíblia
- Inclua os insights mais interessantes da pesquisa teológica
- Tudo em português brasileiro

═══════════════════════════════════════════════════════════════`;
}

// ─── Extração de Senha da Transcrição ────────────────────────────────────

/**
 * Tenta extrair a senha mencionada durante o devocional.
 * Retorna null se nenhuma senha for encontrada.
 */
export async function extractSessionPassword(transcript: string): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) return null;

  const prompt = `Analise a transcrição abaixo de um devocional bíblico e extraia a SENHA mencionada pelo orador.

O orador frequentemente menciona uma senha durante o devocional, usando frases como:
- "a senha é..."
- "a senha de hoje é..."
- "a senha vai ser..."
- "password..."
- "a palavra-chave é..."
- "o código é..."
- "a senha para acessar..."

A senha geralmente é uma palavra ou frase curta relacionada ao tema do devocional.

TRANSCRIÇÃO:
${transcript.substring(0, 10000)}

Responda APENAS com JSON:
{
  "found": true/false,
  "password": "a senha encontrada" ou null
}

Se NÃO encontrar nenhuma menção a senha, responda com found: false e password: null.`;

  try {
    const response = await callAI(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.found && parsed.password) {
      return String(parsed.password).trim();
    }
    return null;
  } catch {
    return null;
  }
}
