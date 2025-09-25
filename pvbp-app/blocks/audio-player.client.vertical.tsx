/**
 * ========== PVBP Client Block ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/audio-player.client.vertical.tsx
 * Runtime: Client-side only (browser audio API required)
 *
 * Purpose: Self-contained audio player with comprehensive controls
 * Features: Play/pause/stop, progress bar with seek, volume control, download
 * Issue Fix: Safe browser API usage with lifecycle patterns
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioPlayerContract, AudioState } from '../contracts/audio-player-contract';

// Runtime declaration for PVBP compliance
export const RUNTIME = 'client' as const;

// ========== Lifecycle Patterns (Self-contained) ==========

/**
 * useClientOnly - Detect client-side environment
 * Prevents hydration mismatches with browser-only APIs
 */
const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
};

/**
 * useAbortSafe - Manage AbortController lifecycle safely
 * Prevents memory leaks and timing issues with async operations
 */
const useAbortSafe = () => {
  const abortRef = useRef<AbortController>();
  const isMounted = useRef(true);

  const getController = () => {
    if (!abortRef.current) {
      abortRef.current = new AbortController();
    }
    return abortRef.current;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortRef.current && !document.hidden) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { getController, isMounted };
};

/**
 * useMountedRef - Track component mount state
 * Prevents state updates on unmounted components
 */
const useMountedRef = () => {
  const mounted = useRef(true);
  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);
  return mounted;
};

// ========== Types ==========

interface AudioPlayerProps {
  className?: string;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
  defaultVolume?: number; // 0.0 to 1.0
  showDownloadButton?: boolean;
  showVolumeControl?: boolean;
  theme?: 'light' | 'dark';
}

interface AudioPlayerState {
  audioState: AudioState;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentBlob: Blob | null;
  error: string | null;
}

// ========== Audio Player Implementation ==========

