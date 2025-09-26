/**
 * FCIS+SMAC Architecture - State Layer
 * VOICEVOX音声合成のXState状態マシン実装
 * XState v5を使用した状態管理
 */

import { setup, assign, fromPromise } from 'xstate';
import {
  validateText,
  splitTextIntoChunks,
  calculateSynthesisProgress,
  unwrap,
  unwrapError,
  type ValidText,
  type TextChunk,
  type ValidationError,
  type ProgressPercentage
} from '../core/voicevox.core';

// Context型定義
export interface VoicevoxContext {
  text: string;
  speakerId: number;
  chunks: TextChunk[];
  currentChunkIndex: number;
  audioBuffers: ArrayBuffer[];
  progress: number;
  error: ErrorInfo | null;
  connectionStatus: ConnectionStatus;
  retryCount: number;
}

// 状態型定義
export type VoicevoxState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'synthesizing'
  | 'playing'
  | 'error';

// イベント型定義
export type VoicevoxEvent =
  | { type: 'CONNECT' }
  | { type: 'SUCCESS' }
  | { type: 'FAILURE'; error: string }
  | { type: 'SYNTHESIZE'; text: string; speakerId: number }
  | { type: 'CHUNK_COMPLETE' }
  | { type: 'ALL_COMPLETE' }
  | { type: 'PLAYBACK_END' }
  | { type: 'STOP' }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'DISCONNECT' };

// エラー情報型
export interface ErrorInfo {
  type: 'network' | 'validation' | 'synthesis' | 'playback' | 'unknown';
  message: string;
  timestamp: Date;
  retryable: boolean;
}

// 接続状態型
export interface ConnectionStatus {
  isConnected: boolean;
  serverUrl: string;
  version: string | null;
  lastChecked: Date | null;
}

// 初期コンテキスト
const initialContext: VoicevoxContext = {
  text: '',
  speakerId: 3, // ずんだもんのデフォルト
  chunks: [],
  currentChunkIndex: 0,
  audioBuffers: [],
  progress: 0,
  error: null,
  connectionStatus: {
    isConnected: false,
    serverUrl: 'http://localhost:50021',
    version: null,
    lastChecked: null
  },
  retryCount: 0
};

// Services（副作用を含む処理）
const connectService = fromPromise(async ({ input }: { input: { apiUrl: string } }) => {
  // モック接続処理
  const { apiUrl } = input;

  // 実際の実装では、VOICEVOXサーバーへの接続確認を行う
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 接続テスト（簡単なヘルスチェック）
  try {
    // 実装例: const response = await fetch(`${apiUrl}/version`);
    // モックでは成功を仮定
    return {
      isConnected: true,
      version: '0.14.0',
      serverUrl: apiUrl
    };
  } catch (error) {
    throw new Error(`VOICEVOX server connection failed: ${error}`);
  }
});

const synthesizeService = fromPromise(async ({ input }: {
  input: {
    text: string;
    speakerId: number;
    apiUrl: string;
  }
}) => {
  // モック音声合成処理
  const { text, speakerId, apiUrl } = input;

  // 実際の実装では、VOICEVOX APIを呼び出して音声合成を行う
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 実装例:
    // 1. audio_query APIでクエリを取得
    // 2. synthesis APIで音声データを生成
    // const audioQuery = await fetchAudioQuery(apiUrl, text, speakerId);
    // const audioBuffer = await synthesizeAudio(apiUrl, audioQuery, speakerId);

    // モックではダミーのArrayBufferを返す
    const dummyBuffer = new ArrayBuffer(44100 * 2); // 1秒分のダミー音声データ
    return dummyBuffer;
  } catch (error) {
    throw new Error(`Audio synthesis failed: ${error}`);
  }
});

const playAudioService = fromPromise(async ({ input }: {
  input: {
    audioBuffers: ArrayBuffer[];
  }
}) => {
  // モック音声再生処理
  const { audioBuffers } = input;

  // 実際の実装では、Web Audio APIを使用して音声を再生
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // 実装例:
    // const audioContext = new AudioContext();
    // for (const buffer of audioBuffers) {
    //   const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
    //   const source = audioContext.createBufferSource();
    //   source.buffer = audioBuffer;
    //   source.connect(audioContext.destination);
    //   source.start();
    //   await waitForAudioEnd(source);
    // }

    console.log(`Played ${audioBuffers.length} audio chunks`);
  } catch (error) {
    throw new Error(`Audio playback failed: ${error}`);
  }
});

