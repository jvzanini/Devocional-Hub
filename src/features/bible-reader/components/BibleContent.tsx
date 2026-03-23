"use client";

import { useMemo } from "react";

type FontSizeLevel = "normal" | "medium" | "large";

const FONT_SIZE_MAP: Record<FontSizeLevel, number> = {
  normal: 17,
  medium: 20,
  large: 24,
};

interface BibleContentProps {
  reference: string;
  htmlContent: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
  fontSize?: FontSizeLevel;
}

function LoadingSkeleton() {
  return (
    <div className="bible-content-skeleton">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bible-skeleton-line"
          style={{ width: `${60 + Math.random() * 40}%`, animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Normalizar texto para busca: remove acentos, pontuação, lowercase
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, "")         // remove pontuação
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove um tipo de span (por classe) do HTML, incluindo spans aninhados.
 * Usa parsing iterativo para lidar com spans aninhados corretamente.
 */
function stripSpansByClass(html: string, className: string): string {
  const pattern = new RegExp(`<span class="${className}"[^>]*>`, "g");
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    result += html.slice(lastIndex, match.index);
    // Contar spans aninhados para encontrar o </span> de fechamento correto
    let depth = 1;
    let pos = match.index + match[0].length;
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 5;
      } else {
        depth--;
        pos = nextClose + 7;
      }
    }
    lastIndex = pos;
    pattern.lastIndex = pos;
  }

  result += html.slice(lastIndex);
  return result;
}

/**
 * Extrai todos os versículos (bible-verse spans) do HTML original.
 * Retorna um Map de verseNum → { original HTML, texto limpo (sem footnotes) }.
 * Texto fora de spans bible-verse é ignorado (footnotes órfãos, etc).
 */
function extractVerses(html: string): Map<string, { originalHtml: string; cleanText: string }> {
  const verses = new Map<string, { originalHtml: string; cleanText: string }>();

  // Find each bible-verse span and capture its content (handling nested spans)
  const openTag = /<span class="bible-verse" data-verse="(\d+)"[^>]*>/g;
  let m: RegExpExecArray | null;

  while ((m = openTag.exec(html)) !== null) {
    const verseNum = m[1];
    const startAfterTag = m.index + m[0].length;

    // Find the closing </span> for this verse span (handle nesting)
    let depth = 1;
    let pos = startAfterTag;
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) {
          const innerContent = html.slice(startAfterTag, nextClose);
          const fullSpan = html.slice(m.index, nextClose + 7);
          // Strip footnotes from inner content for text matching only
          const cleanInner = stripSpansByClass(innerContent, "bible-footnote");
          const plainText = cleanInner.replace(/<[^>]+>/g, "").replace(/\u00A0/g, " ");

          verses.set(verseNum, {
            originalHtml: fullSpan,
            cleanText: plainText,
          });
        }
        pos = nextClose + 7;
      }
    }
  }

  return verses;
}

const ACCENT_VARIANTS: Record<string, string> = {
  'a': 'aàáâãäåā', 'e': 'eèéêëē', 'i': 'iìíîïī',
  'o': 'oòóôõöō', 'u': 'uùúûüū', 'c': 'cç', 'n': 'nñ',
};

function buildAccentInsensitiveRegex(query: string): RegExp {
  const pattern = query.split('').map(ch => {
    const lower = ch.toLowerCase();
    const variants = ACCENT_VARIANTS[lower];
    if (variants) return `[${variants}${variants.toUpperCase()}]`;
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return new RegExp(`(${pattern})`, 'gi');
}

function filterAndHighlight(html: string, query: string): string {
  if (!query || query.length < 2) return html;

  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return html;

  const verses = extractVerses(html);
  if (verses.size === 0) return html;

  const matchingVerses = new Set<string>();
  verses.forEach(({ cleanText }, verseNum) => {
    if (normalizeForSearch(cleanText).includes(normalizedQuery)) {
      matchingVerses.add(verseNum);
    }
  });

  if (matchingVerses.size === 0) {
    return '<p style="color:var(--text-secondary);text-align:center;padding:20px 0">Nenhum versículo encontrado.</p>';
  }

  const highlightRegex = buildAccentInsensitiveRegex(query);
  const openTagPattern = /<span class="bible-verse" data-verse="(\d+)"([^>]*)>/g;
  let result = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = openTagPattern.exec(html)) !== null) {
    const verseNum = m[1];
    const spanStart = m.index;
    const afterOpenTag = m.index + m[0].length;

    let depth = 1;
    let pos = afterOpenTag;
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf("<span", pos);
      const nextClose = html.indexOf("</span>", pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 5;
      } else {
        depth--;
        if (depth === 0) {
          const spanEnd = nextClose + 7;
          const fullVerse = html.slice(spanStart, spanEnd);

          result += html.slice(lastIndex, spanStart);

          if (matchingVerses.has(verseNum)) {
            const highlighted = fullVerse.replace(/>([^<]+)/g, (_, text) => {
              return `>${text.replace(highlightRegex, '<mark style="background:var(--accent);color:#000;border-radius:2px;padding:0 2px">$1</mark>')}`;
            });
            result += highlighted;
          } else {
            result += fullVerse.replace(
              '<span class="bible-verse"',
              '<span class="bible-verse" style="display:none"'
            );
          }
          lastIndex = spanEnd;
        }
        pos = nextClose + 7;
      }
    }
  }

  result += html.slice(lastIndex);
  return result;
}

export function BibleContent({
  reference,
  htmlContent,
  isLoading,
  error,
  searchQuery,
  fontSize = "normal",
}: BibleContentProps) {
  const processedHtml = useMemo(() => {
    if (!htmlContent) return null;
    if (searchQuery && searchQuery.length >= 2) {
      return filterAndHighlight(htmlContent, searchQuery);
    }
    return htmlContent;
  }, [htmlContent, searchQuery]);

  if (isLoading) {
    return (
      <div className="bible-content">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-content">
        <div className="bible-content-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p>{error}</p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Tente novamente ou escolha outra versão.
          </p>
        </div>
      </div>
    );
  }

  if (!processedHtml) {
    return (
      <div className="bible-content">
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
          Selecione um livro e capítulo para iniciar a leitura.
        </p>
      </div>
    );
  }

  const textSize = FONT_SIZE_MAP[fontSize];

  return (
    <div className="bible-content">
      <h2 className="bible-content-title">{reference}</h2>
      <div
        className="bible-content-text"
        style={{ fontSize: `${textSize}px`, lineHeight: `${textSize * 1.7}px` }}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </div>
  );
}
