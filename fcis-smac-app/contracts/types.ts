// アプリケーション状態定義
export type AppState =
  | { type: 'idle' }
  | { type: 'ocr_uploading'; file: File }
  | { type: 'ocr_processing' }
  | { type: 'ocr_complete'; text: string }
  | { type: 'tts_synthesizing'; text: string; speakerId: number }
  | { type: 'tts_playing'; audioUrl: string }
  | { type: 'error'; message: string; recoverable: boolean };

// 検証結果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Core層の関数インターフェース
export interface CoreFunctions {
  // OCR関連
  validateOCRFile: (file: File) => ValidationResult;
  normalizeOCRText: (text: string) => string;

  // TTS関連
  validateTTSRequest: (text: string, speakerId: number) => ValidationResult;
  buildTTSRequest: (text: string, speakerId: number) => {
    text: string;
    speaker: number;
    speedScale: number;
    volumeScale: number;
    intonationScale: number;
    prePhonemeLength: number;
    postPhonemeLength: number;
  };

  // UI導出
  deriveUIState: (appState: AppState) => UIState;
}

// UIState定義
export interface UIState {
  showOCRSection: boolean;
  showTTSSection: boolean;
  isProcessing: boolean;
  canSubmitOCR: boolean;
  canSubmitTTS: boolean;
  errorMessage?: string;
  progressMessage?: string;
}

// State Machine Context
export interface AppMachineContext {
  ocrText: string;
  ttsText: string;
  speakerId: number;
  audioUrl: string;
  error: { message: string; recoverable: boolean } | null;
}

// State Machine Events
export type AppMachineEvent =
  | { type: 'START_OCR'; file: File }
  | { type: 'OCR_PROCESS' }
  | { type: 'OCR_SUCCESS'; text: string }
  | { type: 'START_TTS'; text: string; speakerId: number }
  | { type: 'TTS_SUCCESS'; audioUrl: string }
  | { type: 'PLAY_COMPLETE' }
  | { type: 'ERROR'; message: string; recoverable: boolean }
  | { type: 'RESET' };