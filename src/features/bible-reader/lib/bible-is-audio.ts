/**
 * Bible.is Audio — áudio bíblico versão-específico em PT-BR
 *
 * Fonte: Faith Comes By Hearing (live.bible.is)
 * 4 versões com áudio próprio: NVI, NAA, NTLH, NVT
 * Formato: MP3 (64kbps) via CloudFront (URLs assinadas)
 * Sem API key necessária
 *
 * API: GET https://live.bible.is/api/bibles/filesets/{FILESET_ID}/{BOOK_CODE}/{CHAPTER}?v=4
 */

import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

const BIBLE_IS_API = "https://live.bible.is/api/bibles/filesets";

// ─── Mapeamento de versões para filesets Bible.is ───────────────────────────

interface BibleIsFilesets {
  nt: string; // Fileset ID para Novo Testamento
  ot: string; // Fileset ID para Antigo Testamento
}

/**
 * Mapeamento: Holy Bible API version ID → Bible.is fileset IDs
 * Apenas versões com áudio versão-específico em PT-BR
 */
const VERSION_FILESET_MAP: Record<string, BibleIsFilesets> = {
  "644": { nt: "PORNVIN1DA", ot: "PORNVIO1DA" },   // NVI
  "641": { nt: "PORBBSN1DA", ot: "PORBBSO1DA" },   // NAA
  "643": { nt: "PO1NLHN1DA", ot: "PO1NLHO1DA" },   // NTLH
  "645": { nt: "PORTHFN1DA", ot: "PORTHFO1DA" },   // NVT
};

/** IDs das versões que possuem áudio versão-específico */
export const VERSIONS_WITH_AUDIO = new Set(Object.keys(VERSION_FILESET_MAP));

/**
 * Verificar se uma versão tem áudio versão-específico via Bible.is
 */
export function hasVersionSpecificAudio(versionId: string): boolean {
  return VERSIONS_WITH_AUDIO.has(versionId);
}

/**
 * Determinar se um livro é do AT ou NT
 */
function getTestament(bookCode: string): "AT" | "NT" {
  const book = BIBLE_BOOKS.find((b) => b.code === bookCode.toUpperCase());
  return book?.testament || "NT";
}

// ─── Timestamps por versículo ────────────────────────────────────────────────

export interface VerseTimestamp {
  verse: number;
  timestamp: number; // segundos no áudio (independe de playbackRate)
}

const BIBLE_IS_TIMESTAMPS_API = "https://live.bible.is/api/timestamps";

/**
 * Buscar timestamps de cada versículo no áudio via Bible.is
 *
 * Disponível para NVI, NTLH, NVT (NT apenas).
 * NAA e AT não possuem timestamps — retorna array vazio.
 *
 * @returns Array de {verse, timestamp} ordenado por versículo
 */
export async function getBibleIsTimestamps(
  versionId: string,
  bookCode: string,
  chapter: number
): Promise<VerseTimestamp[]> {
  const filesets = VERSION_FILESET_MAP[versionId];
  if (!filesets) return [];

  const testament = getTestament(bookCode);
  const filesetId = testament === "AT" ? filesets.ot : filesets.nt;

  try {
    const response = await fetch(
      `${BIBLE_IS_TIMESTAMPS_API}/${filesetId}/${bookCode.toUpperCase()}/${chapter}?v=4`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const items = data?.data;

    if (!items || items.length === 0) return [];

    return items
      .filter((item: { verse_start: string }) => item.verse_start !== "0")
      .map((item: { verse_start: string; timestamp: number }) => ({
        verse: parseInt(item.verse_start, 10),
        timestamp: item.timestamp,
      }));
  } catch {
    return [];
  }
}

// ─── URL de áudio ────────────────────────────────────────────────────────────

/**
 * Buscar URL de áudio versão-específico via Bible.is
 *
 * @param versionId ID da versão (Holy Bible API, ex: "644")
 * @param bookCode Código USFM do livro (ex: "ROM")
 * @param chapter Número do capítulo
 * @returns URL do MP3 assinada ou null se indisponível
 */
export async function getBibleIsAudioUrl(
  versionId: string,
  bookCode: string,
  chapter: number
): Promise<{ url: string; duration: number } | null> {
  const filesets = VERSION_FILESET_MAP[versionId];
  if (!filesets) return null;

  const testament = getTestament(bookCode);
  const filesetId = testament === "AT" ? filesets.ot : filesets.nt;

  try {
    const response = await fetch(
      `${BIBLE_IS_API}/${filesetId}/${bookCode.toUpperCase()}/${chapter}?v=4`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const items = data?.data;

    if (!items || items.length === 0) return null;

    const item = items[0];
    const url = item.path;
    const duration = item.duration || 0;

    if (!url) return null;

    return { url, duration };
  } catch {
    return null;
  }
}
