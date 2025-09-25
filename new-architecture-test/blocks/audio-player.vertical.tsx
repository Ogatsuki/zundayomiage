'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type AudioPlayerState = 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ERROR';
type ErrorCode = 'TEXT_TOO_LONG' | 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_AUDIO' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';
type AudioBlob = Blob & { __brand: 'AudioBlob' };
type RetryableError = 'NETWORK_ERROR' | 'API_ERROR' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';

interface AudioPlayerProps {
  audioBlob?: AudioBlob;
  onPlaybackComplete?: () => void;
  onError?: (error: ErrorCode) => void;
  autoPlay?: boolean;
  showControls?: boolean;
  onRetry?: () => void;
}

interface ErrorState {
  code: ErrorCode;
  message: string;
  isRetryable: boolean;
  retryCount: number;
  lastAction?: 'LOAD' | 'PLAY' | 'SETUP_ANALYSER';
}

interface AudioInfo {
  duration: number;
  currentTime: number;
  volume: number;
  playbackRate: number;
}

const AudioPlayerVertical: React.FC<AudioPlayerProps> = ({
  audioBlob,
  onPlaybackComplete,
  onError,
  autoPlay = false,
  showControls = true,
  onRetry
}) => {
  const [state, setState] = useState<AudioPlayerState>('IDLE');
  const [audioInfo, setAudioInfo] = useState<AudioInfo>({
    duration: 0,
    currentTime: 0,
    volume: 1.0,
    playbackRate: 1.0
  });
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<AudioBlob | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const createAudioElement = useCallback(async (blob: AudioBlob): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onloadedmetadata = () => {
          setAudioInfo(prev => ({
            ...prev,
            duration: audio.duration
          }));
          setAudioUrl(url);
          resolve(audio);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('INVALID_AUDIO'));
        };

        audio.onended = () => {
          setState('IDLE');
          setAudioInfo(prev => ({
            ...prev,
            currentTime: 0
          }));
          onPlaybackComplete?.();
        };

        audio.ontimeupdate = () => {
          setAudioInfo(prev => ({
            ...prev,
            currentTime: audio.currentTime
          }));
        };

        audio.onplay = () => {
          setState('PLAYING');
        };

        audio.onpause = () => {
          setState('PAUSED');
        };

        audio.onwaiting = () => {
          setState('LOADING');
        };

        audio.oncanplay = () => {
          if (state === 'LOADING') {
            setState(audio.paused ? 'PAUSED' : 'PLAYING');
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }, [onPlaybackComplete, state]);

  const setupAudioAnalyser = useCallback((audio: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      analyserRef.current = analyser;
    } catch (error) {
      console.warn('Audio analyser setup failed:', error);
      const errorState: ErrorState = {
        code: 'AUDIO_CONTEXT_FAILED',
        message: 'オーディオビジュアライザーの初期化に失敗しました。音声再生は可能です。',
        isRetryable: true,
        retryCount: 0,
        lastAction: 'SETUP_ANALYSER'
      };
      setErrorState(errorState);
    }
  }, []);

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / bufferLength;
    let barHeight;
    let x = 0;

    const gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#3B82F6');
    gradient.addColorStop(1, '#1E40AF');

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

      canvasContext.fillStyle = gradient;
      canvasContext.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }

    if (state === 'PLAYING') {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [state]);

  const loadAudio = useCallback(async (blob: AudioBlob, retryCount: number = 0) => {
    try {
      setState('LOADING');
      setLastAudioBlob(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      }

      const audio = await createAudioElement(blob);
      audioRef.current = audio;

      audio.volume = audioInfo.volume;
      audio.playbackRate = audioInfo.playbackRate;
      audio.loop = isLooping;

      setupAudioAnalyser(audio);

      setErrorState(null);
      setState('IDLE');

      if (autoPlay) {
        await play();
      }

    } catch (error) {
      console.error('Audio loading failed:', error);
      setState('ERROR');

      const errorMessage = (error as Error).message;
      let errorCode: ErrorCode;
      let message: string;
      let isRetryable: boolean;

      if (errorMessage.includes('INVALID_AUDIO')) {
        errorCode = 'INVALID_AUDIO';
        message = '音声データが破損しているか、対応していない形式です。';
        isRetryable = false;
      } else {
        errorCode = 'PLAYBACK_FAILED';
        message = '音声の読み込みに失敗しました。ブラウザの音声設定を確認してください。';
        isRetryable = true;
      }

      const errorState: ErrorState = {
        code: errorCode,
        message,
        isRetryable,
        retryCount,
        lastAction: 'LOAD'
      };

      setErrorState(errorState);
      onError?.(errorCode);
    }
  }, [audioInfo.volume, audioInfo.playbackRate, isLooping, createAudioElement, setupAudioAnalyser, autoPlay, audioUrl, onError]);

  const play = useCallback(async (retryCount: number = 0): Promise<void> => {
    if (!audioRef.current) return;

    try {
      setState('LOADING');

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      await audioRef.current.play();
      setErrorState(null);
      drawWaveform();
    } catch (error) {
      console.error('Audio play failed:', error);
      setState('ERROR');

      const errorState: ErrorState = {
        code: 'PLAYBACK_FAILED',
        message: '音声の再生に失敗しました。ブラウザの音声設定やミュート状態を確認してください。',
        isRetryable: true,
        retryCount,
        lastAction: 'PLAY'
      };

      setErrorState(errorState);
      onError?.('PLAYBACK_FAILED' as ErrorCode);
    }
  }, [drawWaveform, onError]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState('IDLE');
    setAudioInfo(prev => ({
      ...prev,
      currentTime: 0
    }));

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = Math.max(0, Math.min(time, audioInfo.duration));
  }, [audioInfo.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setAudioInfo(prev => ({
      ...prev,
      volume: clampedVolume
    }));

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    setAudioInfo(prev => ({
      ...prev,
      playbackRate: clampedRate
    }));

    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }
  }, []);

  const toggleLoop = useCallback(() => {
    const newLooping = !isLooping;
    setIsLooping(newLooping);

    if (audioRef.current) {
      audioRef.current.loop = newLooping;
    }
  }, [isLooping]);

  const download = useCallback((blob: AudioBlob, filename: string = 'audio.wav') => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const errorState: ErrorState = {
        code: 'API_ERROR',
        message: 'ファイルのダウンロードに失敗しました。ブラウザの設定を確認してください。',
        isRetryable: false,
        retryCount: 0
      };
      setErrorState(errorState);
      onError?.('API_ERROR' as ErrorCode);
    }
  }, [onError]);

  const retryLastAction = useCallback(() => {
    if (!errorState || !errorState.isRetryable) return;

    const retryCount = errorState.retryCount + 1;

    switch (errorState.lastAction) {
      case 'LOAD':
        if (lastAudioBlob) {
          loadAudio(lastAudioBlob, retryCount);
        }
        break;
      case 'PLAY':
        play(retryCount);
        break;
      case 'SETUP_ANALYSER':
        if (audioRef.current) {
          setupAudioAnalyser(audioRef.current);
        }
        break;
    }

    onRetry?.();
  }, [errorState, lastAudioBlob, loadAudio, play, setupAudioAnalyser, onRetry]);

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

  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getProgressPercentage = useCallback((): number => {
    if (!audioInfo.duration) return 0;
    return (audioInfo.currentTime / audioInfo.duration) * 100;
  }, [audioInfo.currentTime, audioInfo.duration]);

  const getStateIcon = useCallback(() => {
    switch (state) {
      case 'PLAYING': return '⏸️';
      case 'PAUSED': return '▶️';
      case 'LOADING': return '⏳';
      case 'ERROR': return '❌';
      default: return '▶️';
    }
  }, [state]);

  const getStateColor = useCallback(() => {
    switch (state) {
      case 'PLAYING': return 'text-green-600';
      case 'PAUSED': return 'text-yellow-600';
      case 'LOADING': return 'text-blue-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, [state]);

  useEffect(() => {
    if (audioBlob) {
      loadAudio(audioBlob);
    }
  }, [audioBlob, loadAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  if (!audioBlob) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🎵</div>
          <div className="text-lg font-medium">音声データがありません</div>
          <div className="text-sm">音声合成が完了すると再生できます</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">音声再生</h2>
          <div className={`text-sm font-medium ${getStateColor()}`}>
            {getStateIcon()} {state === 'LOADING' ? '読み込み中...' :
               state === 'PLAYING' ? '再生中' :
               state === 'PAUSED' ? '一時停止中' :
               state === 'ERROR' ? 'エラー' : '準備完了'}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={100}
          className="w-full h-20 bg-gray-100 rounded border"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{formatTime(audioInfo.currentTime)}</span>
          <span>{formatTime(audioInfo.duration)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const clickX = e.clientX - rect.left;
               const percentage = clickX / rect.width;
               seek(percentage * audioInfo.duration);
             }}>
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-200"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {showControls && (
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={stop}
              disabled={state === 'IDLE' || state === 'LOADING'}
              className={`p-2 rounded-lg ${
                state === 'IDLE' || state === 'LOADING'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              ⏹️ 停止
            </button>

            <button
              onClick={() => (state === 'PLAYING' ? pause() : play())}
              disabled={state === 'LOADING' || state === 'ERROR'}
              className={`p-3 rounded-full text-2xl ${
                state === 'LOADING' || state === 'ERROR'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {getStateIcon()}
            </button>

            <button
              onClick={() => audioBlob && download(audioBlob, `audio_${Date.now()}.wav`)}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              💾 ダウンロード
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                音量: {Math.round(audioInfo.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={audioInfo.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                再生速度: {audioInfo.playbackRate}x
              </label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={audioInfo.playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLooping}
                  onChange={toggleLoop}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">リピート再生</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {errorState && state === 'ERROR' && (
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
                    onClick={() => retryLastAction()}
                    className="px-4 py-2 text-sm rounded font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    再試行
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

export default AudioPlayerVertical;