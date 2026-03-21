/**
 * Mapa de abreviações dos 66 livros da Bíblia
 * Usa MÁXIMO de caracteres possível para clareza
 */

const ABBREVIATIONS: Record<string, string> = {
  // Antigo Testamento
  "Gênesis": "Gn",
  "Genesis": "Gn",
  "Êxodo": "Êx",
  "Exodo": "Êx",
  "Levítico": "Lv",
  "Levitico": "Lv",
  "Números": "Nm",
  "Numeros": "Nm",
  "Deuteronômio": "Dt",
  "Deuteronomio": "Dt",
  "Josué": "Js",
  "Josue": "Js",
  "Juízes": "Jz",
  "Juizes": "Jz",
  "Rute": "Rt",
  "1 Samuel": "1Sm",
  "2 Samuel": "2Sm",
  "1 Reis": "1Rs",
  "2 Reis": "2Rs",
  "1 Crônicas": "1Cr",
  "1 Cronicas": "1Cr",
  "2 Crônicas": "2Cr",
  "2 Cronicas": "2Cr",
  "Esdras": "Ed",
  "Neemias": "Ne",
  "Ester": "Et",
  "Jó": "Jó",
  "Jo": "Jó",
  "Salmos": "Sl",
  "Provérbios": "Pv",
  "Proverbios": "Pv",
  "Eclesiastes": "Ec",
  "Cantares": "Ct",
  "Cânticos": "Ct",
  "Canticos": "Ct",
  "Isaías": "Is",
  "Isaias": "Is",
  "Jeremias": "Jr",
  "Lamentações": "Lm",
  "Lamentacoes": "Lm",
  "Ezequiel": "Ez",
  "Daniel": "Dn",
  "Oséias": "Os",
  "Oseias": "Os",
  "Joel": "Jl",
  "Amós": "Am",
  "Amos": "Am",
  "Obadias": "Ob",
  "Jonas": "Jn",
  "Miquéias": "Mq",
  "Miqueias": "Mq",
  "Naum": "Na",
  "Habacuque": "Hc",
  "Sofonias": "Sf",
  "Ageu": "Ag",
  "Zacarias": "Zc",
  "Malaquias": "Ml",

  // Novo Testamento
  "Mateus": "Mt",
  "Marcos": "Mc",
  "Lucas": "Lc",
  "João": "Jo",
  "Joao": "Jo",
  "Atos": "At",
  "Romanos": "Rm",
  "1 Coríntios": "1Co",
  "1 Corintios": "1Co",
  "2 Coríntios": "2Co",
  "2 Corintios": "2Co",
  "Gálatas": "Gl",
  "Galatas": "Gl",
  "Efésios": "Ef",
  "Efesios": "Ef",
  "Filipenses": "Fp",
  "Colossenses": "Cl",
  "1 Tessalonicenses": "1Ts",
  "2 Tessalonicenses": "2Ts",
  "1 Timóteo": "1Tm",
  "1 Timoteo": "1Tm",
  "2 Timóteo": "2Tm",
  "2 Timoteo": "2Tm",
  "Tito": "Tt",
  "Filemom": "Fm",
  "Hebreus": "Hb",
  "Tiago": "Tg",
  "1 Pedro": "1Pe",
  "2 Pedro": "2Pe",
  "1 João": "1Jo",
  "1 Joao": "1Jo",
  "2 João": "2Jo",
  "2 Joao": "2Jo",
  "3 João": "3Jo",
  "3 Joao": "3Jo",
  "Judas": "Jd",
  "Apocalipse": "Ap",
};

/**
 * Retorna a abreviação de um livro da Bíblia
 * Usa o máximo de caracteres para clareza
 */
export function getBookAbbreviation(bookName: string): string {
  return ABBREVIATIONS[bookName] || bookName.substring(0, 3);
}

/**
 * Formata o label de capítulo para exibição no calendário
 * Ex: formatChapterLabel("Romanos", "11") → "ROM 11"
 * Ex: formatChapterLabel("1 Coríntios", "1-3") → "1COR 1-3"
 */
export function formatChapterLabel(bookName: string, chapters: string): string {
  const abbr = getBookAbbreviation(bookName);
  return `${abbr} ${chapters}`;
}
