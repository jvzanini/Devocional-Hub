"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BIBLE_BOOKS, findBookByCode } from "@/features/bible/lib/bible-books";
import { getAudioManager } from "../lib/audio-manager";
import type { VerseTimestamp } from "../lib/bible-is-audio";
import type { DiscoveredVersion } from "../lib/version-discovery";
import { BibleHeader } from "./BibleHeader";
import type { FontSizeLevel } from "./BibleHeader";
import { VersionSelector } from "./VersionSelector";
import { BookSelector } from "./BookSelector";
import { BibleContent } from "./BibleContent";
import { BibleNavigation } from "./BibleNavigation";
import { AudioPlayer } from "./AudioPlayer";

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 138.23

const FONT_SIZE_KEY = "devhub-bible-fontsize";
const FONT_SIZE_CYCLE: FontSizeLevel[] = ["normal", "medium", "large"];

function loadFontSize(): FontSizeLevel {
  try {
    const val = localStorage.getItem(FONT_SIZE_KEY) as FontSizeLevel;
    if (val && FONT_SIZE_CYCLE.includes(val)) return val;
  } catch {}
  return "normal";
}

function saveFontSize(size: FontSizeLevel) {
  try { localStorage.setItem(FONT_SIZE_KEY, size); } catch {}
}

const CACHE_KEY = "devhub-bible-position";
const SPEED_KEY = "devhub-bible-speed";
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

function saveSpeed(speed: number) {
  try { localStorage.setItem(SPEED_KEY, String(speed)); } catch {}
}

