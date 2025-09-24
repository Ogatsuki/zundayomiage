'use client';

import { useState, useCallback, useEffect } from 'react';
import TextInputVertical from '@/blocks/text-input.vertical';
import VoiceSynthesisVertical from '@/blocks/voice-synthesis.vertical';
import AudioPlayerVertical from '@/blocks/audio-player.vertical';

type ValidText = string & { __brand: 'ValidText' };
type SpeakerId = 2 | 3;
type AudioBlob = Blob & { __brand: 'AudioBlob' };
type ErrorCode = 'TEXT_TOO_LONG' | 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_AUDIO' | 'OCR_FAILED' | 'SYNTHESIS_FAILED' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';

type AppState = 'IDLE' | 'INPUT_READY' | 'SYNTHESIZING' | 'AUDIO_READY' | 'ERROR';

interface SystemState {
  app: AppState;
  currentText: ValidText | null;
  currentAudio: AudioBlob | null;
  selectedSpeaker: SpeakerId;
  error: ErrorCode | null;
  synthesisProgress: number;
}

const SPEAKERS = [
  { id: 3 as SpeakerId, name: 'ずんだもん', color: 'from-green-400 to-green-600', emoji: '🟢' },
  { id: 2 as SpeakerId, name: '四国めたん', color: 'from-blue-400 to-blue-600', emoji: '🔵' },
  // Hot reload test comment
];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  TEXT_TOO_LONG: 'テキストが長すぎます（100,000文字以内）',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
  API_ERROR: 'APIエラーが発生しました。VOICEVOXエンジンの状態を確認してください',
  INVALID_AUDIO: '音声データが無効です',
  OCR_FAILED: 'OCR処理に失敗しました',
  SYNTHESIS_FAILED: '音声合成に失敗しました',
  PLAYBACK_FAILED: '音声再生に失敗しました',
  AUDIO_CONTEXT_FAILED: 'オーディオビジュアライザーの初期化に失敗しました',
};

const RETRYABLE_ERRORS: ErrorCode[] = [
  'NETWORK_ERROR',
  'API_ERROR',
  'OCR_FAILED',
  'SYNTHESIS_FAILED',
  'PLAYBACK_FAILED',
  'AUDIO_CONTEXT_FAILED'
];

const getErrorSeverity = (errorCode: ErrorCode): 'warning' | 'error' => {
  return RETRYABLE_ERRORS.includes(errorCode) ? 'warning' : 'error';
};

