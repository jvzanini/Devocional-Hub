/**
 * Versões da Bíblia em português disponíveis na Holy Bible API
 *
 * Fonte texto: https://holy-bible-api.com/bibles?language=portuguese
 * Fonte áudio: Bible.is (live.bible.is) — 4 versões com áudio versão-específico (NVI, NAA, NTLH, NVT)
 */

import { hasVersionSpecificAudio } from "./bible-is-audio";

export interface DiscoveredVersion {
  id: string;
  abbreviation: string;
  name: string;
  nameLocal: string;
  language: string;
  audioAvailable: boolean;
  audioBibleId: string | null;
}

/**
 * Versões portuguesas disponíveis (Holy Bible API IDs)
 * Apenas versões com Bíblia completa (66 livros) e texto funcional
 *
 * audioAvailable = true apenas para versões com áudio versão-específico (Bible.is)
 */
const PORTUGUESE_VERSIONS: DiscoveredVersion[] = [
  {
    id: "644",
    abbreviation: "NVI",
    name: "Nova Versão Internacional",
    nameLocal: "Nova Versão Internacional",
    language: "por",
    audioAvailable: true,
    audioBibleId: null,
  },
  {
    id: "641",
    abbreviation: "NAA",
    name: "Nova Almeida Atualizada",
    nameLocal: "Nova Almeida Atualizada",
    language: "por",
    audioAvailable: true,
    audioBibleId: null,
  },
  {
    id: "645",
    abbreviation: "NVT",
    name: "Nova Versão Transformadora",
    nameLocal: "Nova Versão Transformadora",
    language: "por",
    audioAvailable: true,
    audioBibleId: null,
  },
  {
    id: "643",
    abbreviation: "NTLH",
    name: "Nova Tradução na Linguagem de Hoje",
    nameLocal: "Nova Tradução na Linguagem de Hoje",
    language: "por",
    audioAvailable: true,
    audioBibleId: null,
  },
  {
    id: "637",
    abbreviation: "ARC",
    name: "Almeida Revista e Corrigida",
    nameLocal: "Almeida Revista e Corrigida",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "636",
    abbreviation: "AC",
    name: "Almeida Clássica",
    nameLocal: "Almeida Clássica",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "635",
    abbreviation: "ARA",
    name: "Almeida Revista e Atualizada",
    nameLocal: "Almeida Revista e Atualizada",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "642",
    abbreviation: "NBV",
    name: "Nova Bíblia Viva",
    nameLocal: "Nova Bíblia Viva",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "646",
    abbreviation: "OL",
    name: "O Livro",
    nameLocal: "O Livro",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "647",
    abbreviation: "TB",
    name: "Tradução Brasileira",
    nameLocal: "Tradução Brasileira",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "640",
    abbreviation: "CAP",
    name: "Bíblia Católica Pastoral",
    nameLocal: "Bíblia Católica Pastoral",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
  {
    id: "639",
    abbreviation: "BPT",
    name: "Bíblia para Todos",
    nameLocal: "Bíblia para Todos",
    language: "por",
    audioAvailable: false,
    audioBibleId: null,
  },
];

/**
 * Retorna versões em português disponíveis
 */
export async function discoverPortugueseVersions(): Promise<DiscoveredVersion[]> {
  return PORTUGUESE_VERSIONS;
}
