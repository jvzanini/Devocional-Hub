/**
 * Cliente YouVersion (bible.com) — busca conteúdo bíblico com formatação real
 *
 * Extrai títulos de seção, parágrafos e poesia diretamente do HTML do YouVersion,
 * eliminando a necessidade de IA para formatar o texto bíblico.
 *
 * Estratégia: fetch da página bible.com → parse __NEXT_DATA__ → transformar HTML
 */

import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

// ─── Mapeamento de versões: Holy Bible API ID → YouVersion ──────────────────

interface YouVersionMapping {
  youVersionId: number;
  abbreviation: string;
}

/**
 * Mapeia IDs internos (Holy Bible API) para IDs do YouVersion
 * Apenas versões disponíveis no YouVersion em português
 */
const VERSION_MAP: Record<string, YouVersionMapping> = {
  "644": { youVersionId: 129, abbreviation: "NVI" },
  "635": { youVersionId: 1608, abbreviation: "ARA" },
  "637": { youVersionId: 212, abbreviation: "ARC" },
  "641": { youVersionId: 1840, abbreviation: "NAA" },
  "645": { youVersionId: 1930, abbreviation: "NVT" },
  "643": { youVersionId: 211, abbreviation: "NTLH" },
};

// Versões adicionais do YouVersion que não temos na Holy Bible API
// A21 = 2645 (disponível se adicionarmos no futuro)

// ─── Cache em memória com TTL ───────────────────────────────────────────────

interface CacheEntry {
  data: { content: string; reference: string; copyright: string };
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const contentCache = new Map<string, CacheEntry>();

function getCacheKey(versionId: string, bookCode: string, chapter: number): string {
  return `${versionId}:${bookCode}:${chapter}`;
}

function getFromCache(key: string): CacheEntry["data"] | null {
  const entry = contentCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    contentCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: CacheEntry["data"]): void {
  // Limitar tamanho do cache (máx 500 entradas)
  if (contentCache.size > 500) {
    const oldest = contentCache.keys().next().value;
    if (oldest) contentCache.delete(oldest);
  }
  contentCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Funções principais ─────────────────────────────────────────────────────

/**
 * Busca conteúdo formatado de um capítulo via YouVersion (bible.com)
 *
 * @param internalVersionId ID da versão na Holy Bible API (ex: "644" para NVI)
 * @param bookCode Código USFM do livro (ex: "ROM", "GEN")
 * @param chapter Número do capítulo
 * @returns Conteúdo HTML formatado, referência e copyright, ou null se falhar
 */
export async function fetchYouVersionContent(
  internalVersionId: string,
  bookCode: string,
  chapter: number
): Promise<{ content: string; reference: string; copyright: string } | null> {
  const cacheKey = getCacheKey(internalVersionId, bookCode, chapter);

  // Verificar cache
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`[YouVersion] Cache hit: ${bookCode} ${chapter}`);
    return cached;
  }

  // Verificar se temos mapeamento para esta versão
  const mapping = VERSION_MAP[internalVersionId];
  if (!mapping) {
    console.log(`[YouVersion] Versão ${internalVersionId} não disponível no YouVersion`);
    return null;
  }

  // Buscar nome do livro
  const book = BIBLE_BOOKS.find((b) => b.code === bookCode.toUpperCase());
  if (!book) {
    console.log(`[YouVersion] Livro não encontrado: ${bookCode}`);
    return null;
  }

