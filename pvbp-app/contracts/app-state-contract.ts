/**
 * ========== App State Contract ==========
 * PVBP Protocol v1.0.0 Compliant
 * Runtime: universal
 *
 * Purpose: Define app-wide state coordination contract
 */

import type { AudioState } from './audio-player-contract';
import type { Character } from './character-contract';
import type { VoicevoxParameters } from './voice-parameters-contract';

export interface AppStateContract {
  // Text state
  text: {
    content: string;
    isValid: boolean;
    error?: string;
  };

  // Synthesis state
  synthesis: {
    isProcessing: boolean;
    progress: number;
    error?: string;
  };

  // Audio state
  audio: {
    state: AudioState;
    currentBlob?: Blob;
    error?: string;
  };

  // Character state
  character: {
    current: Character;
  };

  // Voice parameters
  parameters: VoicevoxParameters;

  // UI state
  ui: {
    isDarkMode: boolean;
    isCompactView: boolean;
  };
}

// Action types for state updates
export type AppAction =
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'START_SYNTHESIS' }
  | { type: 'END_SYNTHESIS'; payload: Blob }
  | { type: 'SET_ERROR'; payload: { source: 'text' | 'synthesis' | 'audio'; error: string } }
  | { type: 'CLEAR_ERROR'; payload: 'text' | 'synthesis' | 'audio' }
  | { type: 'SET_CHARACTER'; payload: Character }
  | { type: 'SET_PARAMETERS'; payload: Partial<VoicevoxParameters> }
  | { type: 'SET_AUDIO_STATE'; payload: AudioState };

// Event contract for state changes
export interface AppStateEventContract {
  onStateChange?: (state: Partial<AppStateContract>) => void;
  onError?: (source: string, error: Error) => void;
  onSynthesisComplete?: (audioBlob: Blob) => void;
}