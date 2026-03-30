"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { AudioState } from "../lib/audio-manager";
import { getAudioManager } from "../lib/audio-manager";

interface AudioPlayerProps {
  audioUrl: string | null;
  audioAvailable: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCollapse?: () => void;
  pendingSeekTime?: number | null;
  onSeekHandled?: () => void;
  autoPlay?: boolean;
  onAutoPlayHandled?: () => void;
  onPlayDuringSearch?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  audioUrl,
  audioAvailable,
  onPrevious,
  onNext,
  onCollapse,
  pendingSeekTime,
  onSeekHandled,
  autoPlay,
  onAutoPlayHandled,
  onPlayDuringSearch,
}: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false, isPaused: true, currentTime: 0,
    duration: 0, speed: 1, isLoading: false, error: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef(getAudioManager());
  const loadedUrlRef = useRef<string | null>(null);
  const wasPlayingBeforeDragRef = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const manager = managerRef.current;
    const unsub = manager.subscribe(setState);
    // Suprimir troca de capítulo durante drag (previne cascata)
    const unsubEnd = manager.onChapterEnd(() => {
      if (!isDraggingRef.current) onNext();
    });
    return () => { unsub(); unsubEnd(); };
  }, [onNext]);

  // Carregar áudio (autoplay quando vindo de transição contínua)
  useEffect(() => {
    const manager = managerRef.current;

    if (!audioUrl) {
      // URL limpa (navegação de capítulo) — pausar áudio antigo
      if (loadedUrlRef.current) {
        manager.pause();
        loadedUrlRef.current = null;
      }
      return;
    }

    if (audioUrl === loadedUrlRef.current) return;
    loadedUrlRef.current = audioUrl;
    if (autoPlay) {
      manager.loadAndPlay(audioUrl);
      onAutoPlayHandled?.();
    } else {
      manager.loadOnly(audioUrl);
    }
  }, [audioUrl, autoPlay, onAutoPlayHandled]);

  // Seek para posição salva
  useEffect(() => {
    if (pendingSeekTime && pendingSeekTime > 0) {
      const manager = managerRef.current;
      const checkInterval = setInterval(() => {
        const s = manager.getState();
        if (s.duration > 0) {
          manager.seek(pendingSeekTime);
          onSeekHandled?.();
          clearInterval(checkInterval);
        }
      }, 200);
      return () => clearInterval(checkInterval);
    }
  }, [pendingSeekTime, onSeekHandled]);

  // Drag-to-seek
  const seekFromEvent = useCallback((clientX: number, clampEnd = false) => {
    if (!progressRef.current || !state.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragProgress(pct * 100);
    // Durante drag, limitar antes do final para evitar evento "ended" (previne troca de capítulo)
    const seekTime = clampEnd
      ? Math.min(pct * state.duration, state.duration - 0.5)
      : pct * state.duration;
    managerRef.current.seek(Math.max(0, seekTime));
  }, [state.duration]);

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) { seekFromEvent(e.clientX, true); }
    function handleMouseUp() {
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragProgress(null);
      if (wasPlayingBeforeDragRef.current) {
        wasPlayingBeforeDragRef.current = false;
        const s = managerRef.current.getState();
        // Se soltou no final e estava tocando → avançar capítulo naturalmente
        if (s.duration > 0 && s.currentTime >= s.duration - 1) {
          onNext();
        } else {
          managerRef.current.play();
        }
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, seekFromEvent, onNext]);

  if (!audioAvailable) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const displayProgress = isDragging && dragProgress !== null ? dragProgress : progress;

  return (
    <div className="bible-player">
      {/* Opção A: recolher — play — velocidade */}
      <div className="bible-player-controls">
        {onCollapse && (
          <button
            className="bible-player-pill-btn bible-player-pill-btn--side"
            onClick={onCollapse}
            aria-label="Recolher controles"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        <button
          className="bible-player-btn bible-player-btn--main"
          onClick={() => {
            if (onPlayDuringSearch && state.isPaused) onPlayDuringSearch();
            managerRef.current.togglePlayPause();
          }}
          aria-label={state.isPlaying ? "Pausar" : "Reproduzir"}
        >
          {state.isLoading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          ) : state.isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button
          className="bible-player-pill-btn bible-player-pill-btn--side"
          onClick={() => managerRef.current.cycleSpeed()}
          aria-label="Alterar velocidade"
        >
          {state.speed}x
        </button>
      </div>

      {/* Barra de progresso + tempo */}
      <div className="bible-player-progress-row">
        <span className="bible-player-time">{formatTime(state.currentTime)}</span>
        <div
          ref={progressRef}
          className={`bible-player-progress ${isDragging ? "bible-player-progress--dragging" : ""}`}
          onClick={(e) => { if (!isDragging) seekFromEvent(e.clientX); }}
          onMouseDown={(e) => {
            e.preventDefault();
            wasPlayingBeforeDragRef.current = state.isPlaying;
            if (state.isPlaying) managerRef.current.pause();
            isDraggingRef.current = true;
            setIsDragging(true);
            seekFromEvent(e.clientX, true);
          }}
          onTouchStart={(e) => {
            wasPlayingBeforeDragRef.current = state.isPlaying;
            if (state.isPlaying) managerRef.current.pause();
            isDraggingRef.current = true;
            setIsDragging(true);
            seekFromEvent(e.touches[0].clientX, true);
          }}
          onTouchMove={(e) => { if (isDragging) seekFromEvent(e.touches[0].clientX, true); }}
          onTouchEnd={() => {
            isDraggingRef.current = false;
            setIsDragging(false);
            setDragProgress(null);
            if (wasPlayingBeforeDragRef.current) {
              wasPlayingBeforeDragRef.current = false;
              const s = managerRef.current.getState();
              if (s.duration > 0 && s.currentTime >= s.duration - 1) {
                onNext();
              } else {
                managerRef.current.play();
              }
            }
          }}
          role="slider"
          aria-valuenow={Math.round(displayProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bible-player-progress-fill" style={{ width: `${displayProgress}%` }} />
          <div className="bible-player-progress-thumb" style={{ left: `${displayProgress}%` }} />
        </div>
        <span className="bible-player-time">{formatTime(state.duration)}</span>
      </div>
    </div>
  );
}
