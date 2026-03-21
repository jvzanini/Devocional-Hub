"use client";

import { useEffect, useState, useRef } from "react";
import { SpeedControl } from "./SpeedControl";
import type { AudioState, PlaybackSpeed } from "../lib/audio-manager";
import { getAudioManager } from "../lib/audio-manager";

interface AudioPlayerProps {
  audioUrl: string | null;
  audioAvailable: boolean;
  copyright?: string;
  onPrevious: () => void;
  onNext: () => void;
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
  copyright,
  onPrevious,
  onNext,
}: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isPaused: true,
    currentTime: 0,
    duration: 0,
    speed: 1,
    isLoading: false,
    error: null,
  });
  const progressRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef(getAudioManager());

  useEffect(() => {
    const manager = managerRef.current;
    const unsub = manager.subscribe(setState);
    const unsubEnd = manager.onChapterEnd(onNext);
    return () => {
      unsub();
      unsubEnd();
    };
  }, [onNext]);

  useEffect(() => {
    if (audioUrl) {
      managerRef.current.loadAndPlay(audioUrl);
    }
  }, [audioUrl]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !state.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    managerRef.current.seek(pct * state.duration);
  }

  function handleCycleSpeed() {
    managerRef.current.cycleSpeed();
  }

  if (!audioAvailable) {
    return (
      <div className="bible-player bible-player--disabled">
        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Áudio não disponível para esta versão
        </span>
      </div>
    );
  }

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="bible-player">
      <div className="bible-player-controls">
        <button
          className="bible-player-btn"
          onClick={onPrevious}
          aria-label="Capítulo anterior"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          className="bible-player-btn bible-player-btn--main"
          onClick={() => managerRef.current.togglePlayPause()}
          aria-label={state.isPlaying ? "Pausar" : "Reproduzir"}
        >
          {state.isLoading ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          ) : state.isPlaying ? (
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
          className="bible-player-btn"
          onClick={onNext}
          aria-label="Próximo capítulo"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      <div className="bible-player-progress-row">
        <span className="bible-player-time">{formatTime(state.currentTime)}</span>
        <div
          ref={progressRef}
          className="bible-player-progress"
          onClick={handleSeek}
          role="slider"
          aria-label="Progresso do áudio"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bible-player-progress-fill" style={{ width: `${progress}%` }} />
          <div className="bible-player-progress-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="bible-player-time">{formatTime(state.duration)}</span>
      </div>

      <div className="bible-player-extras">
        <SpeedControl speed={state.speed as PlaybackSpeed} onCycleSpeed={handleCycleSpeed} />
        {copyright && (
          <span className="bible-player-copyright">{copyright}</span>
        )}
      </div>
    </div>
  );
}
