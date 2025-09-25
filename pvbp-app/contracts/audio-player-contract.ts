/**
 * ========== Audio Player Contract ==========
 * PVBP Protocol v1.0.0 Compliant
 * Runtime: client (browser audio API required)
 */

export interface AudioPlayerContract {
  // State
  readonly isPlaying: boolean;
  readonly isLoading: boolean;
  readonly currentTime: number;
  readonly duration: number;

  // Actions
  play(audioBlob: Blob): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  download(audioBlob: Blob, filename: string): void;

  // Volume (0.0 to 1.0)
  setVolume(level: number): void;
  getVolume(): number;

  // Events (optional handlers)
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

// Audio state for UI synchronization
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';