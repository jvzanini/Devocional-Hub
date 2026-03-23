"use client";

export type FontSizeLevel = "normal" | "medium" | "large";

interface BibleHeaderProps {
  bookName: string;
  chapter: number;
  versionAbbr: string;
  onBookClick: () => void;
  onVersionClick: () => void;
  onClose: () => void;
  onSearchToggle?: () => void;
  fontSize?: FontSizeLevel;
  onFontSizeToggle?: () => void;
}

export function BibleHeader({
  bookName,
  chapter,
  versionAbbr,
  onBookClick,
  onVersionClick,
  onClose,
  onSearchToggle,
  fontSize = "normal",
  onFontSizeToggle,
}: BibleHeaderProps) {
  return (
    <div className="bible-header">
      <div className="bible-header-left">
        <button
          className="bible-header-btn bible-header-btn--book"
          onClick={onBookClick}
          aria-label={`${bookName} ${chapter} — clique para trocar`}
        >
          <span className="bible-header-btn-text">
            {bookName} {chapter}
          </span>
          <svg className="bible-header-btn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          className="bible-header-btn bible-header-btn--version"
          onClick={onVersionClick}
          aria-label={`Versão ${versionAbbr} — clique para trocar`}
        >
          <span className="bible-header-btn-text">
            {versionAbbr}
          </span>
          <svg className="bible-header-btn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="bible-header-right">
        {onSearchToggle && (
          <button
            className="bible-header-icon-btn"
            onClick={onSearchToggle}
            aria-label="Buscar no capítulo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        )}

        {onFontSizeToggle && (
          <button
            className="bible-header-icon-btn"
            onClick={onFontSizeToggle}
            aria-label={`Tamanho da fonte: ${fontSize === "normal" ? "normal" : fontSize === "medium" ? "médio" : "grande"}`}
            style={{
              fontWeight: 700,
              fontSize: fontSize === "large" ? 16 : fontSize === "medium" ? 14 : 12,
              letterSpacing: "-0.5px",
              minWidth: 32,
              textAlign: "center",
            }}
          >
            Aa
          </button>
        )}

        <button
          className="bible-header-icon-btn"
          onClick={onClose}
          aria-label="Fechar Bíblia"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
