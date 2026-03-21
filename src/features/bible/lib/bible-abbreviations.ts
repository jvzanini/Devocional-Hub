/**
 * Mapa de abreviações dos 66 livros da Bíblia
 * Usa MÁXIMO de caracteres possível para clareza
 */

const ABBREVIATIONS: Record<string, string> = {
  // Antigo Testamento
  "Gênesis": "GEN",
  "Genesis": "GEN",
  "Êxodo": "EXO",
  "Exodo": "EXO",
  "Levítico": "LEV",
  "Levitico": "LEV",
  "Números": "NUM",
  "Numeros": "NUM",
  "Deuteronômio": "DEUT",
  "Deuteronomio": "DEUT",
  "Josué": "JOS",
  "Josue": "JOS",
  "Juízes": "JUIZ",
  "Juizes": "JUIZ",
  "Rute": "RUTE",
  "1 Samuel": "1SAM",
  "2 Samuel": "2SAM",
  "1 Reis": "1REIS",
  "2 Reis": "2REIS",
  "1 Crônicas": "1CRO",
  "1 Cronicas": "1CRO",
  "2 Crônicas": "2CRO",
  "2 Cronicas": "2CRO",
  "Esdras": "ESD",
  "Neemias": "NEEM",
  "Ester": "EST",
  "Jó": "JO",
  "Jo": "JO",
  "Salmos": "SAL",
  "Provérbios": "PROV",
  "Proverbios": "PROV",
  "Eclesiastes": "ECL",
  "Cantares": "CANT",
  "Cânticos": "CANT",
  "Canticos": "CANT",
  "Isaías": "ISA",
  "Isaias": "ISA",
  "Jeremias": "JER",
  "Lamentações": "LAM",
  "Lamentacoes": "LAM",
  "Ezequiel": "EZEQ",
  "Daniel": "DAN",
  "Oséias": "OSE",
  "Oseias": "OSE",
  "Joel": "JOEL",
  "Amós": "AMOS",
  "Amos": "AMOS",
  "Obadias": "OBAD",
  "Jonas": "JONAS",
  "Miquéias": "MIQ",
  "Miqueias": "MIQ",
  "Naum": "NAUM",
  "Habacuque": "HAB",
  "Sofonias": "SOF",
  "Ageu": "AGEU",
  "Zacarias": "ZAC",
  "Malaquias": "MAL",

  // Novo Testamento
  "Mateus": "MAT",
  "Marcos": "MAR",
  "Lucas": "LUC",
  "João": "JOAO",
  "Joao": "JOAO",
  "Atos": "ATOS",
  "Romanos": "ROM",
  "1 Coríntios": "1COR",
  "1 Corintios": "1COR",
  "2 Coríntios": "2COR",
  "2 Corintios": "2COR",
  "Gálatas": "GAL",
  "Galatas": "GAL",
  "Efésios": "EFES",
  "Efesios": "EFES",
  "Filipenses": "FIL",
  "Colossenses": "COL",
  "1 Tessalonicenses": "1TES",
  "2 Tessalonicenses": "2TES",
  "1 Timóteo": "1TIM",
  "1 Timoteo": "1TIM",
  "2 Timóteo": "2TIM",
  "2 Timoteo": "2TIM",
  "Tito": "TITO",
  "Filemom": "FILEM",
  "Hebreus": "HEB",
  "Tiago": "TIAGO",
  "1 Pedro": "1PED",
  "2 Pedro": "2PED",
  "1 João": "1JOAO",
  "1 Joao": "1JOAO",
  "2 João": "2JOAO",
  "2 Joao": "2JOAO",
  "3 João": "3JOAO",
  "3 Joao": "3JOAO",
  "Judas": "JUDAS",
  "Apocalipse": "APOC",
};

/**
 * Retorna a abreviação de um livro da Bíblia
 * Usa o máximo de caracteres para clareza
 */
export function getBookAbbreviation(bookName: string): string {
  return ABBREVIATIONS[bookName] || bookName.substring(0, 4).toUpperCase();
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
