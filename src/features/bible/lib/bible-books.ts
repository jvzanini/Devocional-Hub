/** 66 livros da Bíblia em ordem canônica — PT-BR */
export interface BibleBook {
  order: number;
  name: string;
  code: string; // USFM code for API.Bible
  chapters: number;
  abbr: string;
  testament: "AT" | "NT";
  color: string; // accent color
}

export const BIBLE_BOOKS: BibleBook[] = [
  // ─── Antigo Testamento ───
  { order: 1, name: "Gênesis", code: "GEN", chapters: 50, abbr: "Gn", testament: "AT", color: "#059669" },
  { order: 2, name: "Êxodo", code: "EXO", chapters: 40, abbr: "Êx", testament: "AT", color: "#2563eb" },
  { order: 3, name: "Levítico", code: "LEV", chapters: 27, abbr: "Lv", testament: "AT", color: "#7c3aed" },
  { order: 4, name: "Números", code: "NUM", chapters: 36, abbr: "Nm", testament: "AT", color: "#dc2626" },
  { order: 5, name: "Deuteronômio", code: "DEU", chapters: 34, abbr: "Dt", testament: "AT", color: "#d97706" },
  { order: 6, name: "Josué", code: "JOS", chapters: 24, abbr: "Js", testament: "AT", color: "#0891b2" },
  { order: 7, name: "Juízes", code: "JDG", chapters: 21, abbr: "Jz", testament: "AT", color: "#be123c" },
  { order: 8, name: "Rute", code: "RUT", chapters: 4, abbr: "Rt", testament: "AT", color: "#db2777" },
  { order: 9, name: "1 Samuel", code: "1SA", chapters: 31, abbr: "1Sm", testament: "AT", color: "#4f46e5" },
  { order: 10, name: "2 Samuel", code: "2SA", chapters: 24, abbr: "2Sm", testament: "AT", color: "#4f46e5" },
  { order: 11, name: "1 Reis", code: "1KI", chapters: 22, abbr: "1Rs", testament: "AT", color: "#b45309" },
  { order: 12, name: "2 Reis", code: "2KI", chapters: 25, abbr: "2Rs", testament: "AT", color: "#b45309" },
  { order: 13, name: "1 Crônicas", code: "1CH", chapters: 29, abbr: "1Cr", testament: "AT", color: "#0d9488" },
  { order: 14, name: "2 Crônicas", code: "2CH", chapters: 36, abbr: "2Cr", testament: "AT", color: "#0d9488" },
  { order: 15, name: "Esdras", code: "EZR", chapters: 10, abbr: "Ed", testament: "AT", color: "#6d28d9" },
  { order: 16, name: "Neemias", code: "NEH", chapters: 13, abbr: "Ne", testament: "AT", color: "#6d28d9" },
  { order: 17, name: "Ester", code: "EST", chapters: 10, abbr: "Et", testament: "AT", color: "#be185d" },
  { order: 18, name: "Jó", code: "JOB", chapters: 42, abbr: "Jó", testament: "AT", color: "#78716c" },
  { order: 19, name: "Salmos", code: "PSA", chapters: 150, abbr: "Sl", testament: "AT", color: "#7c3aed" },
  { order: 20, name: "Provérbios", code: "PRO", chapters: 31, abbr: "Pv", testament: "AT", color: "#ea580c" },
  { order: 21, name: "Eclesiastes", code: "ECC", chapters: 12, abbr: "Ec", testament: "AT", color: "#57534e" },
  { order: 22, name: "Cânticos", code: "SNG", chapters: 8, abbr: "Ct", testament: "AT", color: "#e11d48" },
  { order: 23, name: "Isaías", code: "ISA", chapters: 66, abbr: "Is", testament: "AT", color: "#dc2626" },
  { order: 24, name: "Jeremias", code: "JER", chapters: 52, abbr: "Jr", testament: "AT", color: "#9333ea" },
  { order: 25, name: "Lamentações", code: "LAM", chapters: 5, abbr: "Lm", testament: "AT", color: "#64748b" },
  { order: 26, name: "Ezequiel", code: "EZK", chapters: 48, abbr: "Ez", testament: "AT", color: "#0284c7" },
  { order: 27, name: "Daniel", code: "DAN", chapters: 12, abbr: "Dn", testament: "AT", color: "#c026d3" },
  { order: 28, name: "Oseias", code: "HOS", chapters: 14, abbr: "Os", testament: "AT", color: "#16a34a" },
  { order: 29, name: "Joel", code: "JOL", chapters: 3, abbr: "Jl", testament: "AT", color: "#2563eb" },
  { order: 30, name: "Amós", code: "AMO", chapters: 9, abbr: "Am", testament: "AT", color: "#ca8a04" },
  { order: 31, name: "Obadias", code: "OBA", chapters: 1, abbr: "Ob", testament: "AT", color: "#a16207" },
  { order: 32, name: "Jonas", code: "JON", chapters: 4, abbr: "Jn", testament: "AT", color: "#0891b2" },
  { order: 33, name: "Miqueias", code: "MIC", chapters: 7, abbr: "Mq", testament: "AT", color: "#059669" },
  { order: 34, name: "Naum", code: "NAM", chapters: 3, abbr: "Na", testament: "AT", color: "#dc2626" },
  { order: 35, name: "Habacuque", code: "HAB", chapters: 3, abbr: "Hc", testament: "AT", color: "#7c3aed" },
  { order: 36, name: "Sofonias", code: "ZEP", chapters: 3, abbr: "Sf", testament: "AT", color: "#4f46e5" },
  { order: 37, name: "Ageu", code: "HAG", chapters: 2, abbr: "Ag", testament: "AT", color: "#b45309" },
  { order: 38, name: "Zacarias", code: "ZEC", chapters: 14, abbr: "Zc", testament: "AT", color: "#0d9488" },
  { order: 39, name: "Malaquias", code: "MAL", chapters: 4, abbr: "Ml", testament: "AT", color: "#be123c" },

  // ─── Novo Testamento ───
  { order: 40, name: "Mateus", code: "MAT", chapters: 28, abbr: "Mt", testament: "NT", color: "#d97706" },
  { order: 41, name: "Marcos", code: "MRK", chapters: 16, abbr: "Mc", testament: "NT", color: "#16a34a" },
  { order: 42, name: "Lucas", code: "LUK", chapters: 24, abbr: "Lc", testament: "NT", color: "#9333ea" },
  { order: 43, name: "João", code: "JHN", chapters: 21, abbr: "Jo", testament: "NT", color: "#2563eb" },
  { order: 44, name: "Atos", code: "ACT", chapters: 28, abbr: "At", testament: "NT", color: "#e11d48" },
  { order: 45, name: "Romanos", code: "ROM", chapters: 16, abbr: "Rm", testament: "NT", color: "#0284c7" },
  { order: 46, name: "1 Coríntios", code: "1CO", chapters: 16, abbr: "1Co", testament: "NT", color: "#7c3aed" },
  { order: 47, name: "2 Coríntios", code: "2CO", chapters: 13, abbr: "2Co", testament: "NT", color: "#7c3aed" },
  { order: 48, name: "Gálatas", code: "GAL", chapters: 6, abbr: "Gl", testament: "NT", color: "#059669" },
  { order: 49, name: "Efésios", code: "EPH", chapters: 6, abbr: "Ef", testament: "NT", color: "#4f46e5" },
  { order: 50, name: "Filipenses", code: "PHP", chapters: 4, abbr: "Fp", testament: "NT", color: "#c026d3" },
  { order: 51, name: "Colossenses", code: "COL", chapters: 4, abbr: "Cl", testament: "NT", color: "#0891b2" },
  { order: 52, name: "1 Tessalonicenses", code: "1TH", chapters: 5, abbr: "1Ts", testament: "NT", color: "#b45309" },
  { order: 53, name: "2 Tessalonicenses", code: "2TH", chapters: 3, abbr: "2Ts", testament: "NT", color: "#b45309" },
  { order: 54, name: "1 Timóteo", code: "1TI", chapters: 6, abbr: "1Tm", testament: "NT", color: "#16a34a" },
  { order: 55, name: "2 Timóteo", code: "2TI", chapters: 4, abbr: "2Tm", testament: "NT", color: "#16a34a" },
  { order: 56, name: "Tito", code: "TIT", chapters: 3, abbr: "Tt", testament: "NT", color: "#0d9488" },
  { order: 57, name: "Filemom", code: "PHM", chapters: 1, abbr: "Fm", testament: "NT", color: "#78716c" },
  { order: 58, name: "Hebreus", code: "HEB", chapters: 13, abbr: "Hb", testament: "NT", color: "#dc2626" },
  { order: 59, name: "Tiago", code: "JAS", chapters: 5, abbr: "Tg", testament: "NT", color: "#ca8a04" },
  { order: 60, name: "1 Pedro", code: "1PE", chapters: 5, abbr: "1Pe", testament: "NT", color: "#2563eb" },
  { order: 61, name: "2 Pedro", code: "2PE", chapters: 3, abbr: "2Pe", testament: "NT", color: "#2563eb" },
  { order: 62, name: "1 João", code: "1JN", chapters: 5, abbr: "1Jo", testament: "NT", color: "#4f46e5" },
  { order: 63, name: "2 João", code: "2JN", chapters: 1, abbr: "2Jo", testament: "NT", color: "#4f46e5" },
  { order: 64, name: "3 João", code: "3JN", chapters: 1, abbr: "3Jo", testament: "NT", color: "#4f46e5" },
  { order: 65, name: "Judas", code: "JUD", chapters: 1, abbr: "Jd", testament: "NT", color: "#be123c" },
  { order: 66, name: "Apocalipse", code: "REV", chapters: 22, abbr: "Ap", testament: "NT", color: "#db2777" },
];

/** Busca livro por nome (fuzzy match no início) */
export function findBookByName(name: string): BibleBook | undefined {
  const n = name.trim().toLowerCase();
  return BIBLE_BOOKS.find(b => b.name.toLowerCase() === n)
    || BIBLE_BOOKS.find(b => b.name.toLowerCase().startsWith(n));
}

/** Busca livro por código USFM */
export function findBookByCode(code: string): BibleBook | undefined {
  return BIBLE_BOOKS.find(b => b.code === code.toUpperCase());
}
