'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const TEXT_LIMIT = 100_000;
const MAX_CONCURRENT = 3;
const CHUNK_SIZE = 200;

type VoiceSynthesisState = 'IDLE' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
type ErrorCode = 'TEXT_TOO_LONG' | 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_AUDIO' | 'SYNTHESIS_FAILED';
type SpeakerId = 2 | 3;
type AudioBlob = Blob & { __brand: 'AudioBlob' };
type ValidText = string & { __brand: 'ValidText' };
type RetryableError = 'NETWORK_ERROR' | 'API_ERROR' | 'SYNTHESIS_FAILED';

interface VoiceSynthesisProps {
  text: ValidText;
  speakerId: SpeakerId;
  onSynthesisComplete?: (audio: AudioBlob) => void;
  onError?: (error: ErrorCode) => void;
  onProgressUpdate?: (progress: number) => void;
  onRetry?: () => void;
}

interface ErrorState {
  code: ErrorCode;
  message: string;
  isRetryable: boolean;
  retryCount: number;
  lastFailedChunk?: number;
}

interface SpeakerInfo {
  id: SpeakerId;
  name: string;
  color: string;
}

interface AudioQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string;
      consonant?: string;
      vowel: string;
      pitch: number;
    }>;
    accent: number;
    pause_mora?: {
      text: string;
      consonant?: string;
      vowel: string;
      pitch: number;
    };
  }>;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

interface ConcurrentLimiter {
  queue: Array<() => Promise<any>>;
  running: number;
  maxConcurrent: number;
}

const createConcurrentLimiter = (maxConcurrent: number): ConcurrentLimiter => ({
  queue: [],
  running: 0,
  maxConcurrent
});

const addToLimiter = async <T,>(
  limiter: ConcurrentLimiter,
  task: () => Promise<T>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const wrappedTask = async () => {
      try {
        limiter.running++;
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        limiter.running--;
        processQueue(limiter);
      }
    };

    if (limiter.running < limiter.maxConcurrent) {
      wrappedTask();
    } else {
      limiter.queue.push(wrappedTask);
    }
  });
};

const processQueue = (limiter: ConcurrentLimiter) => {
  while (limiter.queue.length > 0 && limiter.running < limiter.maxConcurrent) {
    const task = limiter.queue.shift();
    if (task) {
      task();
    }
  }
};

const SPEAKERS: SpeakerInfo[] = [
  { id: 3, name: 'ずんだもん', color: 'bg-green-500' },
  { id: 2, name: '四国めたん', color: 'bg-blue-500' }
];

const getNextApiUrl = (): string => {
  return '/api/voicevox';
};

const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/([。！？．!?])/);

  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
};

