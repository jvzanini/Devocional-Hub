"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";

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
  currentVerse?: number | null;
  isSearchActive?: boolean;
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
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-") // normalizar hífens Unicode → ASCII
    .replace(/[^\w\s-]/g, "") // manter hífens no texto
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

/** Aplica highlight em um array de text nodes (cross-node: matches podem cruzar fronteiras) */
function highlightNodes(textNodes: Text[], query: string) {
  if (textNodes.length === 0) return;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flexible = escaped
    .replace(/-/g, "[-\u2010\u2011\u2012\u2013\u2014\u2015]")
    .replace(/ /g, "\\s+");
  const regex = new RegExp(`(${flexible})`, "gi");

  const nodeRanges: { start: number; end: number; node: Text }[] = [];
  let totalLen = 0;
  for (const node of textNodes) {
    const len = (node.textContent || "").length;
    nodeRanges.push({ start: totalLen, end: totalLen + len, node });
    totalLen += len;
  }
  const combined = textNodes.map(n => n.textContent || "").join("");

  const matchRanges: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(combined)) !== null) {
    matchRanges.push({ start: m.index, end: m.index + m[0].length });
  }
  if (matchRanges.length === 0) return;

  const nodeHighlights = new Map<number, { start: number; end: number }[]>();
  for (const match of matchRanges) {
    for (let i = 0; i < nodeRanges.length; i++) {
      const nr = nodeRanges[i];
      const overlapStart = Math.max(match.start, nr.start);
      const overlapEnd = Math.min(match.end, nr.end);
      if (overlapStart >= overlapEnd) continue;
      if (!nodeHighlights.has(i)) nodeHighlights.set(i, []);
      nodeHighlights.get(i)!.push({ start: overlapStart - nr.start, end: overlapEnd - nr.start });
    }
  }

  const sortedIndices = Array.from(nodeHighlights.keys()).sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    const ranges = nodeHighlights.get(idx)!;
    const textNode = nodeRanges[idx].node;
    const text = textNode.textContent || "";
    ranges.sort((a, b) => a.start - b.start);

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, range.start)));
      }
      const mark = document.createElement("mark");
      mark.setAttribute("data-search-hl", "1");
      mark.style.background = "var(--accent)";
      mark.style.color = "#000";
      mark.style.borderRadius = "2px";
      mark.style.padding = "0 2px";
      mark.textContent = text.slice(range.start, range.end);
      fragment.appendChild(mark);
      cursor = range.end;
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

/** Coleta text nodes elegíveis de um elemento (pula footnotes e verse numbers) */
function collectTextNodes(element: Element): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest(".bible-footnote")) continue;
    if (node.parentElement?.closest("sup.v")) continue;
    if (node.parentElement?.tagName === "MARK") continue;
    nodes.push(node);
  }
  return nodes;
}

