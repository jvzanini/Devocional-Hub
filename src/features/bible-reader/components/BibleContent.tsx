"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type FontSizeLevel = "normal" | "medium" | "large";

const FONT_SIZE_MAP: Record<FontSizeLevel, number> = {
  normal: 17,
  medium: 20,
  large: 24,
};

const FOOTNOTE_SIZE_MAP: Record<FontSizeLevel, number> = {
  normal: 13,
  medium: 14,
  large: 16,
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

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll("mark[data-search-hl]").forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    }
  });
}

function highlightTextInElement(element: Element, query: string) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest(".bible-footnote-content")) continue;
    if (node.parentElement?.closest("sup.v")) continue;
    if (node.parentElement?.tagName === "MARK") continue;
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || "";
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      const mark = document.createElement("mark");
      mark.setAttribute("data-search-hl", "1");
      mark.style.background = "var(--accent)";
      mark.style.color = "#000";
      mark.style.borderRadius = "2px";
      mark.style.padding = "0 2px";
      mark.textContent = match[1];
      fragment.appendChild(mark);
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    if (lastIdx > 0) {
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
}

export function BibleContent({
  reference,
  htmlContent,
  isLoading,
  error,
  searchQuery,
  fontSize = "normal",
}: BibleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [noResults, setNoResults] = useState(false);
  const [activeFootnote, setActiveFootnote] = useState<HTMLElement | null>(null);

  const processSearch = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;

    clearHighlights(container);

    container.querySelectorAll<HTMLElement>(".bible-verse").forEach((el) => {
      el.style.display = "";
    });
    setNoResults(false);

    if (!searchQuery || searchQuery.length < 2) return;

    const normalizedQuery = normalizeForSearch(searchQuery);
    if (!normalizedQuery) return;

    const verseSpans = container.querySelectorAll<HTMLElement>(".bible-verse");
    if (verseSpans.length === 0) return;

    let hasVisible = false;

    verseSpans.forEach((span) => {
      const footnotes = span.querySelectorAll(".bible-footnote-content");
      const textsWithoutFootnotes: string[] = [];

      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        let isInsideFootnoteContent = false;
        for (let i = 0; i < footnotes.length; i++) {
          if (footnotes[i].contains(node)) {
            isInsideFootnoteContent = true;
            break;
          }
        }
        if (!isInsideFootnoteContent) {
          textsWithoutFootnotes.push(node.textContent || "");
        }
      }

      const fullText = textsWithoutFootnotes.join(" ");
      const normalizedText = normalizeForSearch(fullText);

      if (normalizedText.includes(normalizedQuery)) {
        span.style.display = "";
        hasVisible = true;
        highlightTextInElement(span, searchQuery);
      } else {
        span.style.display = "none";
      }
    });

    setNoResults(!hasVisible);
  }, [searchQuery]);

  useEffect(() => {
    if (!contentRef.current || !htmlContent) return;
    const timer = requestAnimationFrame(() => processSearch());
    return () => cancelAnimationFrame(timer);
  }, [searchQuery, htmlContent, processSearch]);

  const handleFootnoteClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const footnoteIcon = target.closest(".bible-footnote-icon");
    const footnoteEl = target.closest(".bible-footnote");

    if (!footnoteIcon || !footnoteEl) {
      if (activeFootnote) {
        activeFootnote.classList.remove("bible-footnote--active");
        setActiveFootnote(null);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (activeFootnote && activeFootnote !== footnoteEl) {
      activeFootnote.classList.remove("bible-footnote--active");
    }

    const content = footnoteEl.querySelector(".bible-footnote-content") as HTMLElement;
    if (!content) return;

    const isActive = footnoteEl.classList.contains("bible-footnote--active");
    if (isActive) {
      footnoteEl.classList.remove("bible-footnote--active");
      setActiveFootnote(null);
      return;
    }

    footnoteEl.classList.add("bible-footnote--active");
    setActiveFootnote(footnoteEl as HTMLElement);

    const modal = footnoteEl.closest(".bible-modal") || document.body;
    const modalRect = modal.getBoundingClientRect();
    const iconRect = footnoteIcon.getBoundingClientRect();

    content.style.position = "fixed";
    content.style.display = "block";

    const contentRect = content.getBoundingClientRect();
    const tooltipW = contentRect.width;
    const tooltipH = contentRect.height;

    let top = iconRect.top - tooltipH - 8;
    if (top < modalRect.top + 8) {
      top = iconRect.bottom + 8;
    }
    if (top + tooltipH > modalRect.bottom - 8) {
      top = modalRect.bottom - tooltipH - 8;
    }

    let left = iconRect.left + iconRect.width / 2 - tooltipW / 2;
    if (left < modalRect.left + 8) {
      left = modalRect.left + 8;
    }
    if (left + tooltipW > modalRect.right - 8) {
      left = modalRect.right - tooltipW - 8;
    }

    content.style.top = `${Math.round(top)}px`;
    content.style.left = `${Math.round(left)}px`;
    content.style.right = "auto";
    content.style.bottom = "auto";
    content.style.transform = "none";
    content.style.zIndex = "200";
  }, [activeFootnote]);

  useEffect(() => {
    if (!activeFootnote) return;
    function handleOutsideClick(e: MouseEvent) {
      if (activeFootnote && !activeFootnote.contains(e.target as Node)) {
        activeFootnote.classList.remove("bible-footnote--active");
        setActiveFootnote(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick as EventListener);
    };
  }, [activeFootnote]);

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

  if (!htmlContent) {
    return (
      <div className="bible-content">
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
          Selecione um livro e capítulo para iniciar a leitura.
        </p>
      </div>
    );
  }

  const textSize = FONT_SIZE_MAP[fontSize];
  const footnoteSize = FOOTNOTE_SIZE_MAP[fontSize];

  return (
    <div className="bible-content">
      <h2 className="bible-content-title">{reference}</h2>
      {noResults && (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
          Nenhum versículo encontrado.
        </p>
      )}
      <div
        ref={contentRef}
        className="bible-content-text"
        style={{
          fontSize: `${textSize}px`,
          lineHeight: `${textSize * 1.7}px`,
          ["--footnote-size" as string]: `${footnoteSize}px`,
        }}
        onClick={handleFootnoteClick}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
