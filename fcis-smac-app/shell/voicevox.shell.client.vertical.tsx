'use client';

/**
 * FCIS+SMAC Shell層実装
 * Voicevox音声合成のIOレイヤー - Core層とState層を統合
 *
 * 責務:
 * - HTTP通信（副作用）
 * - 音声再生（副作用）
 * - エラーハンドリング（副作用）
 * - React 18 StrictMode対応
 * - XStateマシンとの統合
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { fromPromise } from 'xstate';
import {
  voicevoxMachine,
  createVoicevoxActor,
  isIdle,
  isConnecting,
  isConnected,
  isSynthesizing,
  isPlaying,
  isError,
  getProgress,
  getError,
  getConnectionStatus,
  getChunksInfo,
  canRetry,
  type VoicevoxContext,
  type ErrorInfo as StateErrorInfo,
  type ConnectionStatus
} from '../state/voicevox.machine';
import type {
  ValidText,
  TextChunk,
  AudioQuery,
  validateText,
  splitTextIntoChunks,
  buildAudioQuery,
  classifyHttpError,
  applyConfigToAudioQuery,
  unwrap,
  unwrapError,
  TimeoutConfig,
  NetworkConfig,
  TimeoutError,
  createDefaultNetworkConfig,
  createTimeoutAbortController,
  createTimeoutError,
  isTimeoutError
} from '../core/voicevox.core';
import * as VoiceCore from '../core/voicevox.core';
import type {
  VoiceSynthesisContract,
  VoicevoxSynthesisBlockProps,
  ErrorInfo,
  SynthesisProgress,
  SynthesisConfig
} from '../contracts/voice-synthesis.contract';

// ===== React 18 StrictMode対応ユーティリティ =====

/**
 * useEffectOnce - React 18 StrictModeで副作用を1回だけ実行
 */
const useEffectOnce = (effect: () => void | (() => void)) => {
  const hasRun = useRef(false);
  const cleanupRef = useRef<(() => void) | void>();

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      cleanupRef.current = effect();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, []);
};

/**
 * useAbortSafe - AbortController管理で安全なHTTP通信
 */
const useAbortSafe = () => {
  const abortControllerRef = useRef<AbortController>();

  const createAbortController = useCallback(() => {
    // 既存のControllerがあればabort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
    }
  }, []);

  const getSignal = useCallback(() => {
    return abortControllerRef.current?.signal;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    createAbortController,
    abort,
    getSignal,
    isAborted: () => abortControllerRef.current?.signal.aborted || false
  };
};

// ===== エラー処理ユーティリティ =====

/**
 * HTTPレスポンスからエラー詳細を取得
 */
