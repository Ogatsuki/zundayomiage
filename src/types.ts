// ============================================================
// types.ts - TSD-107 ずんだ読み上げ 契約ファイル
// ============================================================
// 全層がimportする唯一の契約定義
// Core/State/Shell 間の型契約を定義
// ============================================================

// ------------------------------------------------------------
// Result型（エラーハンドリング）
// ------------------------------------------------------------
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Result型ヘルパー
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// ------------------------------------------------------------
// 定数
// ------------------------------------------------------------
export const MAX_TEXT_LENGTH = 50000;
export const CHUNK_SIZE = 500;
export const CHUNK_TIMEOUT = 60000; // 1チャンクあたり60秒
export const SHORT_TEXT_TIMEOUT = 60000; // 60秒
export const LONG_TEXT_TIMEOUT = 1200000; // 20分（フォールバック用）
export const LONG_TEXT_THRESHOLD = 1000; // 1000文字以上で長文判定

// ------------------------------------------------------------
// Speaker（話者）
// ------------------------------------------------------------
export type SpeakerId = 2 | 3;

export interface SpeakerConfig {
  readonly id: SpeakerId;
  readonly name: string;
  readonly placeholder: string;
  readonly buttonText: string;
  readonly filenamePrefix: string;
}

export const SPEAKERS: Readonly<Record<SpeakerId, SpeakerConfig>> = {
  3: {
    id: 3,
    name: 'ずんだもん',
    placeholder: 'ここにテキストを入力するのだ！（最大50,000文字）',
    buttonText: 'ずんだもんの声で読み上げるのだ！',
    filenamePrefix: 'zundamon',
  },
  2: {
    id: 2,
    name: '四国めたん',
    placeholder: 'ここにテキストを入力してね！（最大50,000文字）',
    buttonText: '四国めたんの声で読み上げてね！',
    filenamePrefix: 'metan',
  },
} as const;

export const DEFAULT_SPEAKER_ID: SpeakerId = 3;

// ------------------------------------------------------------
// 入力モード
// ------------------------------------------------------------
export type InputMode = 'text' | 'ocr';

// ------------------------------------------------------------
// OCR関連
// ------------------------------------------------------------
export type OcrStep = 
  | 'loading-core'
  | 'loading-lang'
  | 'initializing'
  | 'recognizing';

export interface OcrProgress {
  readonly step: OcrStep;
  readonly progress: number; // 0-100
}

export const OCR_STEP_LABELS: Readonly<Record<OcrStep, string>> = {
  'loading-core': 'Tesseractコア読み込み中...',
  'loading-lang': '言語データ読み込み中...',
  'initializing': 'API初期化中...',
  'recognizing': 'テキスト認識中...',
} as const;

// OCRファイル制約
export const OCR_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const OCR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type OcrAllowedType = typeof OCR_ALLOWED_TYPES[number];

// ------------------------------------------------------------
// アプリケーション状態
// ------------------------------------------------------------
export type AppStatus = 'idle' | 'generating' | 'success' | 'error';

export interface AppState {
  readonly text: string;
  readonly speakerId: SpeakerId;
  readonly inputMode: InputMode;
  readonly ocrImage: File | null;
  readonly ocrProgress: OcrProgress | null;
  readonly status: AppStatus;
  readonly audioBlob: Blob | null;
  readonly error: string | null;
}

// 初期状態
export const INITIAL_STATE: AppState = {
  text: '',
  speakerId: DEFAULT_SPEAKER_ID,
  inputMode: 'text',
  ocrImage: null,
  ocrProgress: null,
  status: 'idle',
  audioBlob: null,
  error: null,
} as const;

// ------------------------------------------------------------
// バリデーションエラー
// ------------------------------------------------------------
export type ValidationErrorType = 'empty' | 'too_long' | 'whitespace_only';

export interface ValidationError {
  readonly type: ValidationErrorType;
  readonly message: string;
}

// ------------------------------------------------------------
// API関連
// ------------------------------------------------------------
export interface GenerateRequest {
  readonly text: string;
  readonly speaker: SpeakerId;
}

// APIエンドポイント
export const API_ENDPOINT = '/api/voicevox/generate';

// ストリーミング進捗型
export type StreamEventType = 'progress' | 'complete' | 'error';

export interface StreamProgressEvent {
  readonly type: 'progress';
  readonly current: number;
  readonly total: number;
}

export interface StreamCompleteEvent {
  readonly type: 'complete';
  readonly audio: string; // base64
}

export interface StreamErrorEvent {
  readonly type: 'error';
  readonly message: string;
}

export type StreamEvent = StreamProgressEvent | StreamCompleteEvent | StreamErrorEvent;

// ------------------------------------------------------------
// End of types.ts
// ------------------------------------------------------------