// XState マシン定義
export const voicevoxMachine = setup({
  types: {} as {
    context: VoicevoxContext;
    events: VoicevoxEvent;
  },
  actors: {
    connectService,
    synthesizeService,
    playAudioService
  },
  actions: {
    // Action: テキスト検証
    validateTextAction: assign(({ context, event }) => {
      if (event.type !== 'SYNTHESIZE') return context;

      const validation = validateText(event.text);
      const validText = unwrap(validation);
      const errorInfo = unwrapError(validation);

      if (!validText) {
        return {
          ...context,
          error: {
            type: 'validation' as const,
            message: errorInfo?.message || 'テキスト検証に失敗しました',
            timestamp: new Date(),
            retryable: false
          }
        };
      }

      return {
        ...context,
        text: event.text,
        speakerId: event.speakerId,
        error: null
      };
    }),

    // Action: テキスト分割
    splitTextAction: assign(({ context }) => {
      const validationResult = validateText(context.text);
      const validText = unwrap(validationResult);

      if (!validText) {
        return context;
      }

      const chunks = splitTextIntoChunks(validText);
      return {
        ...context,
        chunks,
        currentChunkIndex: 0,
        progress: 0
      };
    }),

    // Action: 進捗更新と次チャンクインデックスへの更新（一品性を保証）
    updateProgressAction: assign(({ context }) => {
      const nextIndex = context.currentChunkIndex + 1;
      const progress = calculateSynthesisProgress(nextIndex, context.chunks.length);
      return {
        ...context,
        currentChunkIndex: nextIndex,
        progress: unwrap({ success: true, value: progress }) || 0
      };
    }),

    // Action: オーディオバッファ保存
    storeAudioBufferAction: assign(({ context }, params: { audioBuffer: ArrayBuffer }) => {
      return {
        ...context,
        audioBuffers: [...context.audioBuffers, params.audioBuffer]
      };
    }),

    // Action: リトライカウント増加
    incrementRetryAction: assign(({ context }) => {
      return {
        ...context,
        retryCount: context.retryCount + 1
      };
    }),

    // Action: コンテキスト初期化
    resetContextAction: assign(() => {
      return {
        ...initialContext
      };
    }),

    // Action: 接続成功処理
    setConnectionSuccessAction: assign(({ context }, params: {
      isConnected: boolean;
      version: string;
      serverUrl: string;
    }) => {
      return {
        ...context,
        connectionStatus: {
          isConnected: params.isConnected,
          serverUrl: params.serverUrl,
          version: params.version,
          lastChecked: new Date()
        },
        retryCount: 0,
        error: null
      };
    }),

    // Action: エラー設定
    setErrorAction: assign(({ context }, params: { error: string }) => {
      return {
        ...context,
        error: {
          type: 'network' as const,
          message: params.error,
          timestamp: new Date(),
          retryable: true
        }
      };
    }),

    // Action: 音声バッファクリア
    clearAudioBuffersAction: assign(({ context }) => {
      return {
        ...context,
        audioBuffers: [],
        currentChunkIndex: 0,
        progress: 0
      };
    })
  },
  guards: {
    // Guard: リトライ可能判定
    canRetryGuard: ({ context }) => {
      return context.retryCount < 3 &&
             context.error?.retryable === true;
    },

    // Guard: 未処理チャンク判定（次のインデックスでチェック）
    hasMoreChunksGuard: ({ context }) => {
      const nextIndex = context.currentChunkIndex + 1;
      return nextIndex < context.chunks.length;
    },

    // Guard: テキスト検証
    isValidTextGuard: ({ context, event }) => {
      if (event.type !== 'SYNTHESIZE') return false;

      const textValidation = validateText(event.text);
      return unwrap(textValidation) !== null;
    },

    // Guard: 接続状態判定
    isConnectedGuard: ({ context }) => {
      return context.connectionStatus.isConnected;
    },

    // Guard: 全チャンク完了判定（次のインデックスでチェック）
    allChunksCompleteGuard: ({ context }) => {
      const nextIndex = context.currentChunkIndex + 1;
      return nextIndex >= context.chunks.length;
    }
  }
}).createMachine({
  id: 'voicevoxMachine',
  initial: 'idle',
  context: initialContext,
  states: {
    idle: {
      on: {
        CONNECT: {
          target: 'connecting'
        }
      }
    },
    connecting: {
      invoke: {
        src: 'connectService',
        input: ({ context }) => ({
          apiUrl: context.connectionStatus.serverUrl
        }),
        onDone: {
          target: 'connected',
          actions: {
            type: 'setConnectionSuccessAction',
            params: ({ event }) => event.output
          }
        },
        onError: {
          target: 'error',
          actions: {
            type: 'setErrorAction',
            params: ({ event }) => ({
              error: event.error instanceof Error ? event.error.message : String(event.error)
            })
          }
        }
      }
    },
    connected: {
      on: {
        SYNTHESIZE: {
          target: 'synthesizing',
          guard: 'isValidTextGuard',
          actions: ['validateTextAction', 'splitTextAction', 'clearAudioBuffersAction']
        },
        DISCONNECT: {
          target: 'idle'
        }
      }
    },
    synthesizing: {
      invoke: {
        src: 'synthesizeService',
        input: ({ context }) => {
          const currentChunk = context.chunks[context.currentChunkIndex];
          return {
            text: currentChunk.text,
            speakerId: context.speakerId,
            apiUrl: context.connectionStatus.serverUrl
          };
        },
        onDone: [
          {
            target: '.', // 内部遷移で再実行を保証
            guard: 'hasMoreChunksGuard',
            reenter: true, // XState v5: 状態の再入を明示的に指定
            actions: [
              {
                type: 'storeAudioBufferAction',
                params: ({ event }) => ({ audioBuffer: event.output })
              },
              'updateProgressAction'
            ]
          },
          {
            target: 'playing',
            guard: 'allChunksCompleteGuard',
            actions: [
              {
                type: 'storeAudioBufferAction',
                params: ({ event }) => ({ audioBuffer: event.output })
              },
              'updateProgressAction'
            ]
          }
        ],
        onError: {
          target: 'error',
          actions: {
            type: 'setErrorAction',
            params: ({ event }) => ({
              error: event.error instanceof Error ? event.error.message : String(event.error)
            })
          }
        }
      },
      on: {
        // synthesizing状態内での内部遷移を追加
        CHUNK_COMPLETE: {
          target: '.', // 内部遷移（自分自身への遷移）
          guard: 'hasMoreChunksGuard',
          reenter: true, // サービスの再実行を保証
          actions: 'updateProgressAction'
        },
        ALL_COMPLETE: {
          target: 'playing',
          guard: 'allChunksCompleteGuard'
        },
        FAILURE: {
          target: 'error',
          actions: {
            type: 'setErrorAction',
            params: ({ event }) => ({ error: event.error })
          }
        }
      }
    },
    playing: {
      invoke: {
        src: 'playAudioService',
        input: ({ context }) => ({
          audioBuffers: context.audioBuffers
        }),
        onDone: {
          target: 'connected'
        },
        onError: {
          target: 'error',
          actions: {
            type: 'setErrorAction',
            params: ({ event }) => ({
              error: event.error instanceof Error ? event.error.message : String(event.error)
            })
          }
        }
      },
      on: {
        PLAYBACK_END: {
          target: 'connected'
        },
        STOP: {
          target: 'connected'
        }
      }
    },
    error: {
      on: {
        RETRY: {
          target: 'connecting',
          guard: 'canRetryGuard',
          actions: 'incrementRetryAction'
        },
        RESET: {
          target: 'idle',
          actions: 'resetContextAction'
        }
      }
    }
  }
});