  try {
    const rawHtml = await fetchYouVersionPage(
      mapping.youVersionId,
      bookCode.toUpperCase(),
      chapter,
      mapping.abbreviation
    );

    const chapterContent = extractChapterContent(rawHtml);
    if (!chapterContent) {
      console.warn(`[YouVersion] Não foi possível extrair conteúdo de ${bookCode} ${chapter}`);
      return null;
    }

    const formattedHtml = transformYouVersionHtml(chapterContent);

    const result = {
      content: formattedHtml,
      reference: `${book.name} ${chapter}`,
      copyright: `Texto via YouVersion (bible.com) - ${mapping.abbreviation}`,
    };

    // Salvar no cache
    setInCache(cacheKey, result);
    console.log(`[YouVersion] Conteúdo carregado: ${book.name} ${chapter} (${mapping.abbreviation})`);

    return result;
  } catch (err) {
    console.error(`[YouVersion] Erro ao buscar ${bookCode} ${chapter}:`, err);
    return null;
  }
}

// ─── Fetch da página YouVersion ─────────────────────────────────────────────

/**
 * Faz fetch da página bible.com para extrair o conteúdo
 *
 * URL: https://www.bible.com/bible/{versionId}/{BOOK}.{CHAPTER}.{VERSION_ABBR}
 * Ex: https://www.bible.com/bible/129/ROM.12.NVI
 */
async function fetchYouVersionPage(
  youVersionId: number,
  bookCode: string,
  chapter: number,
  versionAbbr: string
): Promise<string> {
  const url = `https://www.bible.com/bible/${youVersionId}/${bookCode}.${chapter}.${versionAbbr}`;

  console.log(`[YouVersion] Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(15000), // timeout 15s
  });

  if (!response.ok) {
    throw new Error(`YouVersion HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

// ─── Extração do __NEXT_DATA__ ──────────────────────────────────────────────

/**
 * Extrai o conteúdo do capítulo do JSON __NEXT_DATA__ presente no HTML da página
 *
 * O campo alvo é: props.pageProps.chapterInfo.content (string HTML)
 */
function extractChapterContent(pageHtml: string): string | null {
  // Buscar o script __NEXT_DATA__
  const nextDataMatch = pageHtml.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!nextDataMatch || !nextDataMatch[1]) {
    console.warn("[YouVersion] __NEXT_DATA__ não encontrado no HTML");
    return null;
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);

    // Navegar até o conteúdo do capítulo
    // Diferentes versões do YouVersion podem armazenar em paths diferentes
    const content =
      nextData?.props?.pageProps?.chapterInfo?.content ||
      nextData?.props?.pageProps?.chapter?.content ||
      nextData?.props?.pageProps?.chapterInfo?.chapter?.content ||
      null;

    if (!content || typeof content !== "string") {
      console.warn("[YouVersion] chapterInfo.content não encontrado no __NEXT_DATA__");

      // Log das chaves disponíveis para debug
      const pageProps = nextData?.props?.pageProps;
      if (pageProps) {
        console.log("[YouVersion] Chaves em pageProps:", Object.keys(pageProps).join(", "));
        // Deep search para encontrar o campo content em qualquer nível
        const chapterInfo = pageProps.chapterInfo;
        if (chapterInfo) {
          console.log("[YouVersion] Chaves em chapterInfo:", Object.keys(chapterInfo).join(", "));
        }
      }

      return null;
    }

    return content;
  } catch (parseErr) {
    console.error("[YouVersion] Erro ao parsear __NEXT_DATA__:", parseErr);
    return null;
  }
}

// ─── Transformação do HTML YouVersion → HTML limpo ──────────────────────────

/**
 * Transforma o HTML do YouVersion (com classes CSS module) em HTML limpo
 * com nossas próprias classes para exibição
 *
 * Classes YouVersion → Nossas classes:
 * - div.s1 (heading) → h3.bible-section-title
 * - div.p (paragraph) → div.bible-paragraph
 * - div.q1 (poetry L1) → div.bible-poetry-1
 * - div.q2 (poetry L2) → div.bible-poetry-2
 * - div.m (margin) → div.bible-paragraph
 * - span.verse → span.bible-verse (mantido)
 * - span.label → sup.v (número do versículo)
 * - span.content → texto inline
 * - span.note → span.bible-footnote (tooltip com conteúdo da nota)
 */