const getDetailedErrorMessage = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      return errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    } else {
      const errorText = await response.text();
      return errorText || `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
};

/**
 * VOICEVOXエラー用のログ記録
 */
const logVoicevoxError = (context: string, error: unknown, details?: string): void => {
  console.error(`[VoiceVox Shell] ${context}:`, {
    error: error instanceof Error ? error.message : String(error),
    details,
    timestamp: new Date().toISOString()
  });
};

// ===== 副作用処理（Shell層の責務） =====

/**
 * HTTP通信 - Audio Query取得（30秒タイムアウト付き）
 */
const fetchAudioQuery = async (
  text: string,
  speakerId: number,
  apiUrl: string,
  signal?: AbortSignal,
  timeoutMs: number = 30_000
): Promise<AudioQuery> => {
  const queryRequest = VoiceCore.buildAudioQuery(text, speakerId);
  const url = `${apiUrl}/audio_query?text=${encodeURIComponent(queryRequest.text)}&speaker=${queryRequest.speaker}`;

  // タイムアウト用AbortControllerを作成
  const timeoutController = VoiceCore.createTimeoutAbortController(timeoutMs);

  // 既存のsignalとタイムアウトsignalを組み合わせ
  const combinedController = new AbortController();

  const handleAbort = () => {
    combinedController.abort();
    timeoutController.cleanup();
  };

  if (signal) {
    signal.addEventListener('abort', handleAbort);
  }

  timeoutController.controller.signal.addEventListener('abort', handleAbort);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorType = VoiceCore.classifyHttpError(response.status);
      const errorDetails = await getDetailedErrorMessage(response);
      const errorMessage = `Audio query failed: ${errorDetails}`;

      logVoicevoxError('fetchAudioQuery', errorMessage, `Status: ${response.status}, URL: ${url}`);
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && VoiceCore.isTimeoutError(error)) {
      const timeoutError = VoiceCore.createTimeoutError('AUDIO_QUERY', timeoutMs);
      logVoicevoxError('fetchAudioQuery', timeoutError.message, `URL: ${url}, Timeout: ${timeoutMs}ms`);
      throw new Error(timeoutError.message);
    }
    throw error;
  } finally {
    timeoutController.cleanup();
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
};

/**
 * HTTP通信 - 音声合成（60秒タイムアウト付き）
 */
const synthesizeAudio = async (
  audioQuery: AudioQuery,
  speakerId: number,
  apiUrl: string,
  signal?: AbortSignal,
  timeoutMs: number = 60_000
): Promise<ArrayBuffer> => {
  const url = `${apiUrl}/synthesis?speaker=${speakerId}`;

  // タイムアウト用AbortControllerを作成
  const timeoutController = VoiceCore.createTimeoutAbortController(timeoutMs);

  // 既存のsignalとタイムアウトsignalを組み合わせ
  const combinedController = new AbortController();

  const handleAbort = () => {
    combinedController.abort();
    timeoutController.cleanup();
  };

  if (signal) {
    signal.addEventListener('abort', handleAbort);
  }

  timeoutController.controller.signal.addEventListener('abort', handleAbort);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(audioQuery),
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorType = VoiceCore.classifyHttpError(response.status);
      const errorDetails = await getDetailedErrorMessage(response);
      const errorMessage = `Audio synthesis failed: ${errorDetails}`;

      logVoicevoxError('synthesizeAudio', errorMessage, `Status: ${response.status}, Speaker: ${speakerId}`);
      throw new Error(errorMessage);
    }

    return response.arrayBuffer();
  } catch (error) {
    if (error instanceof Error && VoiceCore.isTimeoutError(error)) {
      const timeoutError = VoiceCore.createTimeoutError('SYNTHESIS', timeoutMs);
      logVoicevoxError('synthesizeAudio', timeoutError.message, `URL: ${url}, Speaker: ${speakerId}, Timeout: ${timeoutMs}ms`);
      throw new Error(timeoutError.message);
    }
    throw error;
  } finally {
    timeoutController.cleanup();
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
};

/**
 * 音声再生処理
 */
const playAudio = async (audioBlob: Blob): Promise<void> => {
  const audio = new Audio(URL.createObjectURL(audioBlob));

  return new Promise((resolve, reject) => {
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audio.src);
      resolve();
    });

    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(audio.src);
      const errorMessage = 'Audio playback failed';
      logVoicevoxError('playAudio', errorMessage, `Audio URL: ${audio.src}`);
      reject(new Error(errorMessage));
    });

    audio.play().catch((playError) => {
      URL.revokeObjectURL(audio.src);
      const errorMessage = `Audio play failed: ${playError instanceof Error ? playError.message : String(playError)}`;
      logVoicevoxError('playAudio', errorMessage, `Audio duration: ${audio.duration}`);
      reject(new Error(errorMessage));
    });
  });
};

/**
 * 接続確認処理（10秒タイムアウト付き）
 */
const checkConnection = async (
  apiUrl: string,
  signal?: AbortSignal,
  timeoutMs: number = 10_000
): Promise<{ isConnected: boolean; version: string; serverUrl: string }> => {
  // タイムアウト用AbortControllerを作成
  const timeoutController = VoiceCore.createTimeoutAbortController(timeoutMs);

  // 既存のsignalとタイムアウトsignalを組み合わせ
  const combinedController = new AbortController();

  const handleAbort = () => {
    combinedController.abort();
    timeoutController.cleanup();
  };

  if (signal) {
    signal.addEventListener('abort', handleAbort);
  }

  timeoutController.controller.signal.addEventListener('abort', handleAbort);

  try {
    const response = await fetch(`${apiUrl}/version`, {
      method: 'GET',
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorDetails = await getDetailedErrorMessage(response);
      const errorMessage = `VOICEVOX server connection failed: ${errorDetails}`;
      logVoicevoxError('checkConnection', errorMessage, `Status: ${response.status}, URL: ${apiUrl}`);
      throw new Error(errorMessage);
    }

    const version = await response.text();
    return {
      isConnected: true,
      version: version || '0.14.0',
      serverUrl: apiUrl
    };
  } catch (error) {
    if (error instanceof Error && VoiceCore.isTimeoutError(error)) {
      const errorMessage = `VOICEVOX server connection timeout (${timeoutMs}ms): ${apiUrl}`;
      logVoicevoxError('checkConnection', errorMessage, `URL: ${apiUrl}, Timeout: ${timeoutMs}ms`);
      throw new Error(errorMessage);
    }

    const errorMessage = error instanceof Error ? error.message : `VOICEVOX server connection failed: ${String(error)}`;
    logVoicevoxError('checkConnection', errorMessage, `URL: ${apiUrl}`);
    throw new Error(errorMessage);
  } finally {
    timeoutController.cleanup();
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }
};

// ===== useVoicevoxSynthesis Hook実装 =====

export function useVoicevoxSynthesis(): VoiceSynthesisContract {
  const [state, send] = useMachine(
    voicevoxMachine.provide({
      actors: {
        connectService: fromPromise(async ({ input }: { input: { apiUrl: string } }) => {
          try {
            return await checkConnection(input.apiUrl);
          } catch (error) {
            logVoicevoxError('connectService', error, `Attempting connection to: ${input.apiUrl}`);
            throw error;
          }
        }),
        synthesizeService: fromPromise(async ({ input }: {
          input: { text: string; speakerId: number; apiUrl: string }
        }) => {
          const { text, speakerId, apiUrl } = input;
          try {
            console.log(`[VoiceVox Shell] synthesizeService: Starting synthesis`, {
              textPreview: text.substring(0, 50) + '...',
              speakerId,
              timestamp: new Date().toISOString()
            });
            const audioQuery = await fetchAudioQuery(text, speakerId, apiUrl);
            const audioBuffer = await synthesizeAudio(audioQuery, speakerId, apiUrl);
            return audioBuffer;
          } catch (error) {
            logVoicevoxError('synthesizeService', error, `Failed synthesis - Text length: ${text.length}, Speaker: ${speakerId}`);
            throw error;
          }
        }),
        playAudioService: fromPromise(async ({ input }: {
          input: { audioBuffers: ArrayBuffer[] }
        }) => {
          try {
            // 音声バッファを結合してBlobとして再生
            if (input.audioBuffers.length === 0) {
              logVoicevoxError('playAudioService', 'No audio buffers provided', 'Empty buffer array');
              return;
            }

            let combinedBuffer: ArrayBuffer;
            if (input.audioBuffers.length === 1) {
              combinedBuffer = input.audioBuffers[0];
            } else {
              const totalLength = input.audioBuffers.reduce((sum: number, buffer: ArrayBuffer) => sum + buffer.byteLength, 0);
              const combined = new Uint8Array(totalLength);
              let offset = 0;
              for (const buffer of input.audioBuffers) {
                combined.set(new Uint8Array(buffer), offset);
                offset += buffer.byteLength;
              }
              combinedBuffer = combined.buffer;
            }

            const audioBlob = new Blob([combinedBuffer], { type: 'audio/wav' });
            await playAudio(audioBlob);
          } catch (error) {
            logVoicevoxError('playAudioService', error, `Buffer count: ${input.audioBuffers.length}`);
            throw error;
          }
        })
      }
    })
  );

  const abortSafe = useAbortSafe();

  // 自動接続（一度だけ）
  useEffectOnce(() => {
    if (isIdle(state)) {
      send({ type: 'CONNECT' });
    }
  });

  // Contract Implementation
  const synthesizeVoice = useCallback(async (text: string, speakerId: number): Promise<void> => {
    if (isConnected(state)) {
      send({
        type: 'SYNTHESIZE',
        text,
        speakerId
      });
    } else {
      // 接続していない場合は接続を試行
      send({ type: 'CONNECT' });
    }
  }, [send, state]);

  const stopSynthesis = useCallback((): void => {
    send({ type: 'STOP' });
  }, [send]);

  const getSynthesisProgress = useCallback((): SynthesisProgress => {
    const progress = getProgress(state.context);
    const chunksInfo = getChunksInfo(state.context);

    return {
      percentage: progress,
      processedChunks: chunksInfo.current,
      totalChunks: chunksInfo.total,
      isLongText: chunksInfo.total > 1
    };
  }, [state]);

  const checkIsConnected = useCallback((): boolean => {
    const connectionStatus = getConnectionStatus(state.context);
    return connectionStatus.isConnected;
  }, [state]);

  const updateConfig = useCallback((config: Partial<SynthesisConfig>): void => {
    // State層にはconfig更新がないので、ここではNo-op
    // 実際の実装では、configをcontextに追加する必要がある
  }, []);

  const getConfig = useCallback((): SynthesisConfig => {
    // デフォルト設定を返す
    return {
      speedScale: 1.0,
      pitchScale: 0.0,
      intonationScale: 1.0,
      volumeScale: 1.0
    };
  }, []);

  const updateSpeaker = useCallback((speakerId: number): void => {
    // State層のcontextを直接更新することはできないので、
    // 次回の合成時に使用するために記憶する
    // または新しいイベントを定義する必要がある
  }, []);

  const getSpeakerId = useCallback((): number => {
    return state.context.speakerId;
  }, [state]);

  const getFinalAudio = useCallback((): Blob | null => {
    // State層では最終的なBlobは保持されていないため、
    // audioBuffersから生成する
    const { audioBuffers } = state.context;
    if (audioBuffers.length === 0) return null;

    let combinedBuffer: ArrayBuffer;
    if (audioBuffers.length === 1) {
      combinedBuffer = audioBuffers[0];
    } else {
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of audioBuffers) {
        combined.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }
      combinedBuffer = combined.buffer;
    }

    return new Blob([combinedBuffer], { type: 'audio/wav' });
  }, [state]);

  const retryLastSynthesis = useCallback((): void => {
    if (canRetry(state.context)) {
      send({ type: 'RETRY' });
    }
  }, [send, state]);

  const canRetrySynthesis = useCallback((): boolean => {
    return canRetry(state.context);
  }, [state]);

  const reset = useCallback((): void => {
    abortSafe.abort();
    send({ type: 'RESET' });
  }, [send, abortSafe]);

  // Error mapping
  const error: ErrorInfo | null = useMemo(() => {
    const stateError = getError(state.context);
    if (!stateError) return null;

    return {
      code: stateError.type.toUpperCase(),
      message: stateError.message,
      isRetryable: stateError.retryable,
      retryCount: state.context.retryCount
    };
  }, [state]);

  return {
    synthesizeVoice,
    stopSynthesis,
    getProgress: getSynthesisProgress,
    isConnected: checkIsConnected,
    error,
    isIdle: isIdle(state),
    isProcessing: isSynthesizing(state),
    isCompleted: isPlaying(state),
    isFailed: isError(state),
    updateConfig,
    getConfig,
    updateSpeaker,
    getSpeakerId,
    getFinalAudio,
    retryLastSynthesis,
    canRetry: canRetrySynthesis,
    reset
  };
}

// ===== VoicevoxSynthesisBlock Component =====

export const VoicevoxSynthesisBlock: React.FC<VoicevoxSynthesisBlockProps> = ({
  text,
  speakerId,
  onComplete,
  onError,
  onProgressUpdate,
  className = '',
  disabled = false
}) => {
  const synthesis = useVoicevoxSynthesis();
  const hasAutoStarted = useRef(false);

  // 自動合成開始（一度だけ）
  useEffectOnce(() => {
    if (text && !hasAutoStarted.current && !disabled && synthesis.isConnected()) {
      hasAutoStarted.current = true;
      synthesis.synthesizeVoice(text, speakerId).catch((error) => {
        // エラーログ記録とユーザーへのフィードバック
        logVoicevoxError('Auto synthesis start', error, `Text length: ${text.length}, Speaker: ${speakerId}`);

        // エラーコールバックが設定されている場合は呼び出し
        if (onError) {
          const errorInfo: ErrorInfo = {
            code: 'AUTO_SYNTHESIS_FAILED',
            message: `自動音声合成の開始に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
            isRetryable: true,
            retryCount: 0
          };
          onError(errorInfo);
        }
      });
    }
  });

  // プロップス変更時の更新
  useEffect(() => {
    synthesis.updateSpeaker(speakerId);
  }, [speakerId, synthesis]);

  // 進捗更新の通知
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(synthesis.getProgress());
    }
  }, [synthesis.getProgress(), onProgressUpdate]);

  // 完了時のコールバック
  useEffect(() => {
    if (synthesis.isCompleted && onComplete) {
      const audio = synthesis.getFinalAudio();
      if (audio) {
        onComplete(audio);
      }
    }
  }, [synthesis.isCompleted, onComplete, synthesis]);

  // エラー時のコールバック
  useEffect(() => {
    if (synthesis.error && onError) {
      onError(synthesis.error);
    }
  }, [synthesis.error, onError]);

  const handleStop = useCallback(() => {
    synthesis.stopSynthesis();
  }, [synthesis]);

  const handleRetry = useCallback(() => {
    if (synthesis.canRetry()) {
      synthesis.retryLastSynthesis();
    }
  }, [synthesis]);

  const progress = synthesis.getProgress();

  return (
    <div className={`voicevox-synthesis-block ${className}`}>
      {/* 接続状態表示 */}
      <div className="connection-section mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            synthesis.isConnected() ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm">
            {synthesis.isConnected() ? 'VOICEVOXサーバーに接続済み' : 'VOICEVOXサーバー未接続'}
          </span>
        </div>
      </div>

      {/* 進捗表示 */}
      {synthesis.isProcessing && (
        <div className="progress-section mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">音声合成中...</span>
            <span className="text-sm text-gray-600">{Math.round(progress.percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progress.percentage)}%` }}
            />
          </div>
          {progress.isLongText && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              {progress.processedChunks}/{progress.totalChunks} チャンク処理済み
            </div>
          )}
        </div>
      )}

      {/* ステータス表示 */}
      <div className="status-section mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            synthesis.isIdle ? 'bg-gray-400' :
            synthesis.isProcessing ? 'bg-blue-500 animate-pulse' :
            synthesis.isCompleted ? 'bg-green-500' :
            synthesis.isFailed ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium">
            {synthesis.isIdle && '準備完了'}
            {synthesis.isProcessing && '処理中'}
            {synthesis.isCompleted && '再生中'}
            {synthesis.isFailed && 'エラー'}
          </span>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="controls-section">
        {synthesis.isProcessing && (
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            disabled={disabled}
          >
            停止
          </button>
        )}

        {synthesis.isFailed && synthesis.canRetry() && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={disabled}
          >
            再試行
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {synthesis.error && (
        <div className={`error-section mt-4 p-3 rounded border ${
          synthesis.error.isRetryable
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start space-x-2">
            <span className="flex-shrink-0">
              {synthesis.error.isRetryable ? '⚠️' : '❌'}
            </span>
            <div>
              <div className="font-medium mb-1">
                {synthesis.error.isRetryable ? '一時的なエラー' : 'エラー'}
              </div>
              <div className="text-sm">
                {synthesis.error.message}
                {synthesis.error.retryCount > 0 && ` (再試行: ${synthesis.error.retryCount}回)`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Runtime declaration
export const RUNTIME = 'client' as const;