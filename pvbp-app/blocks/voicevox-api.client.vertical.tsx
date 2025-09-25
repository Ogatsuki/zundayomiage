'use client';

const RUNTIME = 'client';

import { useState, useCallback, useRef, useEffect } from 'react';

// PVBP Runtime validation
if (typeof window === 'undefined') {
  throw new Error(`PVBP Runtime Error: Block requires RUNTIME='client' but executed in server context`);
}

// Hook for client-only execution
const useClientOnly = (callback: () => void) => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      callback();
    }
  }, [callback]);
};

// Hook for abort-safe operations
const useAbortSafe = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const createAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { createAbortController, abort };
};

// VOICEVOX Parameter types
export interface VoicevoxParameters {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
}

// Audio Query response type
interface AudioQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string;
      consonant?: string;
      consonant_length?: number;
      vowel: string;
      vowel_length: number;
      pitch: number;
    }>;
    accent: number;
    pause_mora?: {
      text: string;
      consonant?: string;
      consonant_length?: number;
      vowel: string;
      vowel_length: number;
      pitch: number;
    };
  }>;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

// Contract interface
export interface VoicevoxApiContract {
  readonly isConnected: boolean;
  readonly isSynthesizing: boolean;
  readonly progress: number;
  checkConnection(): Promise<boolean>;
  synthesize(text: string, speakerId: number, params: VoicevoxParameters): Promise<Blob>;
  cancelSynthesis(): void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

// VOICEVOX API client implementation
export const useVoicevoxApi = (): VoicevoxApiContract => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { createAbortController, abort } = useAbortSafe();

  const onProgressRef = useRef<((progress: number) => void) | undefined>();
  const onErrorRef = useRef<((error: Error) => void) | undefined>();

  const VOICEVOX_BASE_URL = 'http://localhost:50021';

  // Update progress with callback
  const updateProgress = useCallback((newProgress: number) => {
    setProgress(newProgress);
    if (onProgressRef.current) {
      onProgressRef.current(newProgress);
    }
  }, []);

  // Handle errors with callback
  const handleError = useCallback((error: Error) => {
    if (onErrorRef.current) {
      onErrorRef.current(error);
    }
  }, []);

  // Check VOICEVOX server connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = createAbortController();
      const response = await fetch(`${VOICEVOX_BASE_URL}/version`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setIsConnected(true);
      return true;
    } catch (error) {
      setIsConnected(false);
      if (error instanceof Error && error.name !== 'AbortError') {
        handleError(new Error(`Connection failed: ${error.message}`));
      }
      return false;
    }
  }, [createAbortController, handleError]);

  // Generate audio query
  const generateAudioQuery = async (
    text: string,
    speakerId: number,
    controller: AbortController
  ): Promise<AudioQuery> => {
    updateProgress(25);

    const response = await fetch(
      `${VOICEVOX_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Audio query failed: HTTP ${response.status} ${response.statusText}`);
    }

    const audioQuery = await response.json() as AudioQuery;
    updateProgress(50);
    return audioQuery;
  };

  // Apply parameters to audio query
  const applyParameters = (audioQuery: AudioQuery, params: VoicevoxParameters): AudioQuery => {
    return {
      ...audioQuery,
      speedScale: params.speedScale ?? audioQuery.speedScale,
      pitchScale: params.pitchScale ?? audioQuery.pitchScale,
      intonationScale: params.intonationScale ?? audioQuery.intonationScale,
      volumeScale: params.volumeScale ?? audioQuery.volumeScale,
      prePhonemeLength: params.prePhonemeLength ?? audioQuery.prePhonemeLength,
      postPhonemeLength: params.postPhonemeLength ?? audioQuery.postPhonemeLength,
    };
  };

  // Synthesize audio
  const synthesizeAudio = async (
    audioQuery: AudioQuery,
    speakerId: number,
    controller: AbortController
  ): Promise<Blob> => {
    updateProgress(75);

    const response = await fetch(
      `${VOICEVOX_BASE_URL}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'audio/wav',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery),
      }
    );

    if (!response.ok) {
      throw new Error(`Synthesis failed: HTTP ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    updateProgress(100);
    return audioBlob;
  };

  // Main synthesis function
  const synthesize = useCallback(async (
    text: string,
    speakerId: number,
    params: VoicevoxParameters = {}
  ): Promise<Blob> => {
    if (isSynthesizing) {
      throw new Error('Synthesis already in progress');
    }

    setIsSynthesizing(true);
    updateProgress(0);

    try {
      const controller = createAbortController();

      // Step 1: Generate audio query
      const audioQuery = await generateAudioQuery(text, speakerId, controller);

      // Step 2: Apply parameters
      const modifiedQuery = applyParameters(audioQuery, params);

      // Step 3: Synthesize audio
      const audioBlob = await synthesizeAudio(modifiedQuery, speakerId, controller);

      return audioBlob;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          handleError(new Error('Network error: Please check if VOICEVOX server is running on localhost:50021'));
        } else if (error.message.includes('CORS')) {
          handleError(new Error('CORS error: VOICEVOX server may not allow cross-origin requests'));
        } else {
          handleError(error);
        }
      }
      throw error;
    } finally {
      setIsSynthesizing(false);
      updateProgress(0);
    }
  }, [isSynthesizing, createAbortController, updateProgress, handleError]);

  // Cancel synthesis
  const cancelSynthesis = useCallback(() => {
    abort();
    setIsSynthesizing(false);
    updateProgress(0);
  }, [abort, updateProgress]);

  // Initialize connection check on client
  useClientOnly(() => {
    checkConnection();
  });

  // Contract implementation
  return {
    isConnected,
    isSynthesizing,
    progress,
    checkConnection,
    synthesize,
    cancelSynthesis,
    get onProgress() {
      return onProgressRef.current;
    },
    set onProgress(callback) {
      onProgressRef.current = callback;
    },
    get onError() {
      return onErrorRef.current;
    },
    set onError(callback) {
      onErrorRef.current = callback;
    },
  };
};

// Default export for PVBP compliance
export default useVoicevoxApi;