"use client";

interface BibleHeaderProps {
  bookName: string;
  chapter: number;
  versionAbbr: string;
  audioAvailable: boolean;
  onBookClick: () => void;
  onVersionClick: () => void;
  onAudioToggle: () => void;
  onClose: () => void;
  isAudioPlaying: boolean;
}

export function BibleHeader({
  bookName,
  chapter,
  versionAbbr,
  audioAvailable,
  onBookClick,
  onVersionClick,
  onAudioToggle,
  onClose,
  isAudioPlaying,
}: BibleHeaderProps) {
  return (
    <div className="bible-header">
      <div className="bible-header-left">
        <button
          className="bible-header-btn bible-header-btn--book"
          onClick={onBookClick}
          aria-label={`${bookName} ${chapter} — clique para trocar`}
        >
          {bookName} {chapter}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          className="bible-header-btn bible-header-btn--version"
          onClick={onVersionClick}
          aria-label={`Versão ${versionAbbr} — clique para trocar`}
        >
          {versionAbbr}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="bible-header-right">
        {audioAvailable && (
          <button
            className={`bible-header-icon-btn ${isAudioPlaying ? "bible-header-icon-btn--active" : ""}`}
            onClick={onAudioToggle}
            aria-label={isAudioPlaying ? "Pausar áudio" : "Reproduzir áudio"}
          >
            {isAudioPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
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
