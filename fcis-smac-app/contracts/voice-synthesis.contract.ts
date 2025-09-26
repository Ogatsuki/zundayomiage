// Voice Synthesis Contract: Interface definition for FCIS+SMAC Shell layer
// Defines the exact interface that the Shell layer must provide

export interface ErrorInfo {
  code: string;
  message: string;
  isRetryable: boolean;
  retryCount: number;
}

export interface SynthesisProgress {
  percentage: number;
  processedChunks: number;
  totalChunks: number;
  isLongText: boolean;
}

export interface SynthesisConfig {
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
}

// Main contract interface - this is what the Shell layer must implement
export interface VoiceSynthesisContract {
  // Core synthesis operations
  synthesizeVoice: (text: string, speakerId: number) => Promise<void>;
  stopSynthesis: () => void;

  // Progress and status
  getProgress: () => SynthesisProgress;
  isConnected: () => boolean;

  // Error handling
  error: ErrorInfo | null;

  // State queries
  isIdle: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;

  // Configuration
  updateConfig: (config: Partial<SynthesisConfig>) => void;
  getConfig: () => SynthesisConfig;

  // Speaker management
  updateSpeaker: (speakerId: number) => void;
  getSpeakerId: () => number;

  // Audio output
  getFinalAudio: () => Blob | null;

  // Retry functionality
  retryLastSynthesis: () => void;
  canRetry: () => boolean;

  // Reset functionality
  reset: () => void;
}

// Component props contract
export interface VoicevoxSynthesisBlockProps {
  text: string;
  speakerId: number;
  onComplete?: (audio: Blob) => void;
  onError?: (error: ErrorInfo) => void;
  onProgressUpdate?: (progress: SynthesisProgress) => void;
  className?: string;
  disabled?: boolean;
}

// Runtime declaration for PVBP
export const RUNTIME = 'client' as const;