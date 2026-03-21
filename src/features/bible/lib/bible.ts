/**
 * Bible API client — busca texto bíblico NVI em português
 *
 * Fonte: Holy Bible API (gratuita, sem chave)
 * https://holy-bible-api.com
 */

interface BibleChapter {
  id: string;
  bookId: string;
  number: string;
  reference: string;
  content: string;
}

// Mapeamento de IDs da API.Bible para IDs numéricos do bolls.life
const BOOK_ID_TO_BOLLS: Record<string, number> = {
  GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5,
  JOS: 6, JDG: 7, RUT: 8, "1SA": 9, "2SA": 10,
  "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
  EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20,
  ECC: 21, SNG: 22, ISA: 23, JER: 24, LAM: 25,
  EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
  OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35,
  ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
  MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
  ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49,
  PHP: 50, COL: 51, "1TH": 52, "2TH": 53,
  "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58,
  JAS: 59, "1PE": 60, "2PE": 61,
  "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66,
};

// Nomes legíveis dos livros
const BOOK_ID_TO_NAME: Record<string, string> = {
  GEN: "Gênesis", EXO: "Êxodo", LEV: "Levítico", NUM: "Números", DEU: "Deuteronômio",
  JOS: "Josué", JDG: "Juízes", RUT: "Rute", "1SA": "1 Samuel", "2SA": "2 Samuel",
  "1KI": "1 Reis", "2KI": "2 Reis", "1CH": "1 Crônicas", "2CH": "2 Crônicas",
  EZR: "Esdras", NEH: "Neemias", EST: "Ester", JOB: "Jó", PSA: "Salmos", PRO: "Provérbios",
  ECC: "Eclesiastes", SNG: "Cânticos", ISA: "Isaías", JER: "Jeremias", LAM: "Lamentações",
  EZK: "Ezequiel", DAN: "Daniel", HOS: "Oséias", JOL: "Joel", AMO: "Amós",
  OBA: "Obadias", JON: "Jonas", MIC: "Miquéias", NAM: "Naum", HAB: "Habacuque",
  ZEP: "Sofonias", HAG: "Ageu", ZEC: "Zacarias", MAL: "Malaquias",
  MAT: "Mateus", MRK: "Marcos", LUK: "Lucas", JHN: "João", ACT: "Atos",
  ROM: "Romanos", "1CO": "1 Coríntios", "2CO": "2 Coríntios", GAL: "Gálatas", EPH: "Efésios",
  PHP: "Filipenses", COL: "Colossenses", "1TH": "1 Tessalonicenses", "2TH": "2 Tessalonicenses",
  "1TI": "1 Timóteo", "2TI": "2 Timóteo", TIT: "Tito", PHM: "Filemom", HEB: "Hebreus",
  JAS: "Tiago", "1PE": "1 Pedro", "2PE": "2 Pedro",
  "1JN": "1 João", "2JN": "2 João", "3JN": "3 João", JUD: "Judas", REV: "Apocalipse",
};

// Mapeamento de nomes de livros em português para IDs da API
const BOOK_NAME_MAP: Record<string, string> = {
  // Antigo Testamento
  gênesis: "GEN", genesis: "GEN", gn: "GEN",
  êxodo: "EXO", exodo: "EXO", ex: "EXO",
  levítico: "LEV", levitico: "LEV", lv: "LEV",
  números: "NUM", numeros: "NUM", nm: "NUM",
  deuteronômio: "DEU", deuteronomio: "DEU", dt: "DEU",
  josué: "JOS", josue: "JOS", js: "JOS",
  juízes: "JDG", juizes: "JDG", jz: "JDG",
  rute: "RUT", rt: "RUT",
  "1 samuel": "1SA", "1samuel": "1SA", "1sm": "1SA",
  "2 samuel": "2SA", "2samuel": "2SA", "2sm": "2SA",
  "1 reis": "1KI", "1reis": "1KI", "1rs": "1KI",
  "2 reis": "2KI", "2reis": "2KI", "2rs": "2KI",
  "1 crônicas": "1CH", "1cronicas": "1CH", "1cr": "1CH",
  "2 crônicas": "2CH", "2cronicas": "2CH", "2cr": "2CH",
  esdras: "EZR", ed: "EZR",
  neemias: "NEH", ne: "NEH",
  ester: "EST", et: "EST",
  jó: "JOB", jo: "JOB",
  salmos: "PSA", sl: "PSA",
  provérbios: "PRO", proverbios: "PRO", pv: "PRO",
  eclesiastes: "ECC", ec: "ECC",
  "cânticos": "SNG", "cantares": "SNG", ct: "SNG",
  isaías: "ISA", isaias: "ISA", is: "ISA",
  jeremias: "JER", jr: "JER",
  lamentações: "LAM", lamentacoes: "LAM", lm: "LAM",
  ezequiel: "EZK", ez: "EZK",
  daniel: "DAN", dn: "DAN",
  oséias: "HOS", oseias: "HOS", os: "HOS",
  joel: "JOL", jl: "JOL",
  amós: "AMO", amos: "AMO", am: "AMO",
  obadias: "OBA", ob: "OBA",
  jonas: "JON", jn: "JON",
  miquéias: "MIC", miqueias: "MIC", mq: "MIC",
  naum: "NAM", na: "NAM",
  habacuque: "HAB", hc: "HAB",
  sofonias: "ZEP", sf: "ZEP",
  ageu: "HAG", ag: "HAG",
  zacarias: "ZEC", zc: "ZEC",
  malaquias: "MAL", ml: "MAL",
  // Novo Testamento
  mateus: "MAT", mt: "MAT",
  marcos: "MRK", mc: "MRK",
  lucas: "LUK", lc: "LUK",
  joão: "JHN", joao: "JHN",
  atos: "ACT", at: "ACT",
  romanos: "ROM", rm: "ROM",
  "1 coríntios": "1CO", "1corintios": "1CO", "1co": "1CO",
  "2 coríntios": "2CO", "2corintios": "2CO", "2co": "2CO",
  gálatas: "GAL", galatas: "GAL", gl: "GAL",
  efésios: "EPH", efesios: "EPH", ef: "EPH",
  filipenses: "PHP", fp: "PHP",
  colossenses: "COL", cl: "COL",
  "1 tessalonicenses": "1TH", "1ts": "1TH",
  "2 tessalonicenses": "2TH", "2ts": "2TH",
  "1 timóteo": "1TI", "1timoteo": "1TI", "1tm": "1TI",
  "2 timóteo": "2TI", "2timoteo": "2TI", "2tm": "2TI",
  tito: "TIT", tt: "TIT",
  filemom: "PHM", fm: "PHM",
  hebreus: "HEB", hb: "HEB",
  tiago: "JAS", tg: "JAS",
  "1 pedro": "1PE", "1pe": "1PE",
  "2 pedro": "2PE", "2pe": "2PE",
  "1 joão": "1JN", "1joao": "1JN", "1jo": "1JN",
  "2 joão": "2JN", "2joao": "2JN", "2jo": "2JN",
  "3 joão": "3JN", "3joao": "3JN", "3jo": "3JN",
  judas: "JUD", jd: "JUD",
  apocalipse: "REV", ap: "REV",
};

