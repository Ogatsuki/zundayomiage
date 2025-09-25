// ========== UI統合オーケストレーター（垂直統合メインブロック）==========
// タスクID: 002 - UI再設計・垂直統合アーキテクチャ実装
// 実装時刻: 2025-09-25

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TextInputVertical from '@/blocks/text-input.vertical';
import VoiceSynthesisVertical from '@/blocks/voice-synthesis.vertical';
import AudioPlayerVertical from '@/blocks/audio-player.vertical';

// ===== 型定義（自己完結） =====
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

// ===== 定数定義（自己完結） =====
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

// ===== ユーティリティ関数（自己完結） =====
const getErrorSeverity = (errorCode: ErrorCode): 'warning' | 'error' => {
  return RETRYABLE_ERRORS.includes(errorCode) ? 'warning' : 'error';
};

// ===== コンポーネント内部ヘルパー =====
const AppHeader: React.FC<{ systemState: SystemState }> = ({ systemState }) => {
  const getCurrentSpeaker = () => {
    return SPEAKERS.find(speaker => speaker.id === systemState.selectedSpeaker) || SPEAKERS[0];
  };

  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
        🎤 ずんだもん読み上げシステム
      </h1>
      <p className="text-gray-600 mb-4">AI中心設計・垂直統合アーキテクチャ</p>

      {/* 現在の話者表示 */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${getCurrentSpeaker().color} text-white font-bold shadow-lg`}>
          <span className="text-2xl mr-3">{getCurrentSpeaker().emoji}</span>
          <span className="text-lg">{getCurrentSpeaker().name}</span>
        </div>
      </div>
    </div>
  );
};

const ConnectionStatusCard: React.FC<{
  connectionStatus: ConnectionStatus;
  onConnectionTest: () => void;
}> = ({ connectionStatus, onConnectionTest }) => {
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
            <div className="text-sm opacity-70">エンジン状態監視中</div>
          </div>
        </div>
        {connectionStatus === 'checking' && (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div>
        )}
      </div>

      {connectionStatus === 'disconnected' && (
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

const SystemStateCard: React.FC<{ systemState: SystemState }> = ({ systemState }) => {
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
          progressClass: 'animate-pulse'
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
          progressClass: 'animate-pulse'
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

          {systemState.app === 'SYNTHESIZING' && (
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

        {systemState.app === 'SYNTHESIZING' && (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent"></div>
        )}
      </div>
    </div>
  );
};

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
}> = ({
  systemState,
  onSynthesisStart,
  onReset,
  onRetry,
  onSpeakerChange,
  showAdvanced,
  onShowAdvancedToggle,
  autoPlay,
  onAutoPlayToggle
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg">
      {/* メイン操作ボタン */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-x-4">
          {systemState.app === 'INPUT_READY' && (
            <button
              onClick={onSynthesisStart}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
            >
              🎤 音声合成開始
            </button>
          )}

          {(systemState.app === 'ERROR' || systemState.app === 'AUDIO_READY') && (
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
        </div>

        <button
          onClick={onShowAdvancedToggle}
          className="px-4 py-2 text-sm bg-white/50 hover:bg-white/70 rounded-lg border border-gray-200 transition-colors"
        >
          {showAdvanced ? '設定を隠す' : '⚙️ 詳細設定'}
        </button>
      </div>

      {/* 詳細設定パネル */}
      {showAdvanced && (
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

// ===== メインUIオーケストレーター（React統合） =====
const UIOrchestrator: React.FC = () => {
  // ===== 状態管理（垂直統合・自己完結） =====
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

  // ===== VOICEVOX接続管理（自己完結） =====
  const checkVoicevoxConnection = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    checkVoicevoxConnection();
    const interval = setInterval(checkVoicevoxConnection, 30000);
    return () => clearInterval(interval);
  }, [checkVoicevoxConnection]);

  // ===== ブロック間通信ハンドラー（垂直統合） =====
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

  const handleSynthesisError = useCallback((error: ErrorCode) => {
    setSystemState(prev => ({
      ...prev,
      app: 'ERROR',
      error,
      currentAudio: null,
      synthesisProgress: 0,
    }));
  }, []);

  const handleSynthesisProgress = useCallback((progress: number) => {
    setSystemState(prev => ({
      ...prev,
      synthesisProgress: progress,
    }));
  }, []);

  const handleAudioPlayerError = useCallback((error: ErrorCode) => {
    setSystemState(prev => ({
      ...prev,
      app: 'ERROR',
      error,
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

  // ===== システム制御ハンドラー（自己完結） =====
  const startSynthesis = useCallback(async () => {
    if (!systemState.currentText) return;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const testResponse = await fetch(`${baseUrl}/api/voicevox/audio-query?text=test&speaker=3`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });

      if (!testResponse.ok) {
        setSystemState(prev => ({
          ...prev,
          app: 'ERROR',
          error: 'NETWORK_CONNECTION',
          synthesisProgress: 0,
        }));
        return;
      }

      setSystemState(prev => ({
        ...prev,
        app: 'SYNTHESIZING',
        synthesisProgress: 0,
        error: null,
      }));
    } catch (error) {
      setSystemState(prev => ({
        ...prev,
        app: 'ERROR',
        error: 'NETWORK_CONNECTION',
        synthesisProgress: 0,
      }));
    }
  }, [systemState.currentText]);

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

  // ===== UIレンダリング（ユーザー中心設計） =====
  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* アプリケーションヘッダー */}
      <AppHeader systemState={systemState} />

      {/* システム状態表示 */}
      <div className="mb-8">
        <SystemStateCard systemState={systemState} />
      </div>

      {/* 接続状態表示 */}
      <div className="mb-8">
        <ConnectionStatusCard
          connectionStatus={connectionStatus}
          onConnectionTest={checkVoicevoxConnection}
        />
      </div>

      {/* 制御パネル */}
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
        />
      </div>

      {/* メイン作業フロー（3ステップ） */}
      <div className="space-y-8">
        {/* Step 1: テキスト入力 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
            テキスト入力
          </h2>
          <TextInputVertical
            onTextReady={handleTextReady}
            onError={handleTextInputError}
            onRetry={retryCurrentOperation}
            initialText=""
          />
        </div>

        {/* Step 2: 音声合成 */}
        {systemState.currentText && (systemState.app === 'SYNTHESIZING' || systemState.app === 'AUDIO_READY') && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg transition-all duration-500 ease-in-out">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
              音声合成
            </h2>
            <VoiceSynthesisVertical
              text={systemState.currentText}
              speakerId={systemState.selectedSpeaker}
              onSynthesisComplete={handleSynthesisComplete}
              onError={handleSynthesisError}
              onProgressUpdate={handleSynthesisProgress}
              onRetry={retryCurrentOperation}
            />
          </div>
        )}

        {/* Step 3: 音声再生 */}
        {systemState.currentAudio && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg transition-all duration-500 ease-in-out">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              音声再生
            </h2>
            <AudioPlayerVertical
              audioBlob={systemState.currentAudio}
              onPlaybackComplete={() => {}}
              onError={handleAudioPlayerError}
              onRetry={retryCurrentOperation}
              autoPlay={autoPlay}
              showControls={true}
            />
          </div>
        )}
      </div>

      {/* フッター情報 */}
      <div className="mt-12 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start">
          <div className="text-blue-400 mr-3 mt-1">ℹ️</div>
          <div>
            <h3 className="text-blue-800 font-bold mb-2">使用方法</h3>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>テキスト入力欄にテキストを入力するか、画像をアップロードしてOCR処理を実行</li>
              <li>話者（ずんだもん・四国めたん）を選択し、「音声合成開始」ボタンをクリック</li>
              <li>生成された音声の再生・ダウンロードが可能</li>
            </ol>
            <div className="mt-3 text-xs text-blue-600">
              ※ 本アプリケーションは垂直統合アーキテクチャの検証を目的としています
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOrchestrator;