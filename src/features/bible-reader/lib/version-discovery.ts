/**
 * Descoberta de versões da Bíblia em português com detecção de áudio
 *
 * Estratégia:
 * 1. Buscar todas as versões em português via API.Bible
 * 2. Para cada versão, verificar se há audioBibles associadas
 * 3. Manter allowlist configurável como fallback
 */

import { getBibles, getAudioBibles, type BibleVersion } from "./bible-api-client";

export interface DiscoveredVersion {
  id: string;
  abbreviation: string;
  name: string;
  nameLocal: string;
  language: string;
  audioAvailable: boolean;
  audioBibleId: string | null;
}

// Allowlist de versões conhecidas em PT-BR (fallback se API falhar)
const PORTUGUESE_VERSIONS_ALLOWLIST: DiscoveredVersion[] = [
  {
    id: "35b94e98b2e3a01a-01",
    abbreviation: "NVI",
    name: "Nova Versão Internacional",
    nameLocal: "Nova Versão Internacional",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "d63894c8d9a7a503-01",
    abbreviation: "BLT",
    name: "Biblia Livre Para Todos",
    nameLocal: "Biblia Livre Para Todos",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "aee9474b4a88eefb-01",
    abbreviation: "OL",
    name: "O Livro",
    nameLocal: "O Livro",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
];

// Cache em memória (versões mudam raramente)
let cachedVersions: DiscoveredVersion[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Descobrir versões em português disponíveis na API.Bible
 * Com detecção de áudio disponível
 */
export async function discoverPortugueseVersions(): Promise<DiscoveredVersion[]> {
  // Verificar cache
  if (cachedVersions && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedVersions;
  }

  try {
    // Buscar versões em português
    const [textBibles, audioBibles] = await Promise.all([
      getBibles("por"),
      getAudioBibles("por").catch(() => [] as BibleVersion[]),
    ]);

    // Criar mapa de áudio bíblias por idioma/nome para matching
    const audioMap = new Map<string, string>();
    for (const ab of audioBibles) {
      // Tentar associar por nome similar
      const key = ab.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      audioMap.set(key, ab.id);
    }

    const versions: DiscoveredVersion[] = textBibles
      .filter((bible) => {
        // Filtrar apenas português
        const lang = bible.language?.id?.toLowerCase() || "";
        return lang === "por" || lang.startsWith("pt");
      })
      .map((bible) => {
        // Verificar se há áudio disponível
        const hasAudioBibles = bible.audioBibles && bible.audioBibles.length > 0;
        const audioBibleId = hasAudioBibles ? bible.audioBibles[0].id : null;

        // Preferir abbreviationLocal (ex: "NVI") sobre abbreviation (ex: "PtNVI")
        const abbr = bible.abbreviationLocal || bible.abbreviation || bible.name.substring(0, 5);

        return {
          id: bible.id,
          abbreviation: abbr,
          name: bible.name,
          nameLocal: bible.nameLocal || bible.name,
          language: bible.language?.id || "por",
          audioAvailable: hasAudioBibles,
          audioBibleId,
        };
      });

    // Se encontrou versões, usar; senão, fallback
    cachedVersions = versions.length > 0 ? versions : PORTUGUESE_VERSIONS_ALLOWLIST;
    cacheTimestamp = Date.now();

    return cachedVersions;
  } catch (error) {
    console.warn("[VersionDiscovery] Falha ao descobrir versões, usando allowlist:", error);
    cachedVersions = PORTUGUESE_VERSIONS_ALLOWLIST;
    cacheTimestamp = Date.now();
    return cachedVersions;
  }
}

/**
 * Buscar uma versão específica por ID
 */
export function getVersionById(id: string, versions: DiscoveredVersion[]): DiscoveredVersion | undefined {
  return versions.find((v) => v.id === id);
}

/**
 * Versão padrão (NVI)
 */
export function getDefaultVersion(versions: DiscoveredVersion[]): DiscoveredVersion {
  return (
    versions.find((v) => v.abbreviation === "NVI") ||
    versions.find((v) => v.abbreviation === "NAA") ||
    versions[0]
  );
}

/**
 * Invalidar cache (para forçar redescoberta)
 */
export function invalidateVersionCache(): void {
  cachedVersions = null;
  cacheTimestamp = 0;
}
