"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BIBLE_BOOKS, findBookByCode } from "@/features/bible/lib/bible-books";
import { getAudioManager } from "../lib/audio-manager";
import type { DiscoveredVersion } from "../lib/version-discovery";
import { BibleHeader } from "./BibleHeader";
import { VersionSelector } from "./VersionSelector";
import { BookSelector } from "./BookSelector";
import { BibleContent } from "./BibleContent";
import { BibleNavigation } from "./BibleNavigation";
import { AudioPlayer } from "./AudioPlayer";

interface BibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBookCode?: string;
  initialChapter?: number;
  initialVersionId?: string;
}

export function BibleModal({
  isOpen,
  onClose,
  initialBookCode = "GEN",
  initialChapter = 1,
  initialVersionId,
}: BibleModalProps) {
  // State
  const [versions, setVersions] = useState<DiscoveredVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DiscoveredVersion | null>(null);
  const [bookCode, setBookCode] = useState(initialBookCode);
  const [chapter, setChapter] = useState(initialChapter);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [copyright, setCopyright] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeSelector, setActiveSelector] = useState<"version" | "book" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Detectar mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Inicializar com valores do contexto devocional
  useEffect(() => {
    if (isOpen) {
      setBookCode(initialBookCode);
      setChapter(initialChapter);
    }
  }, [isOpen, initialBookCode, initialChapter]);

  // Carregar versões
  useEffect(() => {
    if (!isOpen) return;
    async function loadVersions() {
      try {
        const res = await fetch("/api/bible/versions");
        const data = await res.json();
        if (data.versions && data.versions.length > 0) {
          setVersions(data.versions);
          const defaultVersion = initialVersionId
            ? data.versions.find((v: DiscoveredVersion) => v.id === initialVersionId)
            : data.versions.find((v: DiscoveredVersion) => v.abbreviation === "NVI");
          setSelectedVersion(defaultVersion || data.versions[0]);
        }
      } catch (err) {
        console.error("[BibleModal] Erro ao carregar versões:", err);
      }
    }
    loadVersions();
  }, [isOpen, initialVersionId]);

  // Carregar conteúdo do capítulo
  useEffect(() => {
    if (!isOpen || !selectedVersion) return;

    async function loadContent() {
      setIsLoading(true);
      setError(null);
      setHtmlContent(null);

      const chapterId = `${bookCode}.${chapter}`;

      try {
        const res = await fetch(`/api/bible/content/${selectedVersion!.id}/${chapterId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        setHtmlContent(data.content?.content || "");
        setCopyright(data.content?.copyright || "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[BibleModal] Erro ao carregar conteúdo:", msg);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [isOpen, selectedVersion, bookCode, chapter]);

  // Carregar áudio
  useEffect(() => {
    if (!isOpen || !selectedVersion) return;

    async function loadAudio() {
      const chapterId = `${bookCode}.${chapter}`;
      try {
        const res = await fetch(`/api/bible/audio/${selectedVersion!.id}/${chapterId}`);
        const data = await res.json();
        setAudioUrl(data.audioUrl || null);
        setAudioAvailable(data.available || false);
      } catch {
        setAudioUrl(null);
        setAudioAvailable(false);
      }
    }

    loadAudio();
  }, [isOpen, selectedVersion, bookCode, chapter]);

  // Monitorar estado do áudio
  useEffect(() => {
    const manager = getAudioManager();
    const unsub = manager.subscribe((state) => {
      setIsAudioPlaying(state.isPlaying);
    });
    return unsub;
  }, []);

  // ESC para fechar (desktop)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery("");
        } else if (!activeSelector) {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSelector, isSearchOpen, onClose]);

  // Cleanup áudio ao fechar
  useEffect(() => {
    if (!isOpen) {
      getAudioManager().stop();
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Travar scroll do body (fix para mobile — evita vazamento do dashboard)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [isOpen]);

  const handleNavigate = useCallback((newBookCode: string, newChapter: number) => {
    setBookCode(newBookCode);
    setChapter(newChapter);
    setActiveSelector(null);
  }, []);

  const handleAudioToggle = useCallback(() => {
    const manager = getAudioManager();
    manager.togglePlayPause();
  }, []);

  const handlePreviousChapter = useCallback(() => {
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);

    if (chapter > 1) {
      setChapter(chapter - 1);
    } else if (currentBookIndex > 0) {
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      setBookCode(prevBook.code);
      setChapter(prevBook.chapters);
    }
  }, [bookCode, chapter]);

  const handleNextChapter = useCallback(() => {
    const currentBook = BIBLE_BOOKS.find((b) => b.code === bookCode);
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);

    if (currentBook && chapter < currentBook.chapters) {
      setChapter(chapter + 1);
    } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      setBookCode(nextBook.code);
      setChapter(1);
    }
  }, [bookCode, chapter]);

  if (!isOpen) return null;

  const currentBook = findBookByCode(bookCode);
  const bookName = currentBook?.name || bookCode;
  const reference = `${bookName} ${chapter}`;

  return (
    <div
      className="bible-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMobile) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`bible-modal ${isMobile ? "bible-modal--fullscreen" : ""}`}
      >
        <BibleHeader
          bookName={bookName}
          chapter={chapter}
          versionAbbr={selectedVersion?.abbreviation || "..."}
          audioAvailable={audioAvailable}
          onBookClick={() => setActiveSelector(activeSelector === "book" ? null : "book")}
          onVersionClick={() => setActiveSelector(activeSelector === "version" ? null : "version")}
          onAudioToggle={handleAudioToggle}
          onClose={onClose}
          isAudioPlaying={isAudioPlaying}
          onSearchToggle={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery("");
          }}
        />

        {/* Busca no capítulo */}
        {isSearchOpen && (
          <div className="bible-search-bar">
            <input
              type="text"
              placeholder="Buscar no capítulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: "var(--surface-hover, rgba(128,128,128,0.1))",
                border: "1px solid var(--border, rgba(128,128,128,0.2))",
                borderRadius: 8,
                padding: "8px 12px",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                padding: 8,
                cursor: "pointer",
              }}
              aria-label="Fechar busca"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {activeSelector === "version" && selectedVersion && (
          <VersionSelector
            versions={versions}
            selectedId={selectedVersion.id}
            onSelect={(v) => setSelectedVersion(v)}
            onClose={() => setActiveSelector(null)}
            isMobile={isMobile}
          />
        )}

        {activeSelector === "book" && (
          <BookSelector
            selectedBookCode={bookCode}
            selectedChapter={chapter}
            onSelect={handleNavigate}
            onClose={() => setActiveSelector(null)}
            isMobile={isMobile}
          />
        )}

        <div className="bible-modal-body" ref={contentRef}>
          <BibleContent
            reference={reference}
            htmlContent={htmlContent}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
          />
        </div>

        <div className="bible-modal-footer">
          {/* Navegação capítulo + player */}
          {!isPlayerCollapsed && (
            <>
              <BibleNavigation
                currentBookCode={bookCode}
                currentChapter={chapter}
                onNavigate={handleNavigate}
              />
              <AudioPlayer
                audioUrl={audioUrl}
                audioAvailable={audioAvailable}
                copyright={copyright}
                onPrevious={handlePreviousChapter}
                onNext={handleNextChapter}
                onCollapse={() => setIsPlayerCollapsed(true)}
              />
            </>
          )}

          {/* Player colapsado — controles flutuantes */}
          {isPlayerCollapsed && audioAvailable && (
            <div className="bible-player-collapsed">
              <button
                className="bible-player-collapsed-btn"
                onClick={handlePreviousChapter}
                aria-label="Capítulo anterior"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>

              <button
                className="bible-player-collapsed-btn bible-player-collapsed-btn--play"
                onClick={handleAudioToggle}
                aria-label={isAudioPlaying ? "Pausar" : "Reproduzir"}
              >
                {isAudioPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                className="bible-player-collapsed-btn"
                onClick={handleNextChapter}
                aria-label="Próximo capítulo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>

              <button
                className="bible-player-collapsed-expand"
                onClick={() => setIsPlayerCollapsed(false)}
                aria-label="Expandir controles de áudio"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Botão expandir quando colapsado sem áudio */}
          {isPlayerCollapsed && !audioAvailable && (
            <div className="bible-player-collapsed">
              <BibleNavigation
                currentBookCode={bookCode}
                currentChapter={chapter}
                onNavigate={handleNavigate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
