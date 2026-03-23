/**
 * Gerenciador de áudio para Bíblia Interativa
 *
 * - HTMLAudioElement nativo
 * - Autoplay entre capítulos
 * - Controle de velocidade
 * - MediaSession API para controle em segundo plano (mobile)
 */

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 1.75 | 2;

export interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  speed: PlaybackSpeed;
  isLoading: boolean;
  error: string | null;
}

type AudioStateListener = (state: AudioState) => void;
type ChapterEndListener = () => void;

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 1.25, 1.5, 1.75, 2];

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<AudioStateListener> = new Set();
  private chapterEndListeners: Set<ChapterEndListener> = new Set();
  private currentSpeed: PlaybackSpeed = 1;
  private autoplayEnabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.setupEventListeners();
      // Restaurar velocidade salva
      try {
        const saved = localStorage.getItem("devhub-bible-speed");
        if (saved) {
          const speed = parseFloat(saved) as PlaybackSpeed;
          if ([1, 1.25, 1.5, 1.75, 2].includes(speed)) {
            this.currentSpeed = speed;
          }
        }
      } catch {}
    }
  }

  private setupEventListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener("timeupdate", () => this.notifyListeners());
    this.audio.addEventListener("loadedmetadata", () => this.notifyListeners());
    this.audio.addEventListener("play", () => this.notifyListeners());
    this.audio.addEventListener("pause", () => this.notifyListeners());
    this.audio.addEventListener("waiting", () => this.notifyListeners());
    this.audio.addEventListener("canplay", () => this.notifyListeners());

    this.audio.addEventListener("ended", () => {
      this.notifyListeners();
      if (this.autoplayEnabled) {
        this.chapterEndListeners.forEach((cb) => cb());
      }
    });

    this.audio.addEventListener("error", () => {
      console.error("[AudioManager] Erro de reprodução:", this.audio?.error);
      this.notifyListeners();
    });
  }

  getState(): AudioState {
    if (!this.audio) {
      return {
        isPlaying: false,
        isPaused: true,
        currentTime: 0,
        duration: 0,
        speed: this.currentSpeed,
        isLoading: false,
        error: null,
      };
    }

    return {
      isPlaying: !this.audio.paused && !this.audio.ended,
      isPaused: this.audio.paused,
      currentTime: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
      speed: this.currentSpeed,
      isLoading: this.audio.readyState < 3,
      error: this.audio.error ? "Erro ao carregar áudio" : null,
    };
  }

  async loadAndPlay(url: string): Promise<void> {
    if (!this.audio) return;

    this.audio.src = url;
    this.audio.playbackRate = this.currentSpeed;

    try {
      await this.audio.play();
      this.updateMediaSession();
    } catch (err) {
      console.warn("[AudioManager] Autoplay bloqueado, aguardando interação:", err);
    }
  }

  /** Carregar áudio sem reproduzir (pré-carrega apenas) */
  loadOnly(url: string): void {
    if (!this.audio) return;
    this.audio.src = url;
    this.audio.playbackRate = this.currentSpeed;
    this.audio.load();
    this.notifyListeners();
  }

  play(): void {
    if (this.audio) {
      this.audio.playbackRate = this.currentSpeed; // garantir velocidade salva
      this.audio.play().catch(console.warn);
    }
    this.updateMediaSession();
  }

  pause(): void {
    this.audio?.pause();
  }

  togglePlayPause(): void {
    if (!this.audio) return;
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  seek(time: number): void {
    if (this.audio && isFinite(time)) {
      this.audio.currentTime = time;
    }
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.currentSpeed = speed;
    if (this.audio) {
      const wasPlaying = !this.audio.paused;
      if (wasPlaying) {
        const currentPos = this.audio.currentTime;
        this.audio.pause();
        this.audio.playbackRate = speed;
        this.audio.currentTime = currentPos;
        requestAnimationFrame(() => {
          this.audio?.play().catch(console.warn);
        });
      } else {
        this.audio.playbackRate = speed;
      }
    }
    try { localStorage.setItem("devhub-bible-speed", String(speed)); } catch {}
    this.notifyListeners();
  }

  cycleSpeed(): PlaybackSpeed {
    const currentIdx = SPEED_OPTIONS.indexOf(this.currentSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    this.setSpeed(nextSpeed);
    return nextSpeed;
  }

  setAutoplay(enabled: boolean): void {
    this.autoplayEnabled = enabled;
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
    }
    this.notifyListeners();
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
    this.chapterEndListeners.clear();
  }

  // ─── Listeners ────────────────────────────────────────────────────────────

  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onChapterEnd(listener: ChapterEndListener): () => void {
    this.chapterEndListeners.add(listener);
    return () => this.chapterEndListeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  // ─── MediaSession API (controle em segundo plano) ──────────────────────────

  private updateMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Bíblia — DevocionalHub",
      artist: "DevocionalHub",
    });

    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      this.chapterEndListeners.forEach((cb) => cb());
    });
  }
}

// Singleton para uso no client
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}
