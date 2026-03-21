/**
 * Cliente HTTP para API.Bible — proxy server-side
 *
 * Base: https://api.scripture.api.bible/v1
 * Headers: api-key (env var) + fums-version: 3
 */

const BIBLE_API_BASE = "https://api.scripture.api.bible/v1";

function getHeaders(): HeadersInit {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) {
    throw new Error("BIBLE_API_KEY não configurada");
  }
  return {
    "api-key": apiKey,
    "fums-version": "3",
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${BIBLE_API_BASE}${path}`;
  console.log(`[API.Bible] Requisição: ${url}`);

  const response = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 86400 }, // cache 24h
  });

  if (response.status === 429) {
    throw new Error("API.Bible: rate limit excedido. Tente novamente em alguns minutos.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[API.Bible] Erro ${response.status} para ${path}: ${body}`);
    throw new Error(`API.Bible erro ${response.status}: ${body}`);
  }

  const json = await response.json();
  return json.data as T;
}

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface BibleVersion {
  id: string;
  abbreviation: string;
  name: string;
  nameLocal: string;
  description: string;
  language: { id: string; name: string; nameLocal: string };
  audioBibles: { id: string; name: string; nameLocal: string }[];
}

export interface BibleBook {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

export interface BibleChapterSummary {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

export interface BibleChapterContent {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
  content: string;
  verseCount: number;
  copyright: string;
}

export interface AudioBibleChapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  resourceUrl: string;
}

// ─── Funções da API ────────────────────────────────────────────────────────

/**
 * Listar versões da Bíblia, opcionalmente filtradas por idioma
 */
export async function getBibles(language?: string): Promise<BibleVersion[]> {
  const params = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<BibleVersion[]>(`/bibles${params}`);
}

/**
 * Listar livros de uma versão da Bíblia
 */
export async function getBooks(bibleId: string): Promise<BibleBook[]> {
  return apiFetch<BibleBook[]>(`/bibles/${encodeURIComponent(bibleId)}/books`);
}

/**
 * Listar capítulos de um livro
 */
export async function getChapters(bibleId: string, bookId: string): Promise<BibleChapterSummary[]> {
  return apiFetch<BibleChapterSummary[]>(
    `/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/chapters`
  );
}

/**
 * Buscar conteúdo de um capítulo (texto formatado)
 */
export async function getChapterContent(
  bibleId: string,
  chapterId: string
): Promise<BibleChapterContent> {
  return apiFetch<BibleChapterContent>(
    `/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`
  );
}

/**
 * Buscar URL de áudio de um capítulo (se disponível)
 * Retorna null se áudio não disponível
 */
export async function getAudioUrl(
  audioBibleId: string,
  chapterId: string
): Promise<string | null> {
  try {
    const data = await apiFetch<AudioBibleChapter>(
      `/audio-bibles/${encodeURIComponent(audioBibleId)}/chapters/${encodeURIComponent(chapterId)}`
    );
    return data.resourceUrl || null;
  } catch {
    return null;
  }
}

/**
 * Listar áudio bíblias disponíveis
 */
export async function getAudioBibles(language?: string): Promise<BibleVersion[]> {
  const params = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<BibleVersion[]>(`/audio-bibles${params}`);
}
