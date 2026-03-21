"use client";

import type { PlaybackSpeed } from "../lib/audio-manager";

interface SpeedControlProps {
  speed: PlaybackSpeed;
  onCycleSpeed: () => void;
}

export function SpeedControl({ speed, onCycleSpeed }: SpeedControlProps) {
  return (
    <button
      onClick={onCycleSpeed}
      className="bible-speed-btn"
      aria-label={`Velocidade ${speed}x. Clique para alterar.`}
      title="Alterar velocidade de reprodução"
    >
      {speed}x
    </button>
  );
}