const AudioPlayerVertical: React.FC<AudioPlayerProps> = ({
  className = '',
  onPlaybackEnd,
  onError,
  defaultVolume = 0.8,
  showDownloadButton = true,
  showVolumeControl = true,
  theme = 'light'
}) => {
  const isClient = useClientOnly();
  const { getController, isMounted } = useAbortSafe();
  const mounted = useMountedRef();

  // Audio elements and refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const volumeRef = useRef<HTMLInputElement | null>(null);

  // Component state
  const [state, setState] = useState<AudioPlayerState>({
    audioState: 'idle',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: defaultVolume,
    currentBlob: null,
    error: null
  });

  // ========== Safe State Updater ==========
  const updateState = useCallback((updates: Partial<AudioPlayerState>) => {
    if (mounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, [mounted]);

  // ========== Error Handler ==========
  const handleError = useCallback((error: Error) => {
    updateState({
      audioState: 'error',
      isPlaying: false,
      isLoading: false,
      error: error.message
    });
    onError?.(error);
  }, [updateState, onError]);

  // ========== Audio Event Handlers ==========
  const setupAudioEvents = useCallback((audio: HTMLAudioElement) => {
    const handleLoadStart = () => updateState({ isLoading: true, audioState: 'loading' });
    const handleCanPlay = () => updateState({ isLoading: false });
    const handleLoadedMetadata = () => {
      updateState({
        duration: audio.duration || 0,
        isLoading: false,
        audioState: 'idle'
      });
    };

    const handleTimeUpdate = () => {
      updateState({ currentTime: audio.currentTime || 0 });
    };

    const handlePlay = () => updateState({ isPlaying: true, audioState: 'playing' });
    const handlePause = () => updateState({ isPlaying: false, audioState: 'paused' });
    const handleEnded = () => {
      updateState({
        isPlaying: false,
        currentTime: 0,
        audioState: 'idle'
      });
      onPlaybackEnd?.();
    };

    const handleAudioError = (e: Event) => {
      const audioError = audio.error;
      const message = audioError ?
        `Audio error: ${audioError.message} (code: ${audioError.code})` :
        'Unknown audio playback error';
      handleError(new Error(message));
    };

    // Attach event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleAudioError);

    // Return cleanup function
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [updateState, onPlaybackEnd, handleError]);

  // ========== Audio Player Contract Implementation ==========
  const audioPlayer: AudioPlayerContract = {
    // State getters
    get isPlaying() { return state.isPlaying; },
    get isLoading() { return state.isLoading; },
    get currentTime() { return state.currentTime; },
    get duration() { return state.duration; },

    // Playback controls
    play: async (audioBlob: Blob) => {
      try {
        if (!isClient) throw new Error('Audio player not available on server');

        updateState({ isLoading: true, audioState: 'loading', currentBlob: audioBlob });

        // Clean up previous audio URL
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }

        // Create new audio element if needed
        if (!audioRef.current) {
          audioRef.current = new Audio();
          setupAudioEvents(audioRef.current);
        }

        const audio = audioRef.current;
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        audio.src = audioUrl;
        audio.volume = state.volume;

        // Wait for audio to be ready and play
        await new Promise<void>((resolve, reject) => {
          const controller = getController();

          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleLoadError);
            resolve();
          };

          const handleLoadError = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleLoadError);
            reject(new Error('Failed to load audio'));
          };

          if (controller.signal.aborted) {
            reject(new Error('Operation was aborted'));
            return;
          }

          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('error', handleLoadError);

          controller.signal.addEventListener('abort', () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleLoadError);
            reject(new Error('Operation was aborted'));
          });
        });

        await audioRef.current.play();

      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to play audio'));
      }
    },

    pause: () => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    },

    stop: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        updateState({ currentTime: 0, isPlaying: false, audioState: 'idle' });
      }
    },

    seek: (time: number) => {
      if (audioRef.current && mounted.current) {
        const clampedTime = Math.max(0, Math.min(time, state.duration));
        audioRef.current.currentTime = clampedTime;
        updateState({ currentTime: clampedTime });
      }
    },

    download: (audioBlob: Blob, filename: string) => {
      try {
        if (!isClient) throw new Error('Download not available on server');

        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'audio.wav';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to download audio'));
      }
    },

    // Volume controls
    setVolume: (level: number) => {
      const clampedLevel = Math.max(0, Math.min(1, level));
      updateState({ volume: clampedLevel });
      if (audioRef.current) {
        audioRef.current.volume = clampedLevel;
      }
      if (volumeRef.current) {
        volumeRef.current.value = String(clampedLevel * 100);
      }
    },

    getVolume: () => state.volume,

    // Event handlers (set via props)
    onPlaybackEnd,
    onError
  };

  // ========== Utility Functions ==========
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== Event Handlers ==========
  const handlePlayPause = () => {
    if (!state.currentBlob) return;

    if (state.isPlaying) {
      audioPlayer.pause();
    } else if (state.audioState === 'paused') {
      audioRef.current?.play().catch(handleError);
    } else {
      audioPlayer.play(state.currentBlob);
    }
  };

  const handleStop = () => {
    audioPlayer.stop();
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value);
    const time = (progress / 100) * state.duration;
    audioPlayer.seek(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value) / 100;
    audioPlayer.setVolume(volume);
  };

  const handleDownload = () => {
    if (state.currentBlob) {
      audioPlayer.download(state.currentBlob, 'synthesized-audio.wav');
    }
  };

  // ========== Cleanup ==========
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // ========== Render ==========
  if (!isClient) {
    return (
      <div className={`audio-player-placeholder ${className}`}>
        <div className="loading-message">Loading audio player...</div>
      </div>
    );
  }

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const themeClass = theme === 'dark' ? 'audio-player-dark' : 'audio-player-light';

  return (
    <div className={`audio-player ${themeClass} ${className}`}>
      {/* Error Display */}
      {state.error && (
        <div className="audio-player-error">
          <span className="error-text">Error: {state.error}</span>
        </div>
      )}

      {/* Main Controls */}
      <div className="audio-player-controls">
        <button
          className="control-btn play-pause-btn"
          onClick={handlePlayPause}
          disabled={state.isLoading || !state.currentBlob}
          title={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isLoading ? (
            <span className="loading-spinner">⟳</span>
          ) : state.isPlaying ? (
            <span>⏸️</span>
          ) : (
            <span>▶️</span>
          )}
        </button>

        <button
          className="control-btn stop-btn"
          onClick={handleStop}
          disabled={!state.currentBlob || state.audioState === 'idle'}
          title="Stop"
        >
          <span>⏹️</span>
        </button>

        {/* Time Display */}
        <div className="time-display">
          <span>{formatTime(state.currentTime)}</span>
          <span>/</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <input
          ref={progressRef}
          type="range"
          className="progress-bar"
          min="0"
          max="100"
          value={progressPercent}
          onChange={handleProgressChange}
          disabled={!state.currentBlob || state.duration === 0}
        />
      </div>

      {/* Secondary Controls */}
      <div className="secondary-controls">
        {/* Volume Control */}
        {showVolumeControl && (
          <div className="volume-container">
            <span className="volume-icon">🔊</span>
            <input
              ref={volumeRef}
              type="range"
              className="volume-bar"
              min="0"
              max="100"
              value={state.volume * 100}
              onChange={handleVolumeChange}
            />
            <span className="volume-text">{Math.round(state.volume * 100)}%</span>
          </div>
        )}

        {/* Download Button */}
        {showDownloadButton && (
          <button
            className="control-btn download-btn"
            onClick={handleDownload}
            disabled={!state.currentBlob}
            title="Download Audio"
          >
            <span>⬇️</span>
          </button>
        )}
      </div>

      {/* Inline Styles for Self-containment */}
      <style jsx>{`
        .audio-player {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          background: #f9f9f9;
          max-width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .audio-player-dark {
          background: #2d2d2d;
          border-color: #555;
          color: white;
        }

        .audio-player-placeholder {
          padding: 16px;
          text-align: center;
          font-style: italic;
          color: #666;
        }

        .audio-player-error {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 12px;
        }

        .error-text {
          color: #c33;
          font-size: 14px;
        }

        .audio-player-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .control-btn {
          border: none;
          background: #007acc;
          color: white;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 16px;
          min-width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover:not(:disabled) {
          background: #005a9e;
        }

        .control-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .time-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          font-weight: 500;
          min-width: 90px;
        }

        .progress-container {
          margin-bottom: 12px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          outline: none;
          cursor: pointer;
        }

        .progress-bar::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #007acc;
          cursor: pointer;
        }

        .progress-bar:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .secondary-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .volume-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .volume-icon {
          font-size: 16px;
        }

        .volume-bar {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: #ddd;
          outline: none;
          cursor: pointer;
        }

        .volume-bar::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #007acc;
          cursor: pointer;
        }

        .volume-text {
          font-size: 12px;
          min-width: 35px;
          text-align: right;
        }

        .download-btn {
          background: #28a745;
        }

        .download-btn:hover:not(:disabled) {
          background: #218838;
        }

        .audio-player-dark .control-btn {
          background: #0d7377;
        }

        .audio-player-dark .control-btn:hover:not(:disabled) {
          background: #14a085;
        }

        .audio-player-dark .download-btn {
          background: #28a745;
        }

        .audio-player-dark .download-btn:hover:not(:disabled) {
          background: #34ce57;
        }
      `}</style>
    </div>
  );
};

// ========== Export with Contract ==========
export default AudioPlayerVertical;
export type { AudioPlayerContract };

// For external usage
export { AudioPlayerVertical as AudioPlayer };