// アプリケーション状態定義
export type AppState =
  | { type: 'idle' }
  | { type: 'ocr_uploading'; file: File }
  | { type: 'ocr_processing' }
  | { type: 'ocr_complete'; text: string }
  | { type: 'tts_preparing'; text: string; speakerId: number }
  | { type: 'tts_synthesizing'; text: string; speakerId: number; progress?: { current: number; total: number } }
  | { type: 'tts_merging'; progress?: { current: number; total: number } }
  | { type: 'tts_converting'; progress?: { current: number; total: number } }
  | { type: 'tts_ready'; audioUrl: string; fileName: string; format: 'mp3' }
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
  showDownloadButton: boolean;
  downloadFileName?: string;
  errorMessage?: string;
  progressMessage?: string;
  progressPercentage?: number;
}

// State Machine Context
export interface AppMachineContext {
  ocrText: string;
  ttsText: string;
  speakerId: number;
  audioUrl: string;
  audioFileName: string;
  audioFormat?: 'mp3';
  synthesisProgress?: {
    current: number;
    total: number;
    phase: 'chunking' | 'merging' | 'converting';
  };
  error: { message: string; recoverable: boolean } | null;
}

// State Machine Events
export type AppMachineEvent =
  | { type: 'START_OCR'; file: File }
  | { type: 'OCR_PROCESS' }
  | { type: 'OCR_SUCCESS'; text: string }
  | { type: 'START_TTS'; text: string; speakerId: number }
  | { type: 'CHUNK_START' }
  | { type: 'CHUNK_PROGRESS'; current: number; total: number }
  | { type: 'MERGE_START' }
  | { type: 'MERGE_PROGRESS'; current: number; total: number }
  | { type: 'CONVERT_START' }
  | { type: 'CONVERT_PROGRESS'; current: number; total: number }
  | { type: 'TTS_SUCCESS'; audioUrl: string; fileName: string; format: 'mp3' }
  | { type: 'DOWNLOAD' }
  | { type: 'ERROR'; message: string; recoverable: boolean }
  | { type: 'RESET' };