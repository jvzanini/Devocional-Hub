/**
 * Word Project Audio — áudio bíblico gratuito em PT-BR
 *
 * Fonte: https://www.wordproaudio.org
 * Formato: MP3 direto, sem autenticação, CORS habilitado
 * Cobertura: Bíblia completa (66 livros), narração PT-BR
 *
 * URL pattern: https://www.wordproaudio.org/bibles/app/audio/2_BR/{book}/{chapter}.mp3
 * book = 1-66 (Gênesis=1, Romanos=45, Apocalipse=66)
 * chapter = número do capítulo
 */

import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

const WORD_PROJECT_BASE = "https://www.wordproaudio.org/bibles/app/audio/2_BR";

/**
 * Montar URL de áudio PT-BR para um capítulo
 *
 * @param bookCode Código USFM do livro (ex: "ROM")
 * @param chapter Número do capítulo
 * @returns URL do MP3 ou null se livro não encontrado
 */
export function getWordProjectAudioUrl(bookCode: string, chapter: number): string | null {
  const book = BIBLE_BOOKS.find((b) => b.code === bookCode.toUpperCase());
  if (!book) return null;

  return `${WORD_PROJECT_BASE}/${book.order}/${chapter}.mp3`;
}