/**
 * Transforma footnotes (span.note com spans aninhados) em tooltips inline.
 * Usa parsing manual para lidar corretamente com spans aninhados.
 */
function transformFootnotes(html: string): string {
  const noteStart = /(<span\s+class="[^"]*\bnote\b[^"]*"[^>]*>)/gi;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = noteStart.exec(html)) !== null) {
    // Adicionar texto antes do match
    result += html.slice(lastIndex, match.index);

    // Contar spans abertos/fechados para encontrar o </span> correto
    let depth = 1;
    let pos = match.index + match[0].length;
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);

      if (nextClose === -1) break; // malformado

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 5; // avançar além de "<span"
      } else {
        depth--;
        if (depth === 0) {
          // Encontramos o </span> que fecha o note
          const innerHtml = html.slice(match.index + match[0].length, nextClose);
          // Remover o span.label (contém "#" ou "*")
          const withoutLabel = innerHtml.replace(/<span\s+class="[^"]*\blabel\b[^"]*"[^>]*>[^<]*<\/span>/gi, "");
          const noteText = withoutLabel.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

          if (noteText) {
            result += `<span class="bible-footnote" tabindex="0"><span class="bible-footnote-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm0 15.17L18.83 16H4V4h16v13.17z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="16" cy="10" r="1"/></svg></span><span class="bible-footnote-content">${noteText}</span></span>`;
          }
          pos = nextClose + 7; // length of "</span>"
        } else {
          pos = nextClose + 7;
        }
      }
    }

    lastIndex = pos;
    noteStart.lastIndex = pos; // atualizar posição do regex
  }

  result += html.slice(lastIndex);
  return result;
}