function loadSpeed(): number {
  try {
    const val = localStorage.getItem(SPEED_KEY);
    return val ? parseFloat(val) : 1;
  } catch { return 1; }
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
  const [fontSize, setFontSize] = useState<FontSizeLevel>("normal");
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [verseTimestamps, setVerseTimestamps] = useState<VerseTimestamp[]>([]);
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);

  const preloadCacheRef = useRef<Record<string, { text?: string; audioUrl?: string; timestamps?: VerseTimestamp[] }>>({});
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastVerseRef = useRef<number | null>(null);
  const progressRingRef = useRef<SVGCircleElement>(null);
  const wasPlayingBeforeSearchRef = useRef(false);
  const savedSearchQueryRef = useRef("");
  const scrollToVerseAfterSearchRef = useRef(false);

  // Restaurar tamanho da fonte salvo
  useEffect(() => {
    setFontSize(loadFontSize());
  }, []);

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

  // Carregar texto (rápido)
  useEffect(() => {
    if (!isOpen || !selectedVersion) return;

    async function loadContent() {
      setIsLoading(true);
      setError(null);
      setHtmlContent(null);

      const chapterId = `${bookCode}.${chapter}`;
      const cached = preloadCacheRef.current[chapterId];
      if (cached?.text) {
        setHtmlContent(cached.text);
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bible/content/${selectedVersion!.id}/${chapterId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        setHtmlContent(data.content?.content || "");
        setCopyright(data.content?.copyright || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
    contentRef.current?.scrollTo({ top: 0 });

    if (selectedVersion) {
      savePosition({ bookCode, chapter, versionId: selectedVersion.id, audioTime: 0 });
    }
  }, [isOpen, selectedVersion, bookCode, chapter]);

  // audioAvailable baseado APENAS na versão selecionada (nunca muda durante navegação)
  useEffect(() => {
    if (selectedVersion) {
      setAudioAvailable(selectedVersion.audioAvailable);
    }
  }, [selectedVersion]);

  // Carregar URL do áudio + timestamps (em background, não bloqueia texto nem afeta audioAvailable)
  useEffect(() => {
    if (!isOpen || !selectedVersion || !selectedVersion.audioAvailable) return;

    setAudioUrl(null); // limpar URL anterior enquanto carrega nova
    setVerseTimestamps([]);
    setCurrentVerse(null);
    lastVerseRef.current = null;

    async function loadAudio() {
      const chapterId = `${bookCode}.${chapter}`;
      const cached = preloadCacheRef.current[chapterId];
      if (cached?.audioUrl) {
        setAudioUrl(cached.audioUrl);
        if (cached.timestamps) setVerseTimestamps(cached.timestamps);
        return;
      }
      try {
        const res = await fetch(`/api/bible/audio/${selectedVersion!.id}/${chapterId}`);
        const data = await res.json();
        setAudioUrl(data.audioUrl || null);
        if (data.timestamps?.length) {
          setVerseTimestamps(data.timestamps);
        }
      } catch {
        setAudioUrl(null);
      }
    }

    loadAudio();
  }, [isOpen, selectedVersion, bookCode, chapter]);

  // Preload adjacent chapters
  useEffect(() => {
    if (!isOpen || !selectedVersion || isLoading) return;

    const preload = async (bc: string, ch: number) => {
      const key = `${bc}.${ch}`;
      if (preloadCacheRef.current[key]) return;
      preloadCacheRef.current[key] = {};
      try {
        const [textRes, audioRes] = await Promise.allSettled([
          fetch(`/api/bible/content/${selectedVersion.id}/${key}`),
          selectedVersion.audioAvailable ? fetch(`/api/bible/audio/${selectedVersion.id}/${key}`) : Promise.resolve(null),
        ]);
        if (textRes.status === "fulfilled" && textRes.value?.ok) {
          const data = await textRes.value.json();
          preloadCacheRef.current[key].text = data.content?.content;
        }
        if (audioRes.status === "fulfilled" && audioRes.value?.ok) {
          const data = await (audioRes.value as Response).json();
          preloadCacheRef.current[key].audioUrl = data.audioUrl;
          if (data.timestamps?.length) {
            preloadCacheRef.current[key].timestamps = data.timestamps;
          }
        }
      } catch {}
    };

    const currentBook = findBookByCode(bookCode);
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);

    if (currentBook && chapter < currentBook.chapters) {
      preload(bookCode, chapter + 1);
    } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
      preload(BIBLE_BOOKS[currentBookIndex + 1].code, 1);
    }

    if (chapter > 1) {
      preload(bookCode, chapter - 1);
    } else if (currentBookIndex > 0) {
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      preload(prevBook.code, prevBook.chapters);
    }
  }, [isOpen, selectedVersion, bookCode, chapter, isLoading]);

  // Monitorar estado do áudio (playing + speed + loading)
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  useEffect(() => {
    const manager = getAudioManager();
    const unsub = manager.subscribe((state) => {
      setIsAudioPlaying(state.isPlaying);
      setAudioSpeed(state.speed);
      setIsAudioLoading(state.isLoading);
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

  // ─── Verse Tracking: determinar versículo atual pelo currentTime do áudio ───
  useEffect(() => {
    const manager = getAudioManager();

    const unsub = manager.subscribe((state) => {
      // Sem timestamps e sem duração → sem tracking
      if (!state.isPlaying && !state.isPaused) {
        // Áudio parado completamente (sem src) → limpar
        if (lastVerseRef.current !== null) {
          lastVerseRef.current = null;
          setCurrentVerse(null);
        }
        return;
      }

      // Tracking ativo durante play E durante seek (mesmo pausado)
      // Permite que a guia de leitura acompanhe o drag na barra de progresso
      if (!state.isPlaying && state.currentTime === 0 && !state.duration) return;

      // Gerar fallback proporcional se não houver timestamps da API
      let ts = verseTimestamps;
      if (ts.length === 0 && state.duration > 0 && contentRef.current) {
        const verseEls = contentRef.current.querySelectorAll("[data-verse]");
        const count = verseEls.length;
        if (count > 0) {
          // Reservar ~8% do início para intro/silêncio da narração,
          // distribuir o resto igualmente entre os versículos
          const introOffset = state.duration * 0.08;
          const usableDuration = state.duration - introOffset;
          const interval = usableDuration / count;
          ts = Array.from({ length: count }, (_, i) => ({
            verse: parseInt(verseEls[i].getAttribute("data-verse") || String(i + 1), 10),
            timestamp: introOffset + i * interval,
          }));
        }
      }

      if (ts.length === 0) return;

      // Busca binária: último timestamp <= currentTime
      let verse = ts[0].verse;
      for (let i = ts.length - 1; i >= 0; i--) {
        if (ts[i].timestamp <= state.currentTime) {
          verse = ts[i].verse;
          break;
        }
      }

      if (verse !== lastVerseRef.current) {
        lastVerseRef.current = verse;
        setCurrentVerse(verse);
      }
    });

    return unsub;
  }, [verseTimestamps]);

  // ─── Auto-scroll ao mudar de versículo ────────────────────────────────────
  useEffect(() => {
    if (currentVerse === null || !contentRef.current) return;
    if (userScrollingRef.current) return; // usuário está rolando manualmente

    const scrollContainer = contentRef.current; // .bible-modal-body
    const verseEl = scrollContainer.querySelector(`[data-verse="${currentVerse}"]`);
    if (!verseEl) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const rects = verseEl.getClientRects();
    if (rects.length === 0) return;
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    const verseTop = firstRect.top;
    const verseBottom = lastRect.top + lastRect.height;

    // Considerar o footer/player que pode cobrir texto
    const footer = scrollContainer.parentElement?.querySelector(".bible-modal-footer");
    const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
    const visibleBottom = containerRect.bottom - footerHeight;

    const padding = 80; // espaço do topo
    const isAbove = verseTop < containerRect.top;
    const isBelow = verseBottom > visibleBottom - 20;

    if (isAbove || isBelow) {
      const targetScrollTop =
        verseTop - containerRect.top + scrollContainer.scrollTop - padding;
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    }
  }, [currentVerse, isPlayerCollapsed]);

  // ─── Progress ring circular no botão play colapsado (DOM direto, sem re-render) ─
  useEffect(() => {
    if (!isPlayerCollapsed) return;
    const manager = getAudioManager();

    const unsub = manager.subscribe((state) => {
      const ring = progressRingRef.current;
      if (!ring) return;
      const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
      ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    });

    return unsub;
  }, [isPlayerCollapsed]);

  // ─── Detectar scroll manual do usuário (para pausar auto-scroll) ──────────
  useEffect(() => {
    const scrollEl = contentRef.current;
    if (!scrollEl) return;

    function handleUserScroll() {
      userScrollingRef.current = true;
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false;
      }, 4000); // pausa auto-scroll por 4s após última interação
    }

    scrollEl.addEventListener("wheel", handleUserScroll, { passive: true });
    scrollEl.addEventListener("touchmove", handleUserScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("wheel", handleUserScroll);
      scrollEl.removeEventListener("touchmove", handleUserScroll);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [isOpen]);

  // ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          savedSearchQueryRef.current = searchQuery;
          setIsSearchOpen(false);
          setSearchQuery("");
          if (wasPlayingBeforeSearchRef.current) {
            getAudioManager().play();
            wasPlayingBeforeSearchRef.current = false;
          }
        } else if (!activeSelector) {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeSelector, isSearchOpen, searchQuery, onClose]);

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
      setCurrentVerse(null);
      lastVerseRef.current = null;
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Scroll para versículo atual ao sair da busca via play
  useEffect(() => {
    if (isSearchOpen || !scrollToVerseAfterSearchRef.current) return;
    scrollToVerseAfterSearchRef.current = false;
    // Duplo rAF: esperar processSearch limpar o filtro, então scrollar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (currentVerse && contentRef.current) {
          const verseEl = contentRef.current.querySelector(`[data-verse="${currentVerse}"]`);
          if (verseEl) verseEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }, [isSearchOpen, currentVerse]);

  // Prevenir pinch-to-zoom no modal (mobile)
  useEffect(() => {
    if (!isOpen) return;
    function preventZoom(e: TouchEvent) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }
    document.addEventListener("touchmove", preventZoom, { passive: false });
    return () => document.removeEventListener("touchmove", preventZoom);
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
    if (isAudioPlaying) setAutoPlayNext(true);
    setBookCode(newBookCode);
    setChapter(newChapter);
    setActiveSelector(null);
  }, [isAudioPlaying]);

  const handleAudioToggle = useCallback(() => {
    getAudioManager().togglePlayPause();
  }, []);

  const handleFontSizeToggle = useCallback(() => {
    setFontSize((prev) => {
      const idx = FONT_SIZE_CYCLE.indexOf(prev);
      const next = FONT_SIZE_CYCLE[(idx + 1) % FONT_SIZE_CYCLE.length];
      saveFontSize(next);
      return next;
    });
  }, []);

  const handlePreviousChapter = useCallback(() => {
    if (isAudioPlaying) setAutoPlayNext(true);
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);
    if (chapter > 1) {
      setChapter(chapter - 1);
    } else if (currentBookIndex > 0) {
      const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
      setBookCode(prevBook.code);
      setChapter(prevBook.chapters);
    }
  }, [bookCode, chapter, isAudioPlaying]);

  const handleNextChapter = useCallback(() => {
    if (isAudioPlaying) setAutoPlayNext(true);
    const currentBook = BIBLE_BOOKS.find((b) => b.code === bookCode);
    const currentBookIndex = BIBLE_BOOKS.findIndex((b) => b.code === bookCode);
    if (currentBook && chapter < currentBook.chapters) {
      setChapter(chapter + 1);
    } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
      const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
      setBookCode(nextBook.code);
      setChapter(1);
    }
  }, [bookCode, chapter, isAudioPlaying]);

  const handleChapterEndAutoPlay = useCallback(() => {
    setAutoPlayNext(true);
    handleNextChapter();
  }, [handleNextChapter]);

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
      <div className={`bible-modal ${isMobile ? "bible-modal--fullscreen" : ""}`} style={{ touchAction: "pan-y" }}>
        {/* ── Floating side nav buttons (hidden on mobile via CSS) ── */}
        <button
          className="bible-side-nav bible-side-nav--left"
          onClick={handlePreviousChapter}
          disabled={isFirst}
          aria-label="Capítulo anterior"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="bible-side-nav bible-side-nav--right"
          onClick={handleNextChapter}
          disabled={isLast}
          aria-label="Próximo capítulo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <BibleHeader
          bookName={bookName}
          chapter={chapter}
          versionAbbr={selectedVersion?.abbreviation || "..."}
          onBookClick={() => setActiveSelector(activeSelector === "book" ? null : "book")}
          onVersionClick={() => setActiveSelector(activeSelector === "version" ? null : "version")}
          onClose={onClose}
          onSearchToggle={() => {
            if (!isSearchOpen) {
              // Abrindo busca: pausar áudio se tocando
              const manager = getAudioManager();
              const state = manager.getState();
              wasPlayingBeforeSearchRef.current = state.isPlaying;
              if (state.isPlaying) manager.pause();
              // Restaurar query salva (se voltou de fechar por play)
              if (savedSearchQueryRef.current) {
                setSearchQuery(savedSearchQueryRef.current);
              }
              setIsSearchOpen(true);
            } else {
              // Fechando busca (via toggle lupa): salvar query para restaurar depois
              savedSearchQueryRef.current = searchQuery;
              setIsSearchOpen(false);
              setSearchQuery("");
              if (wasPlayingBeforeSearchRef.current) {
                getAudioManager().play();
                wasPlayingBeforeSearchRef.current = false;
              }
            }
          }}
          fontSize={fontSize}
          onFontSizeToggle={handleFontSizeToggle}
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
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
                savedSearchQueryRef.current = "";
                if (wasPlayingBeforeSearchRef.current) {
                  getAudioManager().play();
                  wasPlayingBeforeSearchRef.current = false;
                }
              }}
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
            fontSize={fontSize}
            currentVerse={currentVerse}
            isSearchActive={isSearchOpen && searchQuery.length >= 2}
          />
        </div>

        <div className="bible-modal-footer" onMouseDown={(e) => {
          // Prevenir perda de foco do input de busca ao clicar nos controles de áudio
          if (isSearchOpen) e.preventDefault();
        }}>
          {/* ── PLAYER EXPANDIDO (sempre montado, oculto via CSS) ── */}
          {audioAvailable && (
            <div style={{ display: isPlayerCollapsed ? "none" : "block" }}>
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
                onNext={handleChapterEndAutoPlay}
                onCollapse={() => setIsPlayerCollapsed(true)}
                pendingSeekTime={pendingSeekTime}
                onSeekHandled={() => setPendingSeekTime(null)}
                autoPlay={autoPlayNext}
                onAutoPlayHandled={() => setAutoPlayNext(false)}
                onPlayDuringSearch={isSearchOpen ? () => {
                  savedSearchQueryRef.current = searchQuery;
                  setIsSearchOpen(false);
                  setSearchQuery("");
                  wasPlayingBeforeSearchRef.current = false;
                  scrollToVerseAfterSearchRef.current = true;
                } : undefined}
              />
            </div>
          )}

          {/* ── PLAYER COLAPSADO ── */}
          {isPlayerCollapsed && audioAvailable && (
            <div className="bible-player-collapsed">
              {/* Expandir — esquerda */}
              <button
                className="bible-player-pill-btn"
                onClick={() => setIsPlayerCollapsed(false)}
                aria-label="Expandir controles"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>

              <button
                className="bible-player-collapsed-nav"
                onClick={handlePreviousChapter}
                disabled={isFirst}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>{prevLabel ? `${currentBook?.abbr || bookName} ${chapter > 1 ? chapter - 1 : ""}` : ""}</span>
              </button>

              <button
                className="bible-player-collapsed-btn--play"
                onClick={audioUrl ? () => {
                  if (isSearchOpen && !isAudioPlaying) {
                    // Play durante busca: salvar query, fechar busca, scroll para versículo
                    savedSearchQueryRef.current = searchQuery;
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    wasPlayingBeforeSearchRef.current = false;
                    scrollToVerseAfterSearchRef.current = true;
                    handleAudioToggle();
                    return;
                  }
                  handleAudioToggle();
                } : undefined}
                aria-label={isAudioLoading || !audioUrl ? "Carregando" : isAudioPlaying ? "Pausar" : "Reproduzir"}
                style={{ opacity: !audioUrl ? 0.6 : 1 }}
              >
                {/* Progress ring circular (só no colapsado) */}
                <svg className="bible-player-progress-ring" viewBox="0 0 48 48">
                  <circle className="bible-player-progress-ring-track" cx="24" cy="24" r={RING_RADIUS} />
                  <circle
                    ref={progressRingRef}
                    className="bible-player-progress-ring-fill"
                    cx="24" cy="24" r={RING_RADIUS}
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE}
                  />
                </svg>
                {isAudioLoading || !audioUrl ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                ) : isAudioPlaying ? (
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
                className="bible-player-collapsed-nav"
                onClick={handleNextChapter}
                disabled={isLast}
              >
                <span>{nextLabel ? `${currentBook && chapter < currentBook.chapters ? currentBook.abbr : (BIBLE_BOOKS[currentBookIndex + 1]?.abbr || "")} ${currentBook && chapter < currentBook.chapters ? chapter + 1 : 1}` : ""}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Velocidade — direita (reativo via audioSpeed) */}
              <button
                className="bible-player-pill-btn"
                onClick={() => getAudioManager().cycleSpeed()}
                aria-label="Alterar velocidade"
              >
                {audioSpeed}x
              </button>
            </div>
          )}

          {/* ── SEM ÁUDIO — só navegação ── */}
          {!audioAvailable && (
            <BibleNavigation
              currentBookCode={bookCode}
              currentChapter={chapter}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
