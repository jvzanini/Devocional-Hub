/**
 * Busca textos completos de referências bíblicas
 *
 * Recebe uma lista de referências (ex: ["Fp 2:3", "Jo 3:16"])
 * e retorna referência + texto completo formatado.
 */

interface FetchedReference {
  label: string;   // "Filipenses 2:3"
  text: string;    // "Nada façam por ambição egoísta..."
  bookCode: string;
  chapter: number;
  verse?: string;
}

// Mapeamento de abreviações para nomes/códigos
const ABBR_MAP: Record<string, { name: string; code: string }> = {
  gn: { name: "Gênesis", code: "GEN" }, ex: { name: "Êxodo", code: "EXO" },
  lv: { name: "Levítico", code: "LEV" }, nm: { name: "Números", code: "NUM" },
  dt: { name: "Deuteronômio", code: "DEU" }, js: { name: "Josué", code: "JOS" },
  jz: { name: "Juízes", code: "JDG" }, rt: { name: "Rute", code: "RUT" },
  "1sm": { name: "1 Samuel", code: "1SA" }, "2sm": { name: "2 Samuel", code: "2SA" },
  "1rs": { name: "1 Reis", code: "1KI" }, "2rs": { name: "2 Reis", code: "2KI" },
  "1cr": { name: "1 Crônicas", code: "1CH" }, "2cr": { name: "2 Crônicas", code: "2CH" },
  ed: { name: "Esdras", code: "EZR" }, ne: { name: "Neemias", code: "NEH" },
  et: { name: "Ester", code: "EST" }, jó: { name: "Jó", code: "JOB" },
  sl: { name: "Salmos", code: "PSA" }, pv: { name: "Provérbios", code: "PRO" },
  ec: { name: "Eclesiastes", code: "ECC" }, ct: { name: "Cânticos", code: "SNG" },
  is: { name: "Isaías", code: "ISA" }, jr: { name: "Jeremias", code: "JER" },
  lm: { name: "Lamentações", code: "LAM" }, ez: { name: "Ezequiel", code: "EZK" },
  dn: { name: "Daniel", code: "DAN" }, os: { name: "Oseias", code: "HOS" },
  jl: { name: "Joel", code: "JOL" }, am: { name: "Amós", code: "AMO" },
  ob: { name: "Obadias", code: "OBA" }, jn: { name: "Jonas", code: "JON" },
  mq: { name: "Miqueias", code: "MIC" }, na: { name: "Naum", code: "NAM" },
  hc: { name: "Habacuque", code: "HAB" }, sf: { name: "Sofonias", code: "ZEP" },
  ag: { name: "Ageu", code: "HAG" }, zc: { name: "Zacarias", code: "ZEC" },
  ml: { name: "Malaquias", code: "MAL" },
  mt: { name: "Mateus", code: "MAT" }, mc: { name: "Marcos", code: "MRK" },
  lc: { name: "Lucas", code: "LUK" }, jo: { name: "João", code: "JHN" },
  at: { name: "Atos", code: "ACT" }, rm: { name: "Romanos", code: "ROM" },
  "1co": { name: "1 Coríntios", code: "1CO" }, "2co": { name: "2 Coríntios", code: "2CO" },
  gl: { name: "Gálatas", code: "GAL" }, ef: { name: "Efésios", code: "EPH" },
  fp: { name: "Filipenses", code: "PHP" }, cl: { name: "Colossenses", code: "COL" },
  "1ts": { name: "1 Tessalonicenses", code: "1TH" }, "2ts": { name: "2 Tessalonicenses", code: "2TH" },
  "1tm": { name: "1 Timóteo", code: "1TI" }, "2tm": { name: "2 Timóteo", code: "2TI" },
  tt: { name: "Tito", code: "TIT" }, fm: { name: "Filemom", code: "PHM" },
  hb: { name: "Hebreus", code: "HEB" }, tg: { name: "Tiago", code: "JAS" },
  "1pe": { name: "1 Pedro", code: "1PE" }, "2pe": { name: "2 Pedro", code: "2PE" },
  "1jo": { name: "1 João", code: "1JN" }, "2jo": { name: "2 João", code: "2JN" },
  "3jo": { name: "3 João", code: "3JN" }, jd: { name: "Judas", code: "JUD" },
  ap: { name: "Apocalipse", code: "REV" },
};

/**
 * Parsear referência bíblica em componentes
 * Ex: "Fp 2:3" → { bookCode: "PHP", chapter: 2, verse: "3", label: "Filipenses 2:3" }
 */
function parseReference(ref: string): { bookCode: string; chapter: number; verse?: string; label: string } | null {
  const match = ref.trim().match(/^(\d?\s*[A-Za-zÀ-ÿ]+)\s+(\d+)(?::(.+))?$/);
  if (!match) return null;

  const abbrRaw = match[1].toLowerCase().replace(/\s+/g, "");
  const chapter = parseInt(match[2], 10);
  const verse = match[3];

  const info = ABBR_MAP[abbrRaw];
  if (!info) return null;

  const label = verse ? `${info.name} ${chapter}:${verse}` : `${info.name} ${chapter}`;
  return { bookCode: info.code, chapter, verse, label };
}

/**
 * Buscar texto de versículos específicos via bolls.life
 */
async function fetchVerseText(bookCode: string, chapter: number, verse?: string): Promise<string> {
  // Mapeamento de código USFM para ID numérico bolls.life
  const BOOK_CODE_TO_BOLLS: Record<string, number> = {
    GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
    "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
    EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
    ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
    OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
    MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44, ROM: 45, "1CO": 46, "2CO": 47,
    GAL: 48, EPH: 49, PHP: 50, COL: 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55,
    TIT: 56, PHM: 57, HEB: 58, JAS: 59, "1PE": 60, "2PE": 61, "1JN": 62, "2JN": 63,
    "3JN": 64, JUD: 65, REV: 66,
  };

  const bollsId = BOOK_CODE_TO_BOLLS[bookCode];
  if (!bollsId) return "(texto não disponível)";

  try {
    const res = await fetch(`https://bolls.life/get-chapter/NVIPT/${bollsId}/${chapter}/`);
    if (!res.ok) return "(texto não disponível)";

    const verses: { verse: number; text: string }[] = await res.json();

    if (!verse) {
      // Retornar capítulo inteiro (primeiros 3 versículos como preview)
      return verses.slice(0, 3).map((v) => `${v.verse} ${v.text.trim()}`).join(" ");
    }

    // Parsear range de versículos (ex: "3-5" ou "3")
    const parts = verse.split("-").map((n) => parseInt(n.trim(), 10));
    const start = parts[0];
    const end = parts.length > 1 ? parts[1] : start;

    const selected = verses.filter((v) => v.verse >= start && v.verse <= end);
    if (selected.length === 0) return "(versículo não encontrado)";

    return selected.map((v) => `${v.text.trim()}`).join(" ");
  } catch {
    return "(texto não disponível)";
  }
}

/**
 * Buscar textos completos para uma lista de referências bíblicas
 */
export async function fetchReferences(refs: string[]): Promise<FetchedReference[]> {
  const results: FetchedReference[] = [];

  for (const ref of refs) {
    const parsed = parseReference(ref);
    if (!parsed) {
      results.push({
        label: ref,
        text: "(referência não reconhecida)",
        bookCode: "",
        chapter: 0,
      });
      continue;
    }

    const text = await fetchVerseText(parsed.bookCode, parsed.chapter, parsed.verse);
    results.push({
      label: parsed.label,
      text,
      bookCode: parsed.bookCode,
      chapter: parsed.chapter,
      verse: parsed.verse,
    });
  }

  return results;
}
