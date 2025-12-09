// ============================================================
// state.ts - TSD-107 ずんだ読み上げ State層
// ============================================================
// 責務: 状態管理とAPI通信
// - XStateによる状態機械
// - Core層の純粋関数を利用
// - API通信（VOICEVOX音声生成）
// - OCR処理（Tesseract.js）
// ============================================================

import { createMachine, assign, fromPromise, fromCallback, setup } from 'xstate';
import type {
  SpeakerId,
  InputMode,
  OcrProgress,
  AppStatus,
  StreamEvent,
} from './types';
import {
  INITIAL_STATE,
  CHUNK_TIMEOUT,
  API_ENDPOINT,
  SPEAKERS,
} from './types';
import { validateText, normalizeOcrText, validateOcrFile } from './core';

// ------------------------------------------------------------
// Context型定義
// ------------------------------------------------------------
export interface GenerateProgress {
  current: number;
  total: number;
}

export interface AppContext {
  text: string;
  speakerId: SpeakerId;
  inputMode: InputMode;
  ocrImage: File | null;
  ocrProgress: OcrProgress | null;
  generateProgress: GenerateProgress | null;
  audioBlob: Blob | null;
  error: string | null;
}

// ------------------------------------------------------------
// Event型定義
// ------------------------------------------------------------
export type AppEvent =
  | { type: 'SET_TEXT'; text: string }
  | { type: 'SET_SPEAKER'; speakerId: SpeakerId }
  | { type: 'SET_INPUT_MODE'; mode: InputMode }
  | { type: 'SET_OCR_IMAGE'; file: File | null }
  | { type: 'START_OCR' }
  | { type: 'GENERATE' }
  | { type: 'RESET' };

// ------------------------------------------------------------
// 初期Context
// ------------------------------------------------------------
const initialContext: AppContext = {
  text: INITIAL_STATE.text,
  speakerId: INITIAL_STATE.speakerId,
  inputMode: INITIAL_STATE.inputMode,
  ocrImage: INITIAL_STATE.ocrImage,
  ocrProgress: INITIAL_STATE.ocrProgress,
  generateProgress: null,
  audioBlob: INITIAL_STATE.audioBlob,
  error: INITIAL_STATE.error,
};

// ------------------------------------------------------------
// Actor定義（XState v5）
// ------------------------------------------------------------

/** 音声生成API呼び出しActor（ストリーミング対応・チャンクごとタイムアウトリセット） */
const generateAudioActor = fromCallback<
  | { type: 'GENERATE_PROGRESS'; current: number; total: number }
  | { type: 'GENERATE_COMPLETE'; audioBlob: Blob }
  | { type: 'GENERATE_ERROR'; error: string },
  { text: string; speakerId: SpeakerId }
>(({ input, sendBack }) => {
  const { text, speakerId } = input;

  // タイムアウト管理
  let timeoutId: ReturnType<typeof setTimeout>;
  const controller = new AbortController();

  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      controller.abort();
      sendBack({ type: 'GENERATE_ERROR', error: 'タイムアウトしました' });
    }, CHUNK_TIMEOUT);
  };

  (async () => {
    try {
      resetTimeout();

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: speakerId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('音声生成に失敗しました');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event: StreamEvent = JSON.parse(line);

            if (event.type === 'progress') {
              resetTimeout();
              sendBack({
                type: 'GENERATE_PROGRESS',
                current: event.current,
                total: event.total,
              });
            } else if (event.type === 'complete') {
              clearTimeout(timeoutId);
              // Base64をBlobに変換
              const binaryString = atob(event.audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'audio/wav' });
              sendBack({ type: 'GENERATE_COMPLETE', audioBlob: blob });
              return;
            } else if (event.type === 'error') {
              clearTimeout(timeoutId);
              sendBack({ type: 'GENERATE_ERROR', error: event.message });
              return;
            }
          } catch {
            // JSON parse error - skip
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        sendBack({ type: 'GENERATE_ERROR', error: 'タイムアウトしました' });
      } else {
        sendBack({
          type: 'GENERATE_ERROR',
          error: err instanceof Error ? err.message : '音声生成に失敗しました',
        });
      }
    }
  })();

  // クリーンアップ
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
});

/** OCR処理Actor */
const ocrActor = fromCallback<
  { type: 'OCR_PROGRESS'; progress: OcrProgress } | { type: 'OCR_COMPLETE'; text: string } | { type: 'OCR_ERROR'; error: string },
  { file: File }
>(({ input, sendBack }) => {
  const { file } = input;

  (async () => {
    try {
      const { createWorker } = await import('tesseract.js');

      sendBack({ type: 'OCR_PROGRESS', progress: { step: 'loading-core', progress: 0 } });

      const worker = await createWorker('jpn', 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            sendBack({ type: 'OCR_PROGRESS', progress: { step: 'loading-core', progress: Math.round((m.progress || 0) * 100) } });
          } else if (m.status === 'loading language traineddata') {
            sendBack({ type: 'OCR_PROGRESS', progress: { step: 'loading-lang', progress: Math.round((m.progress || 0) * 100) } });
          } else if (m.status === 'initializing api') {
            sendBack({ type: 'OCR_PROGRESS', progress: { step: 'initializing', progress: Math.round((m.progress || 0) * 100) } });
          } else if (m.status === 'recognizing text') {
            sendBack({ type: 'OCR_PROGRESS', progress: { step: 'recognizing', progress: Math.round((m.progress || 0) * 100) } });
          }
        },
      });

      try {
        const { data: { text } } = await worker.recognize(file);
        const normalizedText = normalizeOcrText(text);
        sendBack({ type: 'OCR_COMPLETE', text: normalizedText });
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      sendBack({ type: 'OCR_ERROR', error: err instanceof Error ? err.message : 'OCR処理に失敗しました' });
    }
  })();
});

