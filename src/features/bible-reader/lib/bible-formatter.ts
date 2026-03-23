/**
 * Formatador de texto bíblico via YouVersion
 *
 * Busca títulos de seção, parágrafos e formatação de poesia diretamente
 * do YouVersion (bible.com), eliminando a dependência de IA.
 *
 * Fallback: retorna o texto original sem formatação se o YouVersion falhar.
 */

import { fetchYouVersionContent, isYouVersionAvailable } from "./youversion-client";

/**
 * Buscar conteúdo formatado do YouVersion com fallback para texto original
 *
 * @param originalHtml HTML do capítulo da Holy Bible API (fallback)
 * @param reference Ex: "Romanos 12"
 * @param versionId ID da versão na Holy Bible API (ex: "644")
 * @param bookCode Código USFM do livro (ex: "ROM")
 * @param chapter Número do capítulo
 * @returns HTML formatado com títulos de seção, parágrafos e poesia
 */
export async function formatBibleContent(
  originalHtml: string,
  reference: string,
  versionId: string,
  bookCode: string,
  chapter: number
): Promise<string> {
  // Verificar se a versão está disponível no YouVersion
  if (!isYouVersionAvailable(versionId)) {
    console.log(`[BibleFormatter] Versão ${versionId} não disponível no YouVersion, usando texto original`);
    return originalHtml;
  }

  try {
    console.log(`[BibleFormatter] Buscando formatação YouVersion para ${reference}...`);
    const result = await fetchYouVersionContent(versionId, bookCode, chapter);

    if (result && result.content) {
      console.log(`[BibleFormatter] YouVersion OK para ${reference}`);
      return result.content;
    }

    console.warn(`[BibleFormatter] YouVersion retornou vazio para ${reference}, usando original`);
    return originalHtml;
  } catch (err) {
    console.warn(`[BibleFormatter] Falha no YouVersion para ${reference}, usando original:`, err);
    return originalHtml;
  }
}

/**
 * @deprecated Use formatBibleContent() — esta função existia para compatibilidade
 * mas a formatação via IA foi substituída pelo YouVersion
 */
export async function formatBibleTextWithAI(
  html: string,
  reference: string,
  _versionName: string
): Promise<string> {
  console.warn("[BibleFormatter] formatBibleTextWithAI está deprecated. Use formatBibleContent()");
  return html;
}