function normalizeBookName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getBookId(bookName: string): string | null {
  const normalized = normalizeBookName(bookName);

  // Tentativa direta
  if (BOOK_NAME_MAP[normalized]) return BOOK_NAME_MAP[normalized];

  // Tentativa com prefixo numérico (ex: "1 Co" → "1 coríntios")
  for (const [key, id] of Object.entries(BOOK_NAME_MAP)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return id;
    }
  }

  return null;
}

/**
 * Extrai referências bíblicas de um texto (ex: "João 3", "Salmos 23:1-6")
 */
export function extractBibleReferences(text: string): Array<{ book: string; chapter: number }> {
  const pattern =
    /\b((?:\d\s+)?[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)\s+(\d+)(?::\d+(?:-\d+)?)?\b/gi;

  const references: Array<{ book: string; chapter: number }> = [];
  const seen = new Set<string>();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const bookName = match[1].trim();
    const chapter = parseInt(match[2], 10);

    const bookId = getBookId(bookName);
    if (!bookId) continue;

    const key = `${bookId}-${chapter}`;
    if (seen.has(key)) continue;
    seen.add(key);

    references.push({ book: bookId, chapter });
  }

  return references;
}

// ─── Fonte: Holy Bible API (gratuita, sem chave) ──────────────────────────

interface HolyBibleVerse {
  bible_id: number;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

// NVI = bible_id 644 na Holy Bible API
const DEFAULT_HOLY_BIBLE_ID = 644;

async function getChapterFromHolyBibleApi(bookId: string, chapter: number): Promise<BibleChapter> {
  const bookNumber = BOOK_ID_TO_BOLLS[bookId]; // Mesmo mapeamento (1-66)
  if (!bookNumber) {
    throw new Error(`Livro ${bookId} não encontrado no mapeamento`);
  }

  const bookName = BOOK_ID_TO_NAME[bookId] || bookId;

  console.log(`[Bible] Buscando ${bookName} ${chapter} via Holy Bible API (NVI)...`);
  const response = await fetch(
    `https://holy-bible-api.com/bibles/${DEFAULT_HOLY_BIBLE_ID}/books/${bookNumber}/chapters/${chapter}/verses`
  );

  if (!response.ok) {
    throw new Error(`Holy Bible API erro ${response.status}: ${await response.text()}`);
  }

  const verses: HolyBibleVerse[] = await response.json();

  if (!Array.isArray(verses) || verses.length === 0) {
    throw new Error(`Holy Bible API retornou capítulo vazio para ${bookName} ${chapter}`);
  }

  const content = verses
    .map((v) => `${v.verse} ${v.text.trim()}`)
    .join("\n");

  return {
    id: `${bookId}.${chapter}`,
    bookId,
    number: String(chapter),
    reference: `${bookName} ${chapter}`,
    content,
  };
}

// ─── Função principal ─────────────────────────────────────────────────────

/**
 * Busca o texto completo de um capítulo (NVI português)
 * Fonte: Holy Bible API (gratuita, sem chave)
 */
export async function getChapterText(bookId: string, chapter: number): Promise<BibleChapter> {
  try {
    return await getChapterFromHolyBibleApi(bookId, chapter);
  } catch (err) {
    console.error(`[Bible] Holy Bible API falhou: ${err}`);
    throw new Error(`Não foi possível buscar ${BOOK_ID_TO_NAME[bookId] || bookId} ${chapter}`);
  }
}

/**
 * Busca múltiplos capítulos e retorna texto concatenado
 */
export async function getChaptersText(
  references: Array<{ book: string; chapter: number }>
): Promise<string> {
  const chapters = await Promise.all(
    references.map((ref) => getChapterText(ref.book, ref.chapter))
  );

  return chapters
    .map((ch) => `=== ${ch.reference} ===\n\n${ch.content}`)
    .join("\n\n");
}