// ------------------------------------------------------------
// XState Machine定義（v5 setup API）
// ------------------------------------------------------------
export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent
      | { type: 'OCR_PROGRESS'; progress: OcrProgress }
      | { type: 'OCR_COMPLETE'; text: string }
      | { type: 'OCR_ERROR'; error: string }
      | { type: 'GENERATE_PROGRESS'; current: number; total: number }
      | { type: 'GENERATE_COMPLETE'; audioBlob: Blob }
      | { type: 'GENERATE_ERROR'; error: string },
  },
  actors: {
    generateAudio: generateAudioActor,
    ocr: ocrActor,
  },
}).createMachine({
  id: 'app',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        SET_TEXT: {
          actions: assign({
            text: ({ event }) => event.text,
            error: () => null,
          }),
        },
        SET_SPEAKER: {
          actions: assign({
            speakerId: ({ event }) => event.speakerId,
            audioBlob: () => null,
            error: () => null,
          }),
        },
        SET_INPUT_MODE: {
          actions: assign({
            inputMode: ({ event }) => event.mode,
          }),
        },
        SET_OCR_IMAGE: {
          actions: assign(({ event }) => {
            if (event.file) {
              const validation = validateOcrFile(event.file);
              if (!validation.ok) {
                return { ocrImage: null, error: validation.error };
              }
            }
            return { ocrImage: event.file, error: null };
          }),
        },
        START_OCR: {
          target: 'ocr',
          guard: ({ context }) => context.ocrImage !== null,
        },
        GENERATE: [
          {
            // バリデーション失敗時: idleのまま、エラーメッセージ設定
            guard: ({ context }) => !validateText(context.text).ok,
            actions: assign(({ context }) => {
              const validation = validateText(context.text);
              return { error: validation.ok ? null : validation.error.message };
            }),
          },
          {
            // バリデーション成功時: generatingへ遷移
            target: 'generating',
            actions: assign({ error: () => null }),
          },
        ],
        RESET: {
          actions: assign(() => ({ ...initialContext })),
        },
      },
    },

    ocr: {
      invoke: {
        src: 'ocr',
        input: ({ context }) => ({ file: context.ocrImage! }),
      },
      on: {
        OCR_PROGRESS: {
          actions: assign({
            ocrProgress: ({ event }) => event.progress,
          }),
        },
        OCR_COMPLETE: {
          target: 'idle',
          actions: assign({
            text: ({ event }) => event.text,
            ocrProgress: () => null,
            ocrImage: () => null,
          }),
        },
        OCR_ERROR: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => event.error,
            ocrProgress: () => null,
          }),
        },
      },
    },

    generating: {
      invoke: {
        src: 'generateAudio',
        input: ({ context }) => ({ text: context.text, speakerId: context.speakerId }),
      },
      on: {
        GENERATE_PROGRESS: {
          actions: assign({
            generateProgress: ({ event }) => ({
              current: event.current,
              total: event.total,
            }),
          }),
        },
        GENERATE_COMPLETE: {
          target: 'success',
          actions: assign({
            audioBlob: ({ event }) => event.audioBlob,
            generateProgress: () => null,
          }),
        },
        GENERATE_ERROR: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => event.error,
            generateProgress: () => null,
          }),
        },
      },
    },

    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: assign(() => ({ ...initialContext })),
        },
        SET_TEXT: {
          target: 'idle',
          actions: assign({
            text: ({ event }) => event.text,
            audioBlob: () => null,
            error: () => null,
          }),
        },
        SET_SPEAKER: {
          target: 'idle',
          actions: assign({
            speakerId: ({ event }) => event.speakerId,
            audioBlob: () => null,
            error: () => null,
          }),
        },
      },
    },
  },
});

// ------------------------------------------------------------
// State派生値（Selector的な関数）
// ------------------------------------------------------------

/** 現在のステータスを取得 */
export function getAppStatus(state: { value: string }): AppStatus {
  switch (state.value) {
    case 'generating':
      return 'generating';
    case 'success':
      return 'success';
    case 'ocr':
      return 'generating';
    default:
      return 'idle';
  }
}

/** 生成ボタンが有効かどうか */
export function canGenerate(context: AppContext): boolean {
  const validation = validateText(context.text);
  return validation.ok;
}

/** 現在の話者設定を取得 */
export function getCurrentSpeakerConfig(context: AppContext) {
  return SPEAKERS[context.speakerId];
}

// ------------------------------------------------------------
// End of state.ts
// ------------------------------------------------------------