export function BibleContent({
  reference,
  htmlContent,
  isLoading,
  error,
  searchQuery,
  fontSize = "normal",
  currentVerse,
  isSearchActive,
}: BibleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [noResults, setNoResults] = useState(false);
  const [activeFootnote, setActiveFootnote] = useState<HTMLElement | null>(null);

  // ─── Posicionar indicador de leitura acompanhada ───────────────────────────
  useEffect(() => {
    const container = contentRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    if (!currentVerse || isSearchActive) {
      indicator.style.opacity = "0";
      return;
    }

    const verseEl = container.querySelector(`[data-verse="${currentVerse}"]`);
    if (!verseEl) {
      indicator.style.opacity = "0";
      return;
    }

    const wrapper = indicator.parentElement;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const rects = verseEl.getClientRects();

    if (rects.length === 0) {
      indicator.style.opacity = "0";
      return;
    }

    const firstRect = rects[0];
    const top = firstRect.top - wrapperRect.top;

    // Medir altura até o próximo versículo para cobrir blocos intermediários
    // (poesia, quebras de linha, etc. que são irmãos do span do versículo)
    const allVerses = container.querySelectorAll("[data-verse]");
    let nextVerseEl: Element | null = null;
    let foundCurrent = false;
    for (const v of allVerses) {
      if (v.getAttribute("data-verse") === String(currentVerse)) {
        foundCurrent = true;
        continue;
      }
      if (foundCurrent) {
        nextVerseEl = v;
        break;
      }
    }

    let height: number;
    if (nextVerseEl) {
      const nextRects = nextVerseEl.getClientRects();
      if (nextRects.length > 0) {
        height = nextRects[0].top - firstRect.top;
      } else {
        const lastRect = rects[rects.length - 1];
        height = (lastRect.top + lastRect.height) - firstRect.top;
      }
    } else {
      // Último versículo: medir até o fim do conteúdo
      const containerRect = container.getBoundingClientRect();
      height = (containerRect.top + containerRect.height) - firstRect.top;
    }

    indicator.style.top = `${top}px`;
    indicator.style.height = `${Math.max(height, 8)}px`;
    indicator.style.opacity = "1";
  }, [currentVerse, htmlContent, fontSize, isSearchActive]);

  const processSearch = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;

    // Restaurar orphan text nodes envolvidos em spans de busca anterior
    container.querySelectorAll(".bible-orphan-text").forEach((wrapper) => {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        parent?.insertBefore(wrapper.firstChild, wrapper);
      }
      parent?.removeChild(wrapper);
      parent?.normalize();
    });

    clearHighlights(container);

    // Resetar visibilidade de TODOS os elementos + container
    container.style.display = "";
    container.querySelectorAll<HTMLElement>(
      ".bible-verse, .bible-section-title, .bible-description, .bible-reference, .bible-break, .bible-paragraph, .bible-poetry-1, .bible-poetry-2, .bible-footnote"
    ).forEach((el) => {
      el.style.display = "";
    });
    setNoResults(false);

    if (!searchQuery || searchQuery.length < 2) return;

    const normalizedQuery = normalizeForSearch(searchQuery);
    if (!normalizedQuery) return;

    const verseSpans = Array.from(container.querySelectorAll<HTMLElement>(".bible-verse"));
    if (verseSpans.length === 0) return;

    let hasVisible = false;

    verseSpans.forEach((span, index) => {
      const textsWithoutFootnotes: string[] = [];

      // 1. Texto dentro do span do versículo (excluindo footnote-content)
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.parentElement?.closest(".bible-footnote-content")) continue;
        textsWithoutFootnotes.push(node.textContent || "");
      }

      // 2. Texto órfão: siblings entre este verso e o próximo
      //    (YouVersion coloca texto após footnotes fora do span do versículo)
      const nextVerse = index < verseSpans.length - 1 ? verseSpans[index + 1] : null;
      let sibling: Node | null = span.nextSibling;
      while (sibling) {
        if (sibling === nextVerse) break;
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const el = sibling as Element;
          if (el.classList?.contains("bible-verse")) break;
          const subWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          while (subWalker.nextNode()) {
            const t = subWalker.currentNode as Text;
            if (!t.parentElement?.closest(".bible-footnote-content")) {
              textsWithoutFootnotes.push(t.textContent || "");
            }
          }
        } else if (sibling.nodeType === Node.TEXT_NODE) {
          textsWithoutFootnotes.push(sibling.textContent || "");
        }
        sibling = sibling.nextSibling;
      }

      const fullText = textsWithoutFootnotes.join(" ");
      const normalizedText = normalizeForSearch(fullText);

      if (normalizedText.includes(normalizedQuery)) {
        span.style.display = "";
        hasVisible = true;
        // Coletar TODOS os text nodes do verso + siblings órfãos em uma passada única
        // (permite highlight cross-node quando match cruza fronteira de footnote órfão)
        const allTextNodes: Text[] = [...collectTextNodes(span)];
        const nextV = index < verseSpans.length - 1 ? verseSpans[index + 1] : null;
        let sib: Node | null = span.nextSibling;
        while (sib) {
          if (sib === nextV) break;
          if (sib.nodeType === Node.TEXT_NODE) {
            allTextNodes.push(sib as Text);
          } else if (sib.nodeType === Node.ELEMENT_NODE) {
            const el = sib as Element;
            if (el.classList?.contains("bible-verse")) break;
            allTextNodes.push(...collectTextNodes(el));
          }
          sib = sib.nextSibling;
        }
        highlightNodes(allTextNodes, searchQuery);
      } else {
        span.style.display = "none";
      }
    });

    // Esconder títulos de seção, descrições, referências e breaks
    container.querySelectorAll<HTMLElement>(
      ".bible-section-title, .bible-description, .bible-reference, .bible-break"
    ).forEach((el) => { el.style.display = "none"; });

    // Esconder containers que não têm versículo visível
    container.querySelectorAll<HTMLElement>(
      ".bible-paragraph, .bible-poetry-1, .bible-poetry-2"
    ).forEach((el) => {
      const hasVisibleVerse = Array.from(el.querySelectorAll(".bible-verse")).some(
        (v) => (v as HTMLElement).style.display !== "none"
      );
      if (!hasVisibleVerse) el.style.display = "none";
    });

    // Footnotes: associar ao versículo anterior (podem ser siblings, não filhos)
    container.querySelectorAll<HTMLElement>(".bible-footnote").forEach((el) => {
      const parentVerse = el.closest(".bible-verse") as HTMLElement | null;
      if (parentVerse) {
        if (parentVerse.style.display === "none") el.style.display = "none";
        return;
      }
      let prev = el.previousElementSibling;
      while (prev && !prev.classList.contains("bible-verse")) {
        prev = prev.previousElementSibling;
      }
      if (!prev || (prev as HTMLElement).style.display === "none") {
        el.style.display = "none";
      }
    });

    // Esconder text nodes órfãos de versículos ocultos
    // (text nodes não aceitam display:none — envolver em span oculto)
    verseSpans.forEach((span, index) => {
      if (span.style.display !== "none") return;
      const nextV = index < verseSpans.length - 1 ? verseSpans[index + 1] : null;
      let sib: Node | null = span.nextSibling;
      while (sib) {
        if (sib === nextV) break;
        if (sib.nodeType === Node.ELEMENT_NODE) {
          const el = sib as Element;
          if (el.classList?.contains("bible-verse")) break;
        }
        if (sib.nodeType === Node.TEXT_NODE && sib.textContent?.trim()) {
          const wrapper = document.createElement("span");
          wrapper.className = "bible-orphan-text";
          wrapper.style.display = "none";
          sib.parentNode?.insertBefore(wrapper, sib);
          wrapper.appendChild(sib);
          sib = wrapper.nextSibling;
          continue;
        }
        sib = sib.nextSibling;
      }
    });

    // Se não encontrou nada, esconder o container inteiro (fix texto órfão visível)
    if (!hasVisible) {
      container.style.display = "none";
    }

    // Scroll para cima ao buscar (para resultados serem visíveis)
    const scrollParent = container.closest(".bible-modal-body");
    if (scrollParent) scrollParent.scrollTo({ top: 0, behavior: "smooth" });

    setNoResults(!hasVisible);
  }, [searchQuery]);

  useEffect(() => {
    if (!contentRef.current || !htmlContent) return;
    const timer = requestAnimationFrame(() => processSearch());
    return () => cancelAnimationFrame(timer);
  }, [searchQuery, htmlContent, processSearch]);

  // Safeguard: re-aplicar filtro caso o DOM tenha sido resetado pelo React (ex: collapse/expand player)
  useLayoutEffect(() => {
    if (!contentRef.current || !htmlContent || !searchQuery || searchQuery.length < 2) return;
    const container = contentRef.current;
    const hasFilterMarks = container.querySelector('mark[data-search-hl="1"]');
    const hasHiddenVerses = container.querySelector('.bible-verse[style*="display: none"]');
    const isContainerHidden = container.style.display === "none";
    if (!hasFilterMarks && !hasHiddenVerses && !isContainerHidden) {
      processSearch();
    }
  });

  // ─── Posicionar tooltip dentro dos limites do modal (fixed) ─────────────────
  const positionTooltip = useCallback((footnoteEl: HTMLElement) => {
    const icon = footnoteEl.querySelector(".bible-footnote-icon") as HTMLElement;
    const content = footnoteEl.querySelector(".bible-footnote-content") as HTMLElement;
    if (!icon || !content) return;

    const modal = footnoteEl.closest(".bible-modal") || document.body;
    const modalRect = modal.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    // Setup: fixed + maxWidth restrito ao modal
    content.style.position = "fixed";
    content.style.display = "block";
    content.style.pointerEvents = "auto";
    content.style.right = "auto";
    content.style.bottom = "auto";
    content.style.transform = "none";
    content.style.zIndex = "200";
    content.style.maxWidth = `${modalRect.width - 24}px`;

    // Medir após reflow com maxWidth aplicado
    const tooltipW = content.offsetWidth;
    const tooltipH = content.offsetHeight;

    // Vertical: acima do ícone, fallback abaixo
    let top = iconRect.top - tooltipH - 8;
    if (top < modalRect.top + 8) top = iconRect.bottom + 8;
    if (top + tooltipH > modalRect.bottom - 8) top = modalRect.bottom - tooltipH - 8;

    // Horizontal: centralizado no ícone, clampado ao modal
    let left = iconRect.left + iconRect.width / 2 - tooltipW / 2;
    if (left < modalRect.left + 12) left = modalRect.left + 12;
    if (left + tooltipW > modalRect.right - 12) left = modalRect.right - tooltipW - 12;

    content.style.top = `${Math.round(top)}px`;
    content.style.left = `${Math.round(left)}px`;
  }, []);

  const hideTooltip = useCallback((footnoteEl: HTMLElement) => {
    const content = footnoteEl.querySelector(".bible-footnote-content") as HTMLElement;
    if (content) content.style.display = "none";
    footnoteEl.classList.remove("bible-footnote--active");
  }, []);

  const handleFootnoteClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Ignorar cliques no conteúdo do tooltip
    if (target.closest(".bible-footnote-content")) return;

    const footnoteEl = target.closest(".bible-footnote") as HTMLElement;

    if (!footnoteEl) {
      if (activeFootnote) {
        hideTooltip(activeFootnote);
        setActiveFootnote(null);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (activeFootnote && activeFootnote !== footnoteEl) {
      hideTooltip(activeFootnote);
    }

    const isActive = footnoteEl.classList.contains("bible-footnote--active");
    if (isActive) {
      hideTooltip(footnoteEl);
      setActiveFootnote(null);
      return;
    }

    footnoteEl.classList.add("bible-footnote--active");
    setActiveFootnote(footnoteEl);
    positionTooltip(footnoteEl);
  }, [activeFootnote, positionTooltip, hideTooltip]);

  // ─── Hover handling (desktop) — posiciona via JS em vez de CSS ────────────
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Ignorar mouse events sintéticos disparados por touch (causa flash no mobile)
    let lastTouchTime = 0;
    function handleTouchStart() { lastTouchTime = Date.now(); }

    function handleMouseOver(e: MouseEvent) {
      if (Date.now() - lastTouchTime < 500) return; // ignorar mouse após touch
      const icon = (e.target as HTMLElement).closest(".bible-footnote-icon");
      if (!icon) return;
      const footnoteEl = icon.closest(".bible-footnote") as HTMLElement;
      if (!footnoteEl || footnoteEl.classList.contains("bible-footnote--active")) return;
      positionTooltip(footnoteEl);
    }

    function handleMouseOut(e: MouseEvent) {
      if (Date.now() - lastTouchTime < 500) return;
      const footnoteEl = (e.target as HTMLElement).closest(".bible-footnote") as HTMLElement;
      if (!footnoteEl || footnoteEl.classList.contains("bible-footnote--active")) return;
      const related = e.relatedTarget as HTMLElement;
      if (related && footnoteEl.contains(related)) return;
      const content = footnoteEl.querySelector(".bible-footnote-content") as HTMLElement;
      if (content) content.style.display = "none";
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("mouseover", handleMouseOver);
    container.addEventListener("mouseout", handleMouseOut);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("mouseover", handleMouseOver);
      container.removeEventListener("mouseout", handleMouseOut);
    };
  }, [htmlContent, positionTooltip]);

  // ─── Fechar tooltip ao clicar fora ────────────────────────────────────────
  useEffect(() => {
    if (!activeFootnote) return;
    function handleOutsideClick(e: MouseEvent) {
      if (activeFootnote && !activeFootnote.contains(e.target as Node)) {
        hideTooltip(activeFootnote);
        setActiveFootnote(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick as EventListener);
    };
  }, [activeFootnote, hideTooltip]);

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
    <div className="bible-content" style={{ position: "relative" }}>
      <h2 className="bible-content-title">{reference}</h2>
      {noResults && (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
          Nenhum versículo encontrado.
        </p>
      )}
      <div
        ref={indicatorRef}
        className="bible-verse-indicator"
      />
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
