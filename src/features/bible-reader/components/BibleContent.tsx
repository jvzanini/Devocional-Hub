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
 * Filtrar versículos: ocultar os que não contêm o texto e destacar os que contêm
 * Trabalha com span.bible-verse[data-verse] individuais
 */
/**
 * Remove todas as notas de rodapé (bible-footnote spans) do HTML.
 * Usa parsing iterativo para lidar com spans aninhados corretamente.
 */
function stripFootnotes(html: string): string {
  const pattern = /<span class="bible-footnote"[^>]*>/g;
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

function filterAndHighlight(html: string, query: string): string {
  if (!query || query.length < 2) return html;

  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return html;

  // 1. Strip footnotes e section titles ANTES de qualquer matching
  //    Isso impede que texto de footnotes polua a busca
  let processed = html;
  processed = stripFootnotes(processed);
  processed = processed.replace(/<h3 class="bible-section-title">[\s\S]*?<\/h3>/g, "");

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highlightRegex = new RegExp(`(${escaped})`, "gi");

  // Separar os spans de versículos usando split/rejoin
  // Cada versículo: <span class="bible-verse" data-verse="N" ...>...</span>
  // Permite atributos extras como data-usfm="ROM.12.1"
  const verseRegex = /<span class="bible-verse" data-verse="(\d+)"[^>]*>((?:(?!<span class="bible-verse")[\s\S])*?)<\/span>/g;
  let hasVisible = false;

  processed = processed.replace(verseRegex, (match, verseNum, innerContent) => {
    // Extrair texto puro do versículo (footnotes já foram removidos)
    const plainText = innerContent.replace(/<[^>]+>/g, "").replace(/\u00A0/g, " ");
    const normalizedPlain = normalizeForSearch(plainText);

    if (!normalizedPlain.includes(normalizedQuery)) {
      return `<span class="bible-verse" data-verse="${verseNum}" style="display:none">${innerContent}</span>`;
    }

    hasVisible = true;
    // Destacar — aplicar apenas no texto fora de tags HTML
    const highlighted = innerContent.replace(/>([^<]+)/g, (_m: string, text: string) => {
      const h = text.replace(highlightRegex, '<mark style="background:var(--accent);color:#000;border-radius:2px;padding:0 2px">$1</mark>');
      return `>${h}`;
    });

    return `<span class="bible-verse" data-verse="${verseNum}">${highlighted}</span>`;
  });

  if (!hasVisible) {
    return '<p style="color:var(--text-secondary);text-align:center;padding:20px 0">Nenhum versículo encontrado.</p>';
  }

  return processed;
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
