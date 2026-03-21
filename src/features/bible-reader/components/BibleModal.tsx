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

const CACHE_KEY = "devhub-bible-position";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CachedPosition {
  bookCode: string;
  chapter: number;
  versionId: string;
  audioTime: number;
  timestamp: number;
}

function savePosition(pos: Omit<CachedPosition, "timestamp">) {
  try {
    const data: CachedPosition = { ...pos, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function loadPosition(): CachedPosition | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachedPosition = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

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
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(true); // T5: inicia colapsado
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Detectar mobile
  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768); }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // T9: Restaurar posição salva OU usar contexto devocional
  useEffect(() => {
    if (isOpen) {
      const cached = loadPosition();
      if (cached) {
        setBookCode(cached.bookCode);
        setChapter(cached.chapter);
        if (cached.audioTime > 0) {
          setPendingSeekTime(cached.audioTime);
        }
      } else {
        setBookCode(initialBookCode);
        setChapter(initialChapter);
      }
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
          // T9: tentar restaurar versão do cache
          const cached = loadPosition();
          const cachedVersion = cached
            ? data.versions.find((v: DiscoveredVersion) => v.id === cached.versionId)
            : null;
          const defaultVersion = cachedVersion
            || (initialVersionId ? data.versions.find((v: DiscoveredVersion) => v.id === initialVersionId) : null)
            || data.versions.find((v: DiscoveredVersion) => v.abbreviation === "NVI")
            || data.versions[0];
          setSelectedVersion(defaultVersion);
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
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        setHtmlContent(data.content?.content || "");
        setCopyright(data.content?.copyright || "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    // T9: salvar posição ao navegar
    if (selectedVersion) {
      savePosition({ bookCode, chapter, versionId: selectedVersion.id, audioTime: 0 });
    }
  }, [isOpen, selectedVersion, bookCode, chapter]);

  // Carregar áudio (sem autoplay — T5)
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

  // T9: salvar posição do áudio periodicamente
  useEffect(() => {
    if (!isOpen || !audioAvailable) return;
    const interval = setInterval(() => {
      const manager = getAudioManager();
      const state = manager.getState();
      if (state.currentTime > 0 && selectedVersion) {
        savePosition({
          bookCode, chapter,
          versionId: selectedVersion.id,
          audioTime: state.currentTime,
        });
      }
    }, 5000); // salvar a cada 5s
    return () => clearInterval(interval);
  }, [isOpen, audioAvailable, bookCode, chapter, selectedVersion]);

  // ESC para fechar
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

  // T9: Salvar posição ao fechar e parar áudio
  useEffect(() => {
    if (!isOpen) {
      const manager = getAudioManager();
      const state = manager.getState();
      if (state.currentTime > 0 && selectedVersion) {
        savePosition({
          bookCode, chapter,
          versionId: selectedVersion.id,
          audioTime: state.currentTime,
        });
      }
      manager.stop();
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Travar scroll do body (mobile)
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
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
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
    getAudioManager().togglePlayPause();
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

  // Labels para navegação colapsada
  const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);
  const isFirst = bookCode === "GEN" && chapter <= 1;
  const isLast = bookCode === "REV" && chapter >= (currentBook?.chapters || 22);

  let prevLabel = "";
  let nextLabel = "";
  if (!isFirst) {
    if (chapter > 1) prevLabel = `${bookName} ${chapter - 1}`;
    else {
      const pb = BIBLE_BOOKS[currentBookIndex - 1];
      if (pb) prevLabel = `${pb.name} ${pb.chapters}`;
    }
  }
  if (!isLast) {
    if (currentBook && chapter < currentBook.chapters) nextLabel = `${bookName} ${chapter + 1}`;
    else {
      const nb = BIBLE_BOOKS[currentBookIndex + 1];
      if (nb) nextLabel = `${nb.name} 1`;
    }
  }

  return (
    <div className="bible-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !isMobile) onClose();
    }}>
      <div className={`bible-modal ${isMobile ? "bible-modal--fullscreen" : ""}`}>
        <BibleHeader
          bookName={bookName}
          chapter={chapter}
          versionAbbr={selectedVersion?.abbreviation || "..."}
          onBookClick={() => setActiveSelector(activeSelector === "book" ? null : "book")}
          onVersionClick={() => setActiveSelector(activeSelector === "version" ? null : "version")}
          onClose={onClose}
          onSearchToggle={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery("");
          }}
        />

        {/* Busca no capítulo — T2 */}
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
                fontSize: 16, // T2: previne zoom iOS
                outline: "none",
              }}
            />
            <button
              onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: 8, cursor: "pointer" }}
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
          {/* T6: Navegação capítulo SEMPRE visível */}
          <BibleNavigation
            currentBookCode={bookCode}
            currentChapter={chapter}
            onNavigate={handleNavigate}
          />

          {/* T6: Seta expandir/recolher centralizada */}
          {audioAvailable && (
            <div className="bible-player-toggle" onClick={() => setIsPlayerCollapsed(!isPlayerCollapsed)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                transform: isPlayerCollapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span>{isPlayerCollapsed ? "Mostrar Controles" : "Esconder Controles"}</span>
            </div>
          )}

          {/* T8: Player expandido — NÃO depende de isPlayerCollapsed para audioUrl */}
          {!isPlayerCollapsed && audioAvailable && (
            <AudioPlayer
              audioUrl={audioUrl}
              audioAvailable={audioAvailable}
              copyright={copyright}
              onPrevious={handlePreviousChapter}
              onNext={handleNextChapter}
              pendingSeekTime={pendingSeekTime}
              onSeekHandled={() => setPendingSeekTime(null)}
            />
          )}

          {/* T7: Player colapsado — play + labels de capítulo */}
          {isPlayerCollapsed && audioAvailable && (
            <div className="bible-player-collapsed">
              <button
                className="bible-player-collapsed-nav"
                onClick={handlePreviousChapter}
                disabled={isFirst}
                aria-label="Capítulo anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>{prevLabel}</span>
              </button>

              <button
                className="bible-player-collapsed-btn bible-player-collapsed-btn--play"
                onClick={handleAudioToggle}
                aria-label={isAudioPlaying ? "Pausar" : "Reproduzir"}
              >
                {isAudioPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                className="bible-player-collapsed-nav bible-player-collapsed-nav--right"
                onClick={handleNextChapter}
                disabled={isLast}
                aria-label="Próximo capítulo"
              >
                <span>{nextLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