function transformYouVersionHtml(rawHtml: string): string {
  let html = rawHtml;

  // 1. Transformar footnotes (span.note) em tooltips inline
  //    Estrutura: <span class="note f"><span class="label">#</span><span class="body"><span class="fr">12.6 </span><span class="ft">Ou </span>...</span></span>
  //    As notas podem conter 4-5 spans aninhados, então usamos abordagem iterativa
  html = transformFootnotes(html);

  // 2. Remover classes CSS module do YouVersion (ex: ChapterContent_xxx__yyy)
  //    Preservar apenas as classes semânticas (s1, p, q1, q2, m, verse, label, content, heading)
  html = html.replace(
    /class="([^"]*)"/g,
    (_match, classStr: string) => {
      const classes = classStr.split(/\s+/);
      const semanticClasses = classes.filter((cls: string) =>
        /^(s[0-9]|p|q[0-9]|m|ms[0-9]?|d|verse|label|content|heading|chapter-num|b|r|sp|li[0-9]?|bible-.+)$/.test(cls)
      );
      return `class="${semanticClasses.join(" ")}"`;
    }
  );

  // 3. Transformar section headings: div.s1 → h3
  html = html.replace(
    /<div\s+class="s[0-9]"[^>]*>\s*<span\s+class="heading"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/gi,
    '<h3 class="bible-section-title">$1</h3>'
  );

  // Heading alternativo sem span.heading
  html = html.replace(
    /<div\s+class="s[0-9]"[^>]*>([\s\S]*?)<\/div>/gi,
    (_match, content: string) => {
      // Se já foi transformado em h3, pular
      if (content.includes("bible-section-title")) return content;
      // Extrair texto limpo
      const text = content.replace(/<[^>]+>/g, "").trim();
      if (!text) return "";
      return `<h3 class="bible-section-title">${text}</h3>`;
    }
  );

  // 4. Transformar parágrafos
  html = html.replace(/<div\s+class="p">/g, '<div class="bible-paragraph">');
  html = html.replace(/<div\s+class="m">/g, '<div class="bible-paragraph">');

  // 5. Transformar poesia
  html = html.replace(/<div\s+class="q1">/g, '<div class="bible-poetry-1">');
  html = html.replace(/<div\s+class="q2">/g, '<div class="bible-poetry-2">');

  // 6. Transformar verse spans: extrair número do versículo de data-usfm (ex: "ROM.12.1" → 1)
  //    Produz data-verse="N" compatível com o componente BibleContent (busca/highlight)
  html = html.replace(
    /<span\s+class="verse"\s+data-usfm="([^"]*)"[^>]*>/g,
    (_match: string, usfm: string) => {
      // Extrair número do versículo: último segmento do USFM (ex: ROM.12.1 → 1)
      const parts = usfm.split(".");
      const verseNum = parts[parts.length - 1] || "0";
      return `<span class="bible-verse" data-verse="${verseNum}" data-usfm="${usfm}">`;
    }
  );

  // Verse spans sem data-usfm
  html = html.replace(
    /<span\s+class="verse"[^>]*>/g,
    '<span class="bible-verse">'
  );

  // 7. Transformar verse labels: span.label → sup.v
  html = html.replace(
    /<span\s+class="label"[^>]*>(\d+)<\/span>/g,
    '<sup class="v">$1</sup>\u00A0'
  );

  // 8. Remover span.content wrapper (manter apenas o texto)
  html = html.replace(/<span\s+class="content"[^>]*>/g, "");
  // Fechar os spans de content correspondentes — eles serão spans comuns
  // Na verdade, precisamos ser cuidadosos aqui. Vamos substituir span.content por nada
  // e o </span> correspondente já existe no HTML

  // 9. Transformar outras classes (d = descriptive title, r = reference, b = blank line)
  html = html.replace(/<div\s+class="d">/g, '<div class="bible-description">');
  html = html.replace(/<div\s+class="r">/g, '<div class="bible-reference">');
  html = html.replace(/<div\s+class="b"[^>]*>[\s\S]*?<\/div>/gi, '<div class="bible-break"></div>');

  // 10. Transformar listas (li1, li2)
  html = html.replace(/<div\s+class="li1">/g, '<div class="bible-list-1">');
  html = html.replace(/<div\s+class="li2">/g, '<div class="bible-list-2">');

  // 11. Limpar div.chapter-num (número do capítulo grande — remover pois já temos no header)
  html = html.replace(/<div\s+class="chapter-num"[^>]*>[\s\S]*?<\/div>/gi, "");
  html = html.replace(/<span\s+class="chapter-num"[^>]*>[\s\S]*?<\/span>/gi, "");

  // 11b. Remover chapter label: <div class="label">NUMBER</div> que aparece
  //      como primeiro elemento visível (número do capítulo grande do YouVersion)
  //      Após step 7, verse labels já foram convertidos para sup.v,
  //      então qualquer <div class="label">NÚMERO</div> restante é o chapter label
  html = html.replace(/<div\s+class="label"[^>]*>\s*\d+\s*<\/div>/gi, "");

  // 12. Limpar atributos data-* desnecessários (exceto data-usfm e data-verse)
  html = html.replace(/\s+data-(?!usfm|verse)[a-z-]+="[^"]*"/g, "");

  // 13. Limpar classes vazias
  html = html.replace(/\s+class=""/g, "");

  // 14. Limpar espaços em branco excessivos
  html = html.replace(/\n\s*\n/g, "\n");
  html = html.trim();

  return html;
}

/**
 * Verifica se uma versão da Holy Bible API está disponível no YouVersion
 */
export function isYouVersionAvailable(internalVersionId: string): boolean {
  return internalVersionId in VERSION_MAP;
}

/**
 * Retorna a URL do YouVersion para um capítulo específico (para link externo)
 */
export function getYouVersionUrl(
  internalVersionId: string,
  bookCode: string,
  chapter: number
): string | null {
  const mapping = VERSION_MAP[internalVersionId];
  if (!mapping) return null;
  return `https://www.bible.com/bible/${mapping.youVersionId}/${bookCode.toUpperCase()}.${chapter}.${mapping.abbreviation}`;
}
