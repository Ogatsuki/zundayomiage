/**
 * ========== PVBP Universal UI Orchestrator Block ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/ui-orchestrator.universal.vertical.tsx
 * Runtime: Universal (SSR + CSR)
 * Task: 017 - Migrate UI orchestrator to PVBP-compliant universal block
 *
 * Purpose: Main UI orchestration with environment-adaptive rendering
 * Features:
 * - Text input interface
 * - Voice synthesis controls
 * - Audio playback controls
 * - State display
 * - SSR/CSR compatible rendering
 * - Hydration mismatch prevention
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

// ===== PVBP Runtime Declaration =====
export const RUNTIME = 'universal' as const;

// ===== PVBP Lifecycle Patterns (Self-Contained) =====
const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
};

const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
};

const useEffectOnce = (effect: () => void | (() => void)) => {
  const hasRun = React.useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return effect();
    }
  }, []);
};

// ===== Type Definitions (Self-Contained) =====
type ValidText = string & { __brand: 'ValidText' };
type SpeakerId = 2 | 3;
type AudioBlob = Blob & { __brand: 'AudioBlob' };
type ErrorCode = 'TEXT_TOO_LONG' | 'VOICEVOX_NOT_RUNNING' | 'NETWORK_CONNECTION' | 'TIMEOUT_ERROR' | 'SYNTHESIS_ERROR' | 'INVALID_AUDIO' | 'OCR_FAILED' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';

type AppState = 'IDLE' | 'INPUT_READY' | 'SYNTHESIZING' | 'AUDIO_READY' | 'ERROR';
type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

interface SystemState {
  app: AppState;
  currentText: ValidText | null;
  currentAudio: AudioBlob | null;
  selectedSpeaker: SpeakerId;
  error: ErrorCode | null;
  synthesisProgress: number;
}

// ===== Constants (Self-Contained) =====
const SPEAKERS = [
  { id: 3 as SpeakerId, name: 'ずんだもん', color: 'from-emerald-400 to-green-600', emoji: '🟢' },
  { id: 2 as SpeakerId, name: '四国めたん', color: 'from-blue-400 to-indigo-600', emoji: '🔵' },
];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  TEXT_TOO_LONG: 'テキストが長すぎます（100,000文字以内）',
  VOICEVOX_NOT_RUNNING: 'VOICEVOXエンジンが起動していません。サーバーを起動してください。',
  NETWORK_CONNECTION: 'ネットワーク接続に問題があります。',
  TIMEOUT_ERROR: '処理がタイムアウトしました。',
  SYNTHESIS_ERROR: '音声合成処理でエラーが発生しました。',
  INVALID_AUDIO: '音声データが無効です',
  OCR_FAILED: 'OCR処理に失敗しました',
  PLAYBACK_FAILED: '音声再生に失敗しました',
  AUDIO_CONTEXT_FAILED: 'オーディオビジュアライザーの初期化に失敗しました',
};

const RETRYABLE_ERRORS: ErrorCode[] = [
  'VOICEVOX_NOT_RUNNING',
  'NETWORK_CONNECTION',
  'TIMEOUT_ERROR',
  'SYNTHESIS_ERROR',
  'OCR_FAILED',
  'PLAYBACK_FAILED',
  'AUDIO_CONTEXT_FAILED'
];

// ===== Environment-Adaptive Components =====

// Loading/Skeleton fallback for SSR
const LoadingFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse ${className || ''}`}>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// App Header Component
const AppHeader: React.FC<{ systemState: SystemState; hydrated: boolean }> = ({ systemState, hydrated }) => {
  const getCurrentSpeaker = () => {
    return SPEAKERS.find(speaker => speaker.id === systemState.selectedSpeaker) || SPEAKERS[0];
  };

  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
        🎤 ずんだもん読み上げシステム
      </h1>
      <p className="text-gray-600 mb-4">
        {hydrated ? 'PVBP Universal Block - 垂直統合アーキテクチャ' : 'PVBP Universal Block'}
      </p>

      {/* Current speaker display - with hydration safety */}
      <div className="flex justify-center">
        {hydrated ? (
          <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${getCurrentSpeaker().color} text-white font-bold shadow-lg`}>
            <span className="text-2xl mr-3">{getCurrentSpeaker().emoji}</span>
            <span className="text-lg">{getCurrentSpeaker().name}</span>
          </div>
        ) : (
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gray-200 text-gray-600 font-bold shadow-lg">
            <span className="text-2xl mr-3">🎭</span>
            <span className="text-lg">話者選択中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Connection Status Card Component
const ConnectionStatusCard: React.FC<{
  connectionStatus: ConnectionStatus;
  onConnectionTest: () => void;
  isClient: boolean;
}> = ({ connectionStatus, onConnectionTest, isClient }) => {
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'checking':
        return {
          icon: '🔍',
          text: 'VOICEVOX接続確認中...',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          pulseClass: 'animate-pulse'
        };
      case 'connected':
        return {
          icon: '✅',
          text: 'VOICEVOX接続済み',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          pulseClass: ''
        };
      case 'disconnected':
        return {
          icon: '❌',
          text: 'VOICEVOX未接続',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          pulseClass: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`p-4 rounded-xl border-2 ${config.bgColor} ${config.borderColor} ${config.pulseClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className={`font-bold ${config.textColor}`}>{config.text}</div>
            <div className="text-sm opacity-70">
              {isClient ? 'エンジン状態監視中' : 'サーバーサイドレンダリング中'}
            </div>
          </div>
        </div>
        {connectionStatus === 'checking' && isClient && (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div>
        )}
      </div>

      {connectionStatus === 'disconnected' && isClient && (
        <div className="mt-3">
          <button
            onClick={onConnectionTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            再接続を試行
          </button>
        </div>
      )}
    </div>
  );
};

// System State Card Component
const SystemStateCard: React.FC<{ systemState: SystemState; hydrated: boolean }> = ({ systemState, hydrated }) => {
  const getStateConfig = () => {
    switch (systemState.app) {
      case 'IDLE':
        return {
          icon: '⭕',
          text: 'テキスト入力待ち',
          description: 'テキストを入力してください',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          progressClass: ''
        };
      case 'INPUT_READY':
        return {
          icon: '✅',
          text: '音声合成準備完了',
          description: '「音声合成開始」ボタンをクリックしてください',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          progressClass: ''
        };
      case 'SYNTHESIZING':
        return {
          icon: '⚙️',
          text: `音声合成中 (${systemState.synthesisProgress}%)`,
          description: 'テキストを音声に変換しています...',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800',
          progressClass: hydrated ? 'animate-pulse' : ''
        };
      case 'AUDIO_READY':
        return {
          icon: '🎵',
          text: '再生準備完了',
          description: '音声が生成されました。下の再生ボタンをクリックしてください',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          progressClass: ''
        };
      case 'ERROR':
        return {
          icon: '💥',
          text: 'エラー発生',
          description: ERROR_MESSAGES[systemState.error!] || '不明なエラー',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          progressClass: hydrated ? 'animate-pulse' : ''
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className={`p-6 rounded-xl border-2 ${config.bgColor} ${config.borderColor} ${config.progressClass}`}>
      <div className="flex items-center space-x-4">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1">
          <div className={`text-xl font-bold ${config.textColor}`}>{config.text}</div>
          <div className="text-sm opacity-80 mt-1">{config.description}</div>

          {systemState.app === 'SYNTHESIZING' && hydrated && (
            <div className="mt-3">
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemState.synthesisProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {systemState.currentText && (
            <div className="mt-2 text-xs opacity-60">
              テキスト長: {systemState.currentText.length.toLocaleString()}文字
            </div>
          )}
        </div>

        {systemState.app === 'SYNTHESIZING' && hydrated && (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent"></div>
        )}
      </div>
    </div>
  );
};

// Text Input Component (Universal)
const TextInputUniversal: React.FC<{
  onTextReady: (text: ValidText) => void;
  onError: (error: ErrorCode) => void;
  isClient: boolean;
  initialText?: string;
}> = ({ onTextReady, onError, isClient, initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    if (value.trim().length > 0) {
      if (value.length > 100000) {
        onError('TEXT_TOO_LONG');
        return;
      }
      onTextReady(value.trim() as ValidText);
    }
  }, [onTextReady, onError]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">📝 テキスト入力</h3>
        <div className="text-sm text-gray-600">
          {isClient ? `${text.length.toLocaleString()} / 100,000文字` : 'テキスト長計算中...'}
        </div>
      </div>

      {isClient ? (
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="読み上げたいテキストを入力してください..."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isProcessing}
        />
      ) : (
        <div className="w-full h-32 p-4 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
          <LoadingFallback className="w-full" />
        </div>
      )}

      {text.trim().length > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className={`${text.length > 100000 ? 'text-red-600' : 'text-green-600'}`}>
            {isClient && text.length > 100000 ? '⚠️ 文字数制限を超えています' : '✅ 入力完了'}
          </span>
        </div>
      )}
    </div>
  );
};

// Control Panel Component
const ControlPanel: React.FC<{
  systemState: SystemState;
  onSynthesisStart: () => void;
  onReset: () => void;
  onRetry: () => void;
  onSpeakerChange: (speakerId: SpeakerId) => void;
  showAdvanced: boolean;
  onShowAdvancedToggle: () => void;
  autoPlay: boolean;
  onAutoPlayToggle: (enabled: boolean) => void;
  isClient: boolean;
}> = ({
  systemState,
  onSynthesisStart,
  onReset,
  onRetry,
  onSpeakerChange,
  showAdvanced,
  onShowAdvancedToggle,
  autoPlay,
  onAutoPlayToggle,
  isClient
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg">
      {/* Main operation buttons */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-x-4">
          {systemState.app === 'INPUT_READY' && isClient && (
            <button
              onClick={onSynthesisStart}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
            >
              🎤 音声合成開始
            </button>
          )}

          {(systemState.app === 'ERROR' || systemState.app === 'AUDIO_READY') && isClient && (
            <>
              {systemState.app === 'ERROR' && RETRYABLE_ERRORS.includes(systemState.error!) && (
                <button
                  onClick={onRetry}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold shadow-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  🔄 再試行
                </button>
              )}
              <button
                onClick={onReset}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200"
              >
                🔄 リセット
              </button>
            </>
          )}

          {!isClient && (
            <div className="px-8 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold">
              サーバーサイドレンダリング中...
            </div>
          )}
        </div>

        {isClient && (
          <button
            onClick={onShowAdvancedToggle}
            className="px-4 py-2 text-sm bg-white/50 hover:bg-white/70 rounded-lg border border-gray-200 transition-colors"
          >
            {showAdvanced ? '設定を隠す' : '⚙️ 詳細設定'}
          </button>
        )}
      </div>

      {/* Advanced settings panel */}
      {showAdvanced && isClient && (
        <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-800 mb-3">🎭 話者選択</h3>
              <div className="space-y-3">
                {SPEAKERS.map((speaker) => (
                  <label key={speaker.id} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <input
                      type="radio"
                      name="speaker"
                      value={speaker.id}
                      checked={systemState.selectedSpeaker === speaker.id}
                      onChange={(e) => onSpeakerChange(Number(e.target.value) as SpeakerId)}
                      disabled={systemState.app === 'SYNTHESIZING'}
                      className="mr-3 text-blue-600"
                    />
                    <span className="text-2xl mr-3">{speaker.emoji}</span>
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{speaker.name}</span>
                      {systemState.selectedSpeaker === speaker.id && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          選択中
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">⚙️ 再生オプション</h3>
              <label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-white/50 transition-colors">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => onAutoPlayToggle(e.target.checked)}
                  className="mr-3 text-blue-600"
                />
                <span className="text-gray-700">合成完了時に自動再生</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Audio Player Component (Universal)
const AudioPlayerUniversal: React.FC<{
  audioBlob: AudioBlob;
  autoPlay: boolean;
  isClient: boolean;
}> = ({ audioBlob, autoPlay, isClient }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && isClient) {
      const audio = audioRef.current;
      const url = URL.createObjectURL(audioBlob);
      audio.src = url;

      if (autoPlay) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      }

      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob, autoPlay, isClient]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!isClient) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            🎵
          </div>
          <div className="flex-1">
            <LoadingFallback />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
      <div className="flex items-center space-x-4">
        <button
          onClick={handlePlayPause}
          className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center hover:from-green-600 hover:to-blue-600 transition-all duration-200"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">
            音声ファイル準備完了
          </div>
          <div className="text-xs text-gray-500">
            クリックして再生・一時停止
          </div>
        </div>
        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
};

// ===== Main Universal UI Orchestrator =====
const UIOrchestrator: React.FC = () => {
  // Environment detection hooks
  const hydrated = useHydrated();
  const isClient = useClientOnly();

  // State management
  const [systemState, setSystemState] = useState<SystemState>({
    app: 'IDLE',
    currentText: null,
    currentAudio: null,
    selectedSpeaker: 3,
    error: null,
    synthesisProgress: 0,
  });

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');

  // VOICEVOX connection management (client-only)
  const checkVoicevoxConnection = useCallback(async () => {
    if (!isClient) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021';
      const response = await fetch(`${apiUrl}/speakers`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.warn('VOICEVOX connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  }, [isClient]);

  // Connection checking effect (client-only)
  useEffectOnce(() => {
    if (isClient) {
      checkVoicevoxConnection();
      const interval = setInterval(checkVoicevoxConnection, 30000);
      return () => clearInterval(interval);
    }
  });

  // Block communication handlers
  const handleTextReady = useCallback((text: ValidText) => {
    setSystemState(prev => ({
      ...prev,
      app: 'INPUT_READY',
      currentText: text,
      currentAudio: null,
      error: null,
    }));
  }, []);

  const handleTextInputError = useCallback((error: ErrorCode) => {
    setSystemState(prev => ({
      ...prev,
      app: 'ERROR',
      error,
      currentText: null,
      currentAudio: null,
    }));
  }, []);

  const handleSynthesisComplete = useCallback((audio: AudioBlob) => {
    setSystemState(prev => ({
      ...prev,
      app: 'AUDIO_READY',
      currentAudio: audio,
      error: null,
      synthesisProgress: 100,
    }));
  }, []);

  const handleSpeakerChange = useCallback((speakerId: SpeakerId) => {
    setSystemState(prev => ({
      ...prev,
      selectedSpeaker: speakerId,
      currentAudio: null,
      app: prev.currentText ? 'INPUT_READY' : 'IDLE',
    }));
  }, []);

  // System control handlers
  const startSynthesis = useCallback(async () => {
    if (!systemState.currentText || !isClient) return;

    // Mock synthesis for demo - in real implementation, this would call the voice synthesis block
    setSystemState(prev => ({
      ...prev,
      app: 'SYNTHESIZING',
      synthesisProgress: 0,
      error: null,
    }));

    // Simulate synthesis progress
    const progressInterval = setInterval(() => {
      setSystemState(prev => {
        if (prev.synthesisProgress >= 100) {
          clearInterval(progressInterval);
          // Create mock audio blob
          const mockAudio = new Blob(['mock audio data'], { type: 'audio/wav' }) as AudioBlob;
          return {
            ...prev,
            app: 'AUDIO_READY',
            currentAudio: mockAudio,
            synthesisProgress: 100,
          };
        }
        return {
          ...prev,
          synthesisProgress: prev.synthesisProgress + 10,
        };
      });
    }, 200);

  }, [systemState.currentText, isClient]);

  const resetSystem = useCallback(() => {
    setSystemState({
      app: 'IDLE',
      currentText: null,
      currentAudio: null,
      selectedSpeaker: systemState.selectedSpeaker,
      error: null,
      synthesisProgress: 0,
    });
  }, [systemState.selectedSpeaker]);

  const retryCurrentOperation = useCallback(() => {
    if (systemState.error) {
      setSystemState(prev => ({
        ...prev,
        error: null
      }));

      if (systemState.error === 'NETWORK_CONNECTION' || systemState.error === 'VOICEVOX_NOT_RUNNING') {
        checkVoicevoxConnection();
      }

      if (systemState.currentText) {
        setSystemState(prev => ({
          ...prev,
          app: 'INPUT_READY',
        }));
      } else {
        setSystemState(prev => ({
          ...prev,
          app: 'IDLE',
        }));
      }
    }
  }, [systemState.error, systemState.currentText, checkVoicevoxConnection]);

  // UI Rendering with environment adaptation
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Application Header */}
      <AppHeader systemState={systemState} hydrated={hydrated} />

      {/* System State Display */}
      <div className="mb-8">
        <SystemStateCard systemState={systemState} hydrated={hydrated} />
      </div>

      {/* Connection Status Display */}
      <div className="mb-8">
        <ConnectionStatusCard
          connectionStatus={connectionStatus}
          onConnectionTest={checkVoicevoxConnection}
          isClient={isClient}
        />
      </div>

      {/* Control Panel */}
      <div className="mb-8">
        <ControlPanel
          systemState={systemState}
          onSynthesisStart={startSynthesis}
          onReset={resetSystem}
          onRetry={retryCurrentOperation}
          onSpeakerChange={handleSpeakerChange}
          showAdvanced={showAdvanced}
          onShowAdvancedToggle={() => setShowAdvanced(!showAdvanced)}
          autoPlay={autoPlay}
          onAutoPlayToggle={setAutoPlay}
          isClient={isClient}
        />
      </div>

      {/* Main workflow (3 steps) */}
      <div className="space-y-8">
        {/* Step 1: Text Input */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
            テキスト入力
          </h2>
          <TextInputUniversal
            onTextReady={handleTextReady}
            onError={handleTextInputError}
            isClient={isClient}
            initialText=""
          />
        </div>

        {/* Step 2: Voice Synthesis */}
        <div
          className={`bg-white/80 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg transition-all duration-500 ease-in-out ${
            systemState.currentText && (systemState.app === 'SYNTHESIZING' || systemState.app === 'AUDIO_READY')
              ? 'opacity-100 p-6'
              : 'opacity-50 p-6'
          }`}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
            音声合成
          </h2>
          {systemState.currentText ? (
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-800">合成対象テキスト:</span>
                <span className="text-sm text-purple-600">
                  話者: {SPEAKERS.find(s => s.id === systemState.selectedSpeaker)?.name}
                </span>
              </div>
              <div className="text-sm text-purple-700 bg-white/50 p-2 rounded max-h-20 overflow-y-auto">
                {systemState.currentText.slice(0, 200)}{systemState.currentText.length > 200 ? '...' : ''}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              テキストを入力すると音声合成の設定が表示されます
            </div>
          )}
        </div>

        {/* Step 3: Audio Playback */}
        {systemState.currentAudio && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg transition-all duration-500 ease-in-out">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              音声再生
            </h2>
            <AudioPlayerUniversal
              audioBlob={systemState.currentAudio}
              autoPlay={autoPlay}
              isClient={isClient}
            />
          </div>
        )}
      </div>

      {/* Footer Information */}
      <div className="mt-12 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start">
          <div className="text-blue-400 mr-3 mt-1">ℹ️</div>
          <div>
            <h3 className="text-blue-800 font-bold mb-2">PVBP Universal Block</h3>
            <div className="text-blue-700 text-sm space-y-1">
              <p>• SSR/CSR対応: {hydrated ? '✅ ハイドレーション完了' : '🔄 サーバーサイドレンダリング中'}</p>
              <p>• 環境検出: {isClient ? '✅ クライアントサイド' : '🖥️ サーバーサイド'}</p>
              <p>• 垂直統合: 自己完結型ブロック設計</p>
            </div>
            <div className="mt-3 text-xs text-blue-600">
              ※ PVBP (Pragmatic Vertical Blocks Protocol) v1.0.0 準拠
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOrchestrator;