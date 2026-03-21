"use client";

import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

interface BibleNavigationProps {
  currentBookCode: string;
  currentChapter: number;
  onNavigate: (bookCode: string, chapter: number) => void;
}

export function BibleNavigation({
  currentBookCode,
  currentChapter,
  onNavigate,
}: BibleNavigationProps) {
  const currentBook = BIBLE_BOOKS.find((b) => b.code === currentBookCode);
  const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === currentBookCode);

  const isFirstChapterOfFirstBook = currentBookCode === "GEN" && currentChapter <= 1;
  const isLastChapterOfLastBook =
    currentBookCode === "REV" && currentChapter >= (currentBook?.chapters || 22);

  function handlePrevious() {
    if (isFirstChapterOfFirstBook) return;

    if (currentChapter > 1) {
      onNavigate(currentBookCode, currentChapter - 1);
    } else {
      // Ir para último capítulo do livro anterior
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      if (prevBook) {
        onNavigate(prevBook.code, prevBook.chapters);
      }
    }
  }

  function handleNext() {
    if (isLastChapterOfLastBook) return;

    if (currentBook && currentChapter < currentBook.chapters) {
      onNavigate(currentBookCode, currentChapter + 1);
    } else {
      // Ir para primeiro capítulo do próximo livro
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      if (nextBook) {
        onNavigate(nextBook.code, 1);
      }
    }
  }

  // Calcular labels
  let prevLabel = "";
  let nextLabel = "";

  if (!isFirstChapterOfFirstBook) {
    if (currentChapter > 1) {
      prevLabel = `${currentBook?.name} ${currentChapter - 1}`;
    } else {
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      if (prevBook) prevLabel = `${prevBook.name} ${prevBook.chapters}`;
    }
  }

  if (!isLastChapterOfLastBook) {
    if (currentBook && currentChapter < currentBook.chapters) {
      nextLabel = `${currentBook.name} ${currentChapter + 1}`;
    } else {
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      if (nextBook) nextLabel = `${nextBook.name} 1`;
    }
  }

  return (
    <div className="bible-navigation">
      <button
        className="bible-nav-btn"
        onClick={handlePrevious}
        disabled={isFirstChapterOfFirstBook}
        aria-label={prevLabel ? `Ir para ${prevLabel}` : "Início da Bíblia"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{prevLabel || "Anterior"}</span>
      </button>

      <button
        className="bible-nav-btn"
        onClick={handleNext}
        disabled={isLastChapterOfLastBook}
        aria-label={nextLabel ? `Ir para ${nextLabel}` : "Fim da Bíblia"}
      >
        <span>{nextLabel || "Próximo"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
