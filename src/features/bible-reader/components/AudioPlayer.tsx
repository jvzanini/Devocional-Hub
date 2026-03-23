"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { AudioState, PlaybackSpeed } from "../lib/audio-manager";
import { getAudioManager } from "../lib/audio-manager";

interface AudioPlayerProps {
  audioUrl: string | null;
  audioAvailable: boolean;
  copyright?: string;
  onPrevious: () => void;
  onNext: () => void;
  onCollapse?: () => void;
  pendingSeekTime?: number | null;
  onSeekHandled?: () => void;
  autoPlay?: boolean;
  onAutoPlayHandled?: () => void;
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
}: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false, isPaused: true, currentTime: 0,
    duration: 0, speed: 1, isLoading: false, error: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef(getAudioManager());
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const manager = managerRef.current;
    const unsub = manager.subscribe(setState);
    const unsubEnd = manager.onChapterEnd(onNext);
    return () => { unsub(); unsubEnd(); };
  }, [onNext]);

  // Carregar áudio (autoplay quando vindo de transição contínua)
  useEffect(() => {
    if (!audioUrl || audioUrl === loadedUrlRef.current) return;
    loadedUrlRef.current = audioUrl;
    if (autoPlay) {
      managerRef.current.loadAndPlay(audioUrl);
      onAutoPlayHandled?.();
    } else {
      managerRef.current.loadOnly(audioUrl);
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
  const seekFromEvent = useCallback((clientX: number) => {
    if (!progressRef.current || !state.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    managerRef.current.seek(pct * state.duration);
  }, [state.duration]);

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) { seekFromEvent(e.clientX); }
    function handleMouseUp() { setIsDragging(false); }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, seekFromEvent]);

  if (!audioAvailable) return null;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

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
          onClick={() => managerRef.current.togglePlayPause()}
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
          onClick={(e) => seekFromEvent(e.clientX)}
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); seekFromEvent(e.clientX); }}
          onTouchStart={(e) => { setIsDragging(true); seekFromEvent(e.touches[0].clientX); }}
          onTouchMove={(e) => { if (isDragging) seekFromEvent(e.touches[0].clientX); }}
          onTouchEnd={() => setIsDragging(false)}
          role="slider"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bible-player-progress-fill" style={{ width: `${progress}%` }} />
          <div className="bible-player-progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="bible-player-time">{formatTime(state.duration)}</span>
      </div>
    </div>
  );
}