// 型エクスポート
export type VoicevoxMachine = typeof voicevoxMachine;
export type VoicevoxActor = ReturnType<typeof voicevoxMachine.provide>;

// ヘルパー関数
export const createVoicevoxActor = (config?: Partial<{ serverUrl: string; maxRetries: number }>) => {
  const mergedContext = {
    ...initialContext,
    connectionStatus: {
      ...initialContext.connectionStatus,
      serverUrl: config?.serverUrl || initialContext.connectionStatus.serverUrl
    }
  };

  // XState v5では直接マシンからactorを作成
  return voicevoxMachine;
};

// 状態チェックヘルパー
export const isIdle = (state: any) => state.matches('idle');
export const isConnecting = (state: any) => state.matches('connecting');
export const isConnected = (state: any) => state.matches('connected');
export const isSynthesizing = (state: any) => state.matches('synthesizing');
export const isPlaying = (state: any) => state.matches('playing');
export const isError = (state: any) => state.matches('error');

// プログレス取得ヘルパー
export const getProgress = (context: VoicevoxContext): number => {
  return context.progress;
};

// エラー取得ヘルパー
export const getError = (context: VoicevoxContext): ErrorInfo | null => {
  return context.error;
};

// 接続状態取得ヘルパー
export const getConnectionStatus = (context: VoicevoxContext): ConnectionStatus => {
  return context.connectionStatus;
};

// チャンク情報取得ヘルパー
export const getChunksInfo = (context: VoicevoxContext): { current: number; total: number } => {
  return {
    current: context.currentChunkIndex,
    total: context.chunks.length
  };
};

// 音声バッファ取得ヘルパー
export const getAudioBuffers = (context: VoicevoxContext): ArrayBuffer[] => {
  return context.audioBuffers;
};

// リトライ可能判定ヘルパー
export const canRetry = (context: VoicevoxContext): boolean => {
  return context.retryCount < 3 && context.error?.retryable === true;
};

// Selectors（後方互換性のため）
export const selectors = {
  isIdle,
  isConnecting,
  isConnected,
  isSynthesizing,
  isPlaying,
  isError,
  getProgress: (state: any) => getProgress(state.context),
  getError: (state: any) => getError(state.context),
  getConnectionStatus: (state: any) => getConnectionStatus(state.context),
  getChunksInfo: (state: any) => getChunksInfo(state.context),
  getAudioBuffers: (state: any) => getAudioBuffers(state.context),
  canRetry: (state: any) => canRetry(state.context)
};