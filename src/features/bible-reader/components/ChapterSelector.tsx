"use client";

interface ChapterSelectorProps {
  totalChapters: number;
  selectedChapter: number;
  onSelect: (chapter: number) => void;
}

export function ChapterSelector({
  totalChapters,
  selectedChapter,
  onSelect,
}: ChapterSelectorProps) {
  return (
    <div className="bible-chapter-grid" role="listbox" aria-label="Selecionar capítulo">
      {Array.from({ length: totalChapters }, (_, i) => i + 1).map((chapter) => {
        const isSelected = chapter === selectedChapter;
        return (
          <button
            key={chapter}
            className={`bible-chapter-item ${isSelected ? "bible-chapter-item--selected" : ""}`}
            onClick={() => onSelect(chapter)}
            role="option"
            aria-selected={isSelected}
            aria-label={`Capítulo ${chapter}`}
          >
            {chapter}
          </button>
        );
      })}
    </div>
  );
}
