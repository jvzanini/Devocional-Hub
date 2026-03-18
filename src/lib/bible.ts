/**
 * Bible API client — api.scripture.api.bible
 * Docs: https://scripture.api.bible/
 * Versão NVI em português: ID = a556c5305ee15c3f-01
 */

interface BibleBook {
  id: string;
  name: string;
  abbreviation: string;
}

interface BibleChapter {
  id: string;
  bookId: string;
  number: string;
  reference: string;
  content: string;
}

interface BibleApiChapterResponse {
  data: {
    id: string;
    bookId: string;
    number: string;
    reference: string;
    content: string;
    verseCount: number;
  };
}

interface BibleApiBooksResponse {
  data: BibleBook[];
}

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

/**
 * Busca o texto completo de um capítulo na API.Bible (versão NVI)
 */
export async function getChapterText(bookId: string, chapter: number): Promise<BibleChapter> {
  const { BIBLE_API_KEY, BIBLE_NVI_ID } = process.env;

  if (!BIBLE_API_KEY) {
    throw new Error("BIBLE_API_KEY não configurada no .env");
  }

  const bibleId = BIBLE_NVI_ID || "a556c5305ee15c3f-01";
  const chapterId = `${bookId}.${chapter}`;

  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
    {
      headers: {
        "api-key": BIBLE_API_KEY,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bible API erro ${response.status}: ${error}`);
  }

  const data: BibleApiChapterResponse = await response.json();

  return {
    id: data.data.id,
    bookId: data.data.bookId,
    number: data.data.number,
    reference: data.data.reference,
    content: cleanBibleContent(data.data.content),
  };
}

/**
 * Limpa o HTML/markup retornado pela API e deixa só o texto
 */
function cleanBibleContent(content: string): string {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
