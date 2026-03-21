"use client";

import { useMemo } from "react";

interface BibleContentProps {
  reference: string;
  htmlContent: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery?: string;
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
 * Filtrar HTML mostrando apenas parágrafos que contêm o texto buscado
 * e destacar os trechos encontrados
 */
function filterAndHighlight(html: string, query: string): string {
  if (!query || query.length < 2) return html;

  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return html;

  // Separar em parágrafos
  const paragraphs = html.split(/<\/p>/i);

  const filtered = paragraphs
    .map((p) => {
      // Extrair texto puro do parágrafo para comparação
      const plainText = p.replace(/<[^>]+>/g, "");
      const normalizedPlain = normalizeForSearch(plainText);

      if (!normalizedPlain.includes(normalizedQuery)) {
        return null; // ocultar parágrafo que não contém a busca
      }

      // Destacar no HTML original (case-insensitive, ignora acentos)
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");

      const highlighted = p.replace(/>([^<]+)</g, (match, text) => {
        const h = text.replace(regex, '<mark style="background:var(--accent);color:#000;border-radius:2px;padding:0 2px">$1</mark>');
        return `>${h}<`;
      });

      return highlighted + "</p>";
    })
    .filter(Boolean);

  if (filtered.length === 0) {
    return '<p style="color:var(--text-secondary);text-align:center;padding:20px 0">Nenhum versículo encontrado.</p>';
  }

  return filtered.join("\n");
}

export function BibleContent({
  reference,
  htmlContent,
  isLoading,
  error,
  searchQuery,
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

  return (
    <div className="bible-content">
      <h2 className="bible-content-title">{reference}</h2>
      <div
        className="bible-content-text"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    </div>
  );
}
