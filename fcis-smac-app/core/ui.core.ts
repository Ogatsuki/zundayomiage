import { AppState, UIState, AppMachineContext } from '../contracts/types';

/**
 * XStateのコンテキストと状態からアプリケーション状態を構築（純粋関数）
 * @param stateValue XStateの状態値
 * @param context XStateのコンテキスト
 * @returns アプリケーション状態
 */
export function buildAppState(
  stateValue: string | { [key: string]: any },
  context: AppMachineContext
): AppState {
  const state = typeof stateValue === 'string' ? stateValue : Object.keys(stateValue)[0];

  switch (state) {
    case 'idle':
      return { type: 'idle' };
    case 'ocr_uploading':
      return { type: 'ocr_uploading', file: new File([], '') }; // Fileは Shell層で管理
    case 'ocr_processing':
      return { type: 'ocr_processing' };
    case 'ocr_complete':
      return { type: 'ocr_complete', text: context.ocrText };
    case 'tts_synthesizing':
      return { type: 'tts_synthesizing', text: context.ttsText, speakerId: context.speakerId };
    case 'tts_playing':
      return { type: 'tts_playing', audioUrl: context.audioUrl };
    case 'error':
      return {
        type: 'error',
        message: context.error?.message || 'エラーが発生しました',
        recoverable: context.error?.recoverable ?? true
      };
    default:
      return { type: 'idle' };
  }
}

/**
 * アプリケーション状態からUI状態を導出（純粋関数）
 * @param appState 現在のアプリケーション状態
 * @returns UI表示状態
 */
export function deriveUIState(appState: AppState): UIState {
  switch (appState.type) {
    case 'idle':
      return {
        showOCRSection: true,
        showTTSSection: true,
        isProcessing: false,
        canSubmitOCR: true,
        canSubmitTTS: true,
        progressMessage: undefined,
        errorMessage: undefined
      };

    case 'ocr_uploading':
      return {
        showOCRSection: true,
        showTTSSection: false,
        isProcessing: true,
        canSubmitOCR: false,
        canSubmitTTS: false,
        progressMessage: 'ファイルをアップロード中...',
        errorMessage: undefined
      };

    case 'ocr_processing':
      return {
        showOCRSection: true,
        showTTSSection: false,
        isProcessing: true,
        canSubmitOCR: false,
        canSubmitTTS: false,
        progressMessage: 'テキストを抽出中...',
        errorMessage: undefined
      };

    case 'ocr_complete':
      return {
        showOCRSection: true,
        showTTSSection: true,
        isProcessing: false,
        canSubmitOCR: true,
        canSubmitTTS: true,
        progressMessage: 'OCR処理が完了しました',
        errorMessage: undefined
      };

    case 'tts_synthesizing':
      return {
        showOCRSection: false,
        showTTSSection: true,
        isProcessing: true,
        canSubmitOCR: false,
        canSubmitTTS: false,
        progressMessage: '音声を生成中...',
        errorMessage: undefined
      };

    case 'tts_playing':
      return {
        showOCRSection: false,
        showTTSSection: true,
        isProcessing: false,
        canSubmitOCR: false,
        canSubmitTTS: true,
        progressMessage: '音声再生中',
        errorMessage: undefined
      };

    case 'error':
      return {
        showOCRSection: appState.recoverable,
        showTTSSection: appState.recoverable,
        isProcessing: false,
        canSubmitOCR: appState.recoverable,
        canSubmitTTS: appState.recoverable,
        progressMessage: undefined,
        errorMessage: appState.message
      };

    default:
      // 型の完全性チェック
      const _exhaustiveCheck: never = appState;
      return _exhaustiveCheck;
  }
}

/**
 * UIメッセージの生成（純粋関数）
 * @param state アプリケーション状態
 * @param context 追加コンテキスト
 * @returns ユーザー向けメッセージ
 */
export function generateUIMessage(
  state: AppState,
  context?: { characterCount?: number; duration?: number }
): string {
  switch (state.type) {
    case 'idle':
      return '画像をアップロードするか、テキストを入力してください';

    case 'ocr_uploading':
      return 'ファイルをアップロードしています...';

    case 'ocr_processing':
      return 'テキストを抽出しています...';

    case 'ocr_complete':
      if (context?.characterCount) {
        return `OCR完了: ${context.characterCount}文字を抽出しました`;
      }
      return 'OCR処理が完了しました';

    case 'tts_synthesizing':
      if (context?.duration) {
        return `音声を生成中... (推定時間: ${context.duration}秒)`;
      }
      return '音声を生成しています...';

    case 'tts_playing':
      return '音声を再生中です';

    case 'error':
      return state.message;

    default:
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
  }
}

/**
 * ボタンラベルの決定（純粋関数）
 * @param state 現在の状態
 * @param buttonType ボタンの種類
 * @returns ボタンのラベル
 */
export function getButtonLabel(
  state: AppState,
  buttonType: 'ocr' | 'tts'
): string {
  if (buttonType === 'ocr') {
    switch (state.type) {
      case 'ocr_uploading':
      case 'ocr_processing':
        return '処理中...';
      case 'ocr_complete':
        return '別の画像を読み込む';
      default:
        return '画像を読み込む';
    }
  } else {
    switch (state.type) {
      case 'tts_synthesizing':
        return '生成中...';
      case 'tts_playing':
        return '再生中...';
      default:
        return '音声を生成';
    }
  }
}

/**
 * プログレスバーの値を計算（純粋関数）
 * @param state 現在の状態
 * @param progress 進捗情報
 * @returns 0-100の進捗値
 */
export function calculateProgress(
  state: AppState,
  progress?: { current: number; total: number }
): number {
  switch (state.type) {
    case 'idle':
    case 'error':
      return 0;

    case 'ocr_uploading':
      return 25;

    case 'ocr_processing':
      if (progress) {
        return 25 + Math.floor((progress.current / progress.total) * 50);
      }
      return 50;

    case 'ocr_complete':
      return 75;

    case 'tts_synthesizing':
      if (progress) {
        return 75 + Math.floor((progress.current / progress.total) * 20);
      }
      return 85;

    case 'tts_playing':
      return 100;

    default:
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
  }
}

/**
 * UI要素の可視性を決定（純粋関数）
 * @param state 現在の状態
 * @returns UI要素の可視性マップ
 */
export function deriveUIVisibility(state: AppState): {
  fileInput: boolean;
  textInput: boolean;
  ocrResult: boolean;
  audioPlayer: boolean;
  errorAlert: boolean;
  progressBar: boolean;
} {
  return {
    fileInput: state.type === 'idle' || state.type === 'ocr_complete',
    textInput: state.type === 'idle' || state.type === 'ocr_complete',
    ocrResult: state.type === 'ocr_complete',
    audioPlayer: state.type === 'tts_playing',
    errorAlert: state.type === 'error',
    progressBar: ['ocr_uploading', 'ocr_processing', 'tts_synthesizing'].includes(state.type)
  };
}