export default function HomePage() {
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
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

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

  const startSynthesis = useCallback(() => {
    if (systemState.currentText) {
      setSystemState(prev => ({
        ...prev,
        app: 'SYNTHESIZING',
        synthesisProgress: 0,
        error: null,
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
      // エラー状態をクリア
      setSystemState(prev => ({
        ...prev,
        error: null
      }));

      // VOICEVOX接続チェック
      if (systemState.error === 'NETWORK_ERROR' || systemState.error === 'API_ERROR') {
        checkVoicevoxConnection();
      }

      // テキスト入力状態に戻る
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

  const getAppStateColor = useCallback(() => {
    switch (systemState.app) {
      case 'IDLE': return 'text-gray-500';
      case 'INPUT_READY': return 'text-blue-600';
      case 'SYNTHESIZING': return 'text-orange-600';
      case 'AUDIO_READY': return 'text-green-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }, [systemState.app]);

  const getAppStateText = useCallback(() => {
    switch (systemState.app) {
      case 'IDLE': return 'テキスト入力待ち';
      case 'INPUT_READY': return '音声合成準備完了';
      case 'SYNTHESIZING': return `音声合成中 (${systemState.synthesisProgress}%)`;
      case 'AUDIO_READY': return '再生準備完了';
      case 'ERROR': return `エラー: ${ERROR_MESSAGES[systemState.error!] || '不明なエラー'}`;
      default: return '';
    }
  }, [systemState.app, systemState.synthesisProgress, systemState.error]);

  const getConnectionStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  }, [connectionStatus]);

  const getConnectionStatusText = useCallback(() => {
    switch (connectionStatus) {
      case 'connected': return 'VOICEVOX接続済み';
      case 'disconnected': return 'VOICEVOX接続エラー';
      case 'checking': return 'VOICEVOX接続確認中...';
      default: return '';
    }
  }, [connectionStatus]);

  const getCurrentSpeaker = useCallback(() => {
    return SPEAKERS.find(speaker => speaker.id === systemState.selectedSpeaker) || SPEAKERS[0];
  }, [systemState.selectedSpeaker]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              システム状態
            </h2>
            <div className={`text-lg font-semibold ${getAppStateColor()}`}>
              {getAppStateText()}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">
                {getConnectionStatusText()}
              </span>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showAdvanced ? '設定を隠す' : '詳細設定'}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        checked={systemState.selectedSpeaker === speaker.id}
                        onChange={(e) => handleSpeakerChange(Number(e.target.value) as SpeakerId)}
                        disabled={systemState.app === 'SYNTHESIZING'}
                        className="mr-3"
                      />
                      <span className="text-xl mr-2">{speaker.emoji}</span>
                      <span className="text-gray-700">{speaker.name}</span>
                      {systemState.selectedSpeaker === speaker.id && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          選択中
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  再生オプション
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">合成完了時に自動再生</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r ${getCurrentSpeaker().color} text-white font-medium`}>
              <span className="mr-2">{getCurrentSpeaker().emoji}</span>
              {getCurrentSpeaker().name}
            </div>

            {systemState.currentText && (
              <div className="text-sm text-gray-600">
                テキスト: {systemState.currentText.length.toLocaleString()}文字
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {systemState.app === 'INPUT_READY' && (
              <button
                onClick={startSynthesis}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                音声合成開始
              </button>
            )}

            {(systemState.app === 'ERROR' || systemState.app === 'AUDIO_READY') && (
              <button
                onClick={resetSystem}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                リセット
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <TextInputVertical
          onTextReady={handleTextReady}
          onError={handleTextInputError}
          onRetry={retryCurrentOperation}
          initialText=""
        />

        {systemState.currentText && systemState.app !== 'IDLE' && (
          <div className="transition-all duration-500 ease-in-out">
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

        {systemState.currentAudio && (
          <div className="transition-all duration-500 ease-in-out">
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

      {systemState.app === 'ERROR' && systemState.error && (
        <div className={`border rounded-lg p-4 ${
          getErrorSeverity(systemState.error) === 'warning'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`mt-1 ${
              getErrorSeverity(systemState.error) === 'warning'
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {getErrorSeverity(systemState.error) === 'warning' ? '⚠️' : '❌'}
            </div>
            <div className="flex-grow">
              <h3 className={`font-medium ${
                getErrorSeverity(systemState.error) === 'warning'
                  ? 'text-yellow-800'
                  : 'text-red-800'
              }`}>
                {getErrorSeverity(systemState.error) === 'warning'
                  ? '一時的なエラーが発生しました'
                  : 'エラーが発生しました'}
              </h3>
              <p className={`text-sm mt-1 ${
                getErrorSeverity(systemState.error) === 'warning'
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}>
                {ERROR_MESSAGES[systemState.error]}
              </p>
              <div className="mt-3 flex space-x-2">
                {RETRYABLE_ERRORS.includes(systemState.error) && (
                  <button
                    onClick={retryCurrentOperation}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    再試行
                  </button>
                )}
                <button
                  onClick={resetSystem}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'disconnected' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">
              ⚠️
            </div>
            <div>
              <h3 className="text-yellow-800 font-medium">
                VOICEVOX接続エラー
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                VOICEVOXエンジンに接続できません。Dockerコンテナが起動しているか確認してください。
              </p>
              <button
                onClick={checkVoicevoxConnection}
                className="mt-2 px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors"
              >
                再接続を試行
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-400 mr-3 mt-1">
            ℹ️
          </div>
          <div>
            <h3 className="text-blue-800 font-medium mb-2">
              使用方法
            </h3>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>上部のテキスト入力欄にテキストを入力するか、画像をアップロードしてOCR処理を行います</li>
              <li>話者（ずんだもん・四国めたん）を選択します</li>
              <li>「音声合成開始」ボタンをクリックして音声を生成します</li>
              <li>生成された音声を再生、ダウンロードできます</li>
            </ol>
            <div className="mt-3 text-xs text-blue-600">
              ※ 本アプリケーションはAI中心設計アーキテクチャの検証を目的としています
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}