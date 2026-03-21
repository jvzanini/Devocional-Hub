"use client";

import { useState, useEffect, useRef } from "react";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";
import { ChapterSelector } from "./ChapterSelector";

interface BookSelectorProps {
  selectedBookCode: string;
  selectedChapter: number;
  onSelect: (bookCode: string, chapter: number) => void;
  onClose: () => void;
  isMobile: boolean;
}

export function BookSelector({
  selectedBookCode,
  selectedChapter,
  onSelect,
  onClose,
  isMobile,
}: BookSelectorProps) {
  const [expandedBook, setExpandedBook] = useState<string | null>(selectedBookCode);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedBookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll para o livro selecionado
    setTimeout(() => {
      selectedBookRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isMobile) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMobile, onClose]);

  const atBooks = BIBLE_BOOKS.filter((b) => b.testament === "AT");
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === "NT");

  function handleBookClick(code: string) {
    setExpandedBook(expandedBook === code ? null : code);
  }

  function handleChapterSelect(bookCode: string, chapter: number) {
    onSelect(bookCode, chapter);
    onClose();
  }

  function renderBookList(books: typeof BIBLE_BOOKS, label: string, isFirst: boolean) {
    return (
      <div className="bible-book-section" style={{
        marginBottom: 24,
        paddingTop: isFirst ? 0 : 20,
        borderTop: isFirst ? "none" : "2px solid var(--border, rgba(128,128,128,0.2))",
      }}>
        <h4 className="bible-book-section-title" style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginBottom: 12,
          padding: "6px 10px",
          borderRadius: 6,
          background: "var(--surface-hover, rgba(128,128,128,0.08))",
        }}>{label}</h4>
        {books.map((book) => {
          const isExpanded = expandedBook === book.code;
          const isSelected = book.code === selectedBookCode;
          return (
            <div
              key={book.code}
              ref={isSelected ? selectedBookRef : undefined}
              className="bible-book-group"
            >
              <button
                className={`bible-book-item ${isSelected ? "bible-book-item--selected" : ""}`}
                onClick={() => handleBookClick(book.code)}
                aria-expanded={isExpanded}
                aria-label={`${book.name} — ${book.chapters} capítulos`}
                style={{ fontSize: 15, padding: "10px 12px" }}
              >
                <span className="bible-book-name">{book.name}</span>
                <span className="bible-book-chapters-count" style={{ fontSize: 13 }}>{book.chapters} cap.</span>
                <svg
                  className={`bible-book-chevron ${isExpanded ? "bible-book-chevron--open" : ""}`}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div style={{
                overflow: "hidden",
                maxHeight: isExpanded ? 500 : 0,
                transition: "max-height 0.3s ease-in-out",
              }}>
                <div className="bible-book-chapters">
                  <ChapterSelector
                    totalChapters={book.chapters}
                    selectedChapter={isSelected ? selectedChapter : 0}
                    onSelect={(ch) => handleChapterSelect(book.code, ch)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`bible-selector-overlay ${isMobile ? "bible-selector-overlay--mobile" : ""}`}>
      {isMobile && (
        <div className="bible-selector-backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <div
        ref={containerRef}
        className={`bible-selector bible-selector--books ${isMobile ? "bible-selector--sheet" : "bible-selector--dropdown"}`}
        role="listbox"
        aria-label="Selecionar livro e capítulo"
      >
        <div className="bible-selector-header">
          <h3>Livro e Capítulo</h3>
          <button className="bible-selector-close" onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bible-selector-list bible-selector-list--books">
          {renderBookList(atBooks, "Antigo Testamento", true)}
          {renderBookList(ntBooks, "Novo Testamento", false)}
        </div>
      </div>
    </div>
  );
}
