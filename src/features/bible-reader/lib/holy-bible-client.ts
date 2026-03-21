/**
 * Cliente HTTP para Holy Bible API — texto bíblico gratuito, sem autenticação
 *
 * Base: https://holy-bible-api.com
 * Docs: https://holy-bible-api.com/docs/
 *
 * Versões PT disponíveis: NVI (644), NAA (641), NVT (645), ARC (637), NTLH (643), etc.
 * Livros identificados por número (1-66), capítulos por número.
 */

import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

const HOLY_BIBLE_API_BASE = "https://holy-bible-api.com";

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface HolyBibleVerse {
  bible_id: number;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

// ─── Mapeamento bookCode → bookNumber ───────────────────────────────────────

/** Converte código USFM (GEN, ROM, etc.) para número do livro (1-66) */
export function bookCodeToNumber(bookCode: string): number | null {
  const book = BIBLE_BOOKS.find((b) => b.code === bookCode.toUpperCase());
  return book ? book.order : null;
}

// ─── Funções da API ─────────────────────────────────────────────────────────

/**
 * Buscar versículos de um capítulo na Holy Bible API
 */
export async function getChapterVerses(
  bibleId: number,
  bookNumber: number,
  chapter: number
): Promise<HolyBibleVerse[]> {
  const url = `${HOLY_BIBLE_API_BASE}/bibles/${bibleId}/books/${bookNumber}/chapters/${chapter}/verses`;

  const response = await fetch(url, {
    next: { revalidate: 86400 }, // cache 24h
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Holy Bible API erro ${response.status}: ${body}`);
  }

  return response.json();
}

/**
 * Buscar conteúdo de um capítulo e converter para HTML formatado
 *
 * Retorna HTML compatível com o CSS existente (.bible-content-text .v)
 */
export async function getChapterContentHtml(
  bibleId: number,
  bookCode: string,
  chapter: number
): Promise<{ content: string; reference: string; copyright: string }> {
  const bookNumber = bookCodeToNumber(bookCode);
  if (!bookNumber) {
    throw new Error(`Livro não encontrado: ${bookCode}`);
  }

  const verses = await getChapterVerses(bibleId, bookNumber, chapter);

  if (!verses || verses.length === 0) {
    throw new Error("Nenhum versículo encontrado para este capítulo");
  }

  const html = versesToHtml(verses);
  const book = BIBLE_BOOKS.find((b) => b.code === bookCode.toUpperCase());
  const bookName = book?.name || bookCode;

  return {
    content: html,
    reference: `${bookName} ${chapter}`,
    copyright: "Texto via Holy Bible API",
  };
}

/**
 * Converter array de versículos em HTML formatado
 * Formato: <p><span class="v">1</span> Texto...</p>
 */
function versesToHtml(verses: HolyBibleVerse[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const verse of verses) {
    const html = `<span class="v">${verse.verse}</span>\u00A0${escapeHtml(verse.text)}`;
    current.push(html);

    if (current.length >= 5) {
      paragraphs.push(`<p>${current.join(" ")}</p>`);
      current = [];
    }
  }

  if (current.length > 0) {
    paragraphs.push(`<p>${current.join(" ")}</p>`);
  }

  return paragraphs.join("\n");
}

/** Escapar HTML para evitar XSS */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
