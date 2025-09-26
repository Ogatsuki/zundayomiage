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
    serverUrl: process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
      ? 'mock://localhost'
      : (process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021'),
    version: null,
    lastChecked: null
  },
  retryCount: 0
};

// Services（副作用を含む処理）
const connectService = fromPromise(async ({ input }: { input: { apiUrl: string } }) => {
  const { apiUrl } = input;

  // モックモード判定
  const isMock = !apiUrl || apiUrl.includes('mock') || process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  if (isMock) {
    // モック接続処理（実サーバーへの接続なし）
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      isConnected: true,
      version: 'mock-1.0.0',
      serverUrl: 'mock://localhost'
    };
  }

  // 実際のAPI呼び出し
  try {
    const response = await fetch(`${apiUrl}/version`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const version = await response.text();
    return {
      isConnected: true,
      version: version || '0.14.0',
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
  const { text, speakerId, apiUrl } = input;

  // モックモード判定
  const isMock = !apiUrl || apiUrl.includes('mock') || process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  if (isMock) {
    // モック音声合成処理（実サーバーへの接続なし）
    // プログレス更新のための遅延
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ダミーのAudioBufferデータを生成
    // 実際の音声の長さに基づいてサイズを調整
    const estimatedDuration = Math.max(1.0, text.length * 0.1); // 文字数に基づく推定
    const sampleRate = 24000; // VOICEVOXの標準サンプルレート
    const channels = 1; // モノラル
    const bytesPerSample = 2; // 16bit
    const bufferSize = Math.floor(sampleRate * estimatedDuration * channels * bytesPerSample);

    const audioBuffer = new ArrayBuffer(bufferSize);

    return {
      audio: audioBuffer,
      duration: estimatedDuration
    };
  }

  // 実際のAPI呼び出し
  try {
    // 1. audio_query APIでクエリを取得
    const audioQueryResponse = await fetch(`${apiUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!audioQueryResponse.ok) {
      throw new Error(`Audio query failed: HTTP ${audioQueryResponse.status}`);
    }

    const audioQuery = await audioQueryResponse.json();

    // 2. synthesis APIで音声データを生成
    const synthesisResponse = await fetch(`${apiUrl}/synthesis?speaker=${speakerId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(audioQuery)
    });

    if (!synthesisResponse.ok) {
      throw new Error(`Audio synthesis failed: HTTP ${synthesisResponse.status}`);
    }

    const audioBuffer = await synthesisResponse.arrayBuffer();

    return {
      audio: audioBuffer,
      duration: audioQuery.outputSamplingRate ? audioBuffer.byteLength / (audioQuery.outputSamplingRate * 2) : 1.0
    };
  } catch (error) {
    throw new Error(`Audio synthesis failed: ${error}`);
  }
});

const playAudioService = fromPromise(async ({ input }: {
  input: {
    audioBuffers: ArrayBuffer[];
  }
}) => {
  const { audioBuffers } = input;

  // モックモード判定（ブラウザ環境でない場合もモック扱い）
  const isMock = typeof window === 'undefined' || process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  if (isMock) {
    // モック音声再生処理
    // 合計再生時間を推定して待機
    const estimatedDuration = audioBuffers.reduce((total, buffer) => {
      // バッファサイズから推定再生時間を計算
      const sampleRate = 24000;
      const bytesPerSample = 2;
      const duration = buffer.byteLength / (sampleRate * bytesPerSample);
      return total + duration;
    }, 0);

    console.log(`Mock playing ${audioBuffers.length} audio chunks (estimated ${estimatedDuration.toFixed(1)}s)`);

    // 推定時間分待機（最低1秒、最大10秒）
    const playbackTime = Math.max(1000, Math.min(10000, estimatedDuration * 1000));
    await new Promise(resolve => setTimeout(resolve, playbackTime));

    return { played: audioBuffers.length, duration: estimatedDuration };
  }

  // 実際のWeb Audio API実装
  try {
    const audioContext = new AudioContext();
    let totalDuration = 0;

    for (const buffer of audioBuffers) {
      const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
      totalDuration += audioBuffer.duration;

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      // 音声の再生完了を待つ
      await new Promise(resolve => {
        source.onended = resolve;
        setTimeout(resolve, audioBuffer.duration * 1000 + 100); // タイムアウト保護
      });
    }

    console.log(`Played ${audioBuffers.length} audio chunks (total: ${totalDuration.toFixed(1)}s)`);
    return { played: audioBuffers.length, duration: totalDuration };
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
            target: 'processing_next_chunk',
            guard: 'hasMoreChunksGuard',
            actions: [
              {
                type: 'storeAudioBufferAction',
                params: ({ event }) => ({
                  audioBuffer: event.output.audio || event.output
                })
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
                params: ({ event }) => ({
                  audioBuffer: event.output.audio || event.output
                })
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
      }
    },
    processing_next_chunk: {
      always: {
        target: 'synthesizing',
        guard: 'hasMoreChunksGuard'
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