const VoiceSynthesisVertical: React.FC<VoiceSynthesisProps> = ({
  text,
  speakerId,
  onSynthesisComplete,
  onError,
  onProgressUpdate,
  onRetry
}) => {
  const [state, setState] = useState<VoiceSynthesisState>('IDLE');
  const [progress, setProgress] = useState<number>(0);
  const [isLongText, setIsLongText] = useState<boolean>(false);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [processedChunks, setProcessedChunks] = useState<number>(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerId>(speakerId);
  const [speedScale, setSpeedScale] = useState<number>(1.0);
  const [pitchScale, setPitchScale] = useState<number>(0.0);
  const [intonationScale, setIntonationScale] = useState<number>(1.0);
  const [volumeScale, setVolumeScale] = useState<number>(1.0);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [lastSynthesisParams, setLastSynthesisParams] = useState<{
    text: ValidText;
    speakerId: SpeakerId;
    speedScale: number;
    pitchScale: number;
    intonationScale: number;
    volumeScale: number;
  } | null>(null);

  const limiterRef = useRef<ConcurrentLimiter>(createConcurrentLimiter(MAX_CONCURRENT));
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentSpeaker(speakerId);
  }, [speakerId]);

  const createAudioQuery = async (
    text: string,
    speakerId: SpeakerId,
    signal: AbortSignal
  ): Promise<AudioQuery> => {
    const apiUrl = getNextApiUrl();
    const response = await fetch(
      `${apiUrl}/audio-query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 500) {
        throw new Error('SYNTHESIS_FAILED');
      } else if (response.status === 404 || response.status === 400) {
        throw new Error('API_ERROR');
      } else {
        throw new Error('NETWORK_ERROR');
      }
    }

    return await response.json();
  };

  const synthesizeAudio = async (
    audioQuery: AudioQuery,
    speakerId: SpeakerId,
    signal: AbortSignal
  ): Promise<ArrayBuffer> => {
    const modifiedQuery = {
      ...audioQuery,
      speedScale,
      pitchScale,
      intonationScale,
      volumeScale
    };

    const apiUrl = getNextApiUrl();
    const response = await fetch(
      `${apiUrl}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifiedQuery),
        signal
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 500) {
        throw new Error('SYNTHESIS_FAILED');
      } else if (response.status === 404 || response.status === 400) {
        throw new Error('API_ERROR');
      } else {
        throw new Error('NETWORK_ERROR');
      }
    }

    return await response.arrayBuffer();
  };

  const synthesizeChunk = async (
    chunk: string,
    speakerId: SpeakerId,
    signal: AbortSignal
  ): Promise<ArrayBuffer> => {
    return addToLimiter(limiterRef.current, async () => {
      const audioQuery = await createAudioQuery(chunk, speakerId, signal);
      return await synthesizeAudio(audioQuery, speakerId, signal);
    });
  };

  const combineAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (const buffer of buffers) {
      combined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    return combined.buffer;
  };

  const validateTextLength = (text: string): void => {
    if (text.length > TEXT_LIMIT) {
      throw new Error('TEXT_TOO_LONG');
    }
  };

  const handleSynthesize = useCallback(async (retryCount: number = 0) => {
    if (!text || text.trim().length === 0) {
      const errorState: ErrorState = {
        code: 'API_ERROR',
        message: 'テキストが入力されていません。',
        isRetryable: false,
        retryCount
      };
      setErrorState(errorState);
      onError?.('API_ERROR' as ErrorCode);
      return;
    }

    try {
      validateTextLength(text);
      setErrorState(null);
      setState('SYNTHESIZING');
      setProgress(0);
      setProcessedChunks(0);

      // 合成パラメータを保存
      setLastSynthesisParams({
        text,
        speakerId: currentSpeaker,
        speedScale,
        pitchScale,
        intonationScale,
        volumeScale
      });

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const chunks = splitTextIntoChunks(text, CHUNK_SIZE);
      setChunkCount(chunks.length);
      setIsLongText(chunks.length > 1);

      const audioBuffers: ArrayBuffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (signal.aborted) {
          throw new Error('NETWORK_ERROR');
        }

        try {
          const audioBuffer = await synthesizeChunk(chunks[i], currentSpeaker, signal);
          audioBuffers.push(audioBuffer);

          setProcessedChunks(i + 1);
          const currentProgress = Math.round(((i + 1) / chunks.length) * 100);
          setProgress(currentProgress);
          onProgressUpdate?.(currentProgress);

        } catch (error) {
          if (signal.aborted) {
            throw new Error('NETWORK_ERROR');
          }
          throw error;
        }
      }

      const finalAudioBuffer = chunks.length > 1
        ? combineAudioBuffers(audioBuffers)
        : audioBuffers[0];

      const audioBlob = new Blob([finalAudioBuffer], { type: 'audio/wav' }) as AudioBlob;

      setState('COMPLETED');
      onSynthesisComplete?.(audioBlob);

    } catch (error) {
      console.error('Voice synthesis error:', error);
      setState('FAILED');

      const errorMessage = (error as Error).message;
      let errorCode: ErrorCode;
      let message: string;
      let isRetryable: boolean;

      if (errorMessage.includes('TEXT_TOO_LONG')) {
        errorCode = 'TEXT_TOO_LONG';
        message = 'テキストが長すぎます（100,000文字以内）。テキストを短くしてください。';
        isRetryable = false;
      } else if (errorMessage.includes('NETWORK_ERROR') || abortControllerRef.current?.signal.aborted) {
        errorCode = 'NETWORK_ERROR';
        message = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
        isRetryable = true;
      } else if (errorMessage.includes('SYNTHESIS_FAILED')) {
        errorCode = 'SYNTHESIS_FAILED';
        message = 'VOICEVOXサーバーで音声合成に失敗しました。サーバーの状態を確認してください。';
        isRetryable = true;
      } else {
        errorCode = 'API_ERROR';
        message = 'APIエラーが発生しました。VOICEVOXエンジンが正しく動作していることを確認してください。';
        isRetryable = true;
      }

      const errorState: ErrorState = {
        code: errorCode,
        message,
        isRetryable,
        retryCount
      };

      setErrorState(errorState);
      onError?.(errorCode);
    }
  }, [text, currentSpeaker, speedScale, pitchScale, intonationScale, volumeScale, onSynthesisComplete, onError, onProgressUpdate]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState('IDLE');
    setProgress(0);
    setProcessedChunks(0);
    setErrorState(null);
  }, []);

  const retryLastSynthesis = useCallback(() => {
    if (errorState && errorState.isRetryable) {
      handleSynthesize(errorState.retryCount + 1);
    }
    onRetry?.();
  }, [errorState, handleSynthesize, onRetry]);

  const getDetailedErrorMessage = useCallback(() => {
    if (!errorState) return '';

    let message = errorState.message;

    if (errorState.isRetryable) {
      if (errorState.retryCount > 0) {
        message += ` (再試行回数: ${errorState.retryCount}回)`;
      }
      message += ' 「再試行」ボタンをクリックして再度お試しください。';
    }

    return message;
  }, [errorState]);

  const getStatusColor = useCallback(() => {
    switch (state) {
      case 'IDLE': return 'text-gray-500';
      case 'SYNTHESIZING': return 'text-blue-500';
      case 'COMPLETED': return 'text-green-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }, [state]);

  const getStatusText = useCallback(() => {
    switch (state) {
      case 'IDLE': return '音声合成の準備完了';
      case 'SYNTHESIZING': return isLongText
        ? `音声合成中... ${processedChunks}/${chunkCount} (${progress}%)`
        : `音声合成中... ${progress}%`;
      case 'COMPLETED': return '音声合成完了';
      case 'FAILED': return errorState?.message || '音声合成に失敗しました';
      default: return '';
    }
  }, [state, isLongText, processedChunks, chunkCount, progress]);

  const getSpeakerInfo = useCallback((id: SpeakerId) => {
    return SPEAKERS.find(speaker => speaker.id === id) || SPEAKERS[0];
  }, []);

  // コンポーネントがマウントされたときに自動的に音声合成を開始
  useEffect(() => {
    // textが存在し、初回マウント時のみ実行
    if (text && state === 'IDLE') {
      handleSynthesize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">音声合成</h2>
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            話者選択
          </label>
          <div className="space-y-2">
            {SPEAKERS.map((speaker) => (
              <label key={speaker.id} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="speaker"
                  value={speaker.id}
                  checked={currentSpeaker === speaker.id}
                  onChange={(e) => setCurrentSpeaker(Number(e.target.value) as SpeakerId)}
                  disabled={state === 'SYNTHESIZING'}
                  className="mr-3"
                />
                <div className={`w-4 h-4 rounded-full ${speaker.color} mr-2`}></div>
                <span className="text-gray-700">{speaker.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            音声パラメータ
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                速度: {speedScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speedScale}
                onChange={(e) => setSpeedScale(Number(e.target.value))}
                disabled={state === 'SYNTHESIZING'}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                音高: {pitchScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="-0.15"
                max="0.15"
                step="0.01"
                value={pitchScale}
                onChange={(e) => setPitchScale(Number(e.target.value))}
                disabled={state === 'SYNTHESIZING'}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                抑揚: {intonationScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={intonationScale}
                onChange={(e) => setIntonationScale(Number(e.target.value))}
                disabled={state === 'SYNTHESIZING'}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                音量: {volumeScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={volumeScale}
                onChange={(e) => setVolumeScale(Number(e.target.value))}
                disabled={state === 'SYNTHESIZING'}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {text && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">テキスト</h3>
            <span className="text-xs text-gray-500">
              {text.length.toLocaleString()} 文字
            </span>
          </div>
          <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
            {text}
          </div>
        </div>
      )}

      {state === 'SYNTHESIZING' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">進行状況</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {isLongText && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              長文処理中: {processedChunks}/{chunkCount} チャンク処理済み
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSynthesize}
            disabled={!text || state === 'SYNTHESIZING'}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !text || state === 'SYNTHESIZING'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {state === 'SYNTHESIZING' ? '合成中...' : '音声合成開始'}
          </button>

          {state === 'SYNTHESIZING' && (
            <button
              onClick={handleStop}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              中止
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getSpeakerInfo(currentSpeaker).color}`}></div>
          <span className="text-sm text-gray-600">
            {getSpeakerInfo(currentSpeaker).name}
          </span>
        </div>
      </div>

      {isLongText && state !== 'SYNTHESIZING' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          長文が検出されました。音声合成は分割して処理されます。
        </div>
      )}

      {errorState && state === 'FAILED' && (
        <div className={`mt-4 p-3 border rounded ${
          !errorState.isRetryable
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-1">
              {errorState.isRetryable ? '⚠️' : '❌'}
            </div>
            <div className="flex-grow">
              <div className="font-medium mb-1">
                {errorState.isRetryable ? '一時的なエラー' : 'エラー'}
              </div>
              <div className="text-sm">
                {getDetailedErrorMessage()}
              </div>
              {errorState.isRetryable && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={retryLastSynthesis}
                    disabled={state === 'SYNTHESIZING'}
                    className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                      state === 'SYNTHESIZING'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {state === 'SYNTHESIZING' ? '合成中...' : '再試行'}
                  </button>
                  <button
                    onClick={() => {
                      setErrorState(null);
                      setState('IDLE');
                    }}
                    className="px-4 py-2 text-sm rounded font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSynthesisVertical;