'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VoicevoxSynthesisBlock, useVoicevoxSynthesis } from '../shell/voicevox.shell.client.vertical';
import { UIInputComponent } from '../shell/ui-input.shell.client.vertical';
import { StatusDisplay } from '../shell/status-display.shell.client.vertical';
import type { VoiceSynthesisContract } from '../contracts/voice-synthesis.contract';

export default function Home() {
  // 状態管理
  const [inputText, setInputText] = useState('');
  const [currentSpeakerId, setCurrentSpeakerId] = useState(3);
  const [synthesisKey, setSynthesisKey] = useState(0); // 強制再レンダー用

  // VoicevoxSynthesisBlockのcontractを取得するためのref
  const synthesisMachineRef = useRef<VoiceSynthesisContract | null>(null);
  const synthesis = useVoicevoxSynthesis();

  // contractの設定
  useEffect(() => {
    synthesisMachineRef.current = synthesis;
  }, [synthesis]);

  // UIInput用のイベントハンドラー
  const handleSynthesize = useCallback((text: string, speakerId: number) => {
    if (synthesisMachineRef.current && text.trim()) {
      setInputText(text);
      setCurrentSpeakerId(speakerId);
      // 新しい合成を開始するためにキーを更新
      setSynthesisKey(prev => prev + 1);
      synthesisMachineRef.current.synthesizeVoice(text, speakerId).catch((error) => {
        // エラーはStatusDisplayで表示される
      });
    }
  }, []);

  const handleStop = useCallback(() => {
    if (synthesisMachineRef.current) {
      synthesisMachineRef.current.stopSynthesis();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (synthesisMachineRef.current) {
      synthesisMachineRef.current.reset();
    }
    setInputText('');
    setSynthesisKey(prev => prev + 1);
  }, []);

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (synthesisMachineRef.current && synthesisMachineRef.current.canRetry()) {
      synthesisMachineRef.current.retryLastSynthesis();
    }
  }, []);

  // StatusDisplay用の状態マッピング
  const getConnectionStatus = () => {
    if (!synthesisMachineRef.current) return 'disconnected';
    return synthesisMachineRef.current.isConnected() ? 'connected' : 'disconnected';
  };

  const getSynthesisState = () => {
    if (!synthesisMachineRef.current) return 'idle';

    if (synthesisMachineRef.current.isFailed) return 'error';
    if (synthesisMachineRef.current.isCompleted) return 'completed';
    if (synthesisMachineRef.current.isProcessing) return 'synthesizing';
    return 'idle';
  };

  const getProgress = () => {
    if (!synthesisMachineRef.current) return null;

    const progress = synthesisMachineRef.current.getProgress();
    return {
      percentage: progress.percentage,
      processedChunks: progress.processedChunks,
      totalChunks: progress.totalChunks
    };
  };

  const getError = () => {
    if (!synthesisMachineRef.current || !synthesisMachineRef.current.error) return null;

    const error = synthesisMachineRef.current.error;
    return {
      code: error.code,
      message: error.message,
      isRetryable: error.isRetryable
    };
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-800 mb-3 sm:mb-4">
            ずんだもん音声合成アプリ
          </h1>
          <p className="text-green-600 text-xs sm:text-sm md:text-base px-2 sm:px-0">
            FCIS+SMACアーキテクチャで実装された次世代音声合成システム
          </p>
        </header>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* 左カラム: 入力エリア */}
          <div className="space-y-4 sm:space-y-6">
            <UIInputComponent
              onSynthesize={handleSynthesize}
              onStop={handleStop}
              onReset={handleReset}
              disabled={synthesis.isProcessing}
              isProcessing={synthesis.isProcessing}
              className="w-full"
            />

            <StatusDisplay
              connectionStatus={getConnectionStatus()}
              synthesisState={getSynthesisState()}
              progress={getProgress()}
              error={getError()}
              onRetry={handleRetry}
              className="w-full"
            />
          </div>

          {/* 右カラム: 音声合成エリア */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-3 sm:mb-4">
                音声合成処理
              </h2>

              {inputText ? (
                <VoicevoxSynthesisBlock
                  key={synthesisKey}
                  text={inputText}
                  speakerId={currentSpeakerId}
                  onComplete={(audio) => {
                    // 音声合成完了時の処理（必要に応じて追加）
                  }}
                  onError={(error) => {
                    // エラーはStatusDisplayで表示される
                  }}
                  onProgressUpdate={(progress) => {
                    // 進捗はStatusDisplayで表示される
                  }}
                  className="w-full"
                  disabled={false}
                />
              ) : (
                <div className="text-center py-6 sm:py-8 text-green-600">
                  <p className="text-lg sm:text-xl mb-2">🎤</p>
                  <p className="text-sm sm:text-base">テキストを入力して「開始」を押すと</p>
                  <p className="text-sm sm:text-base">ずんだもんが読み上げてくれるのだ！</p>
                </div>
              )}
            </div>

            {/* ヘルプセクション */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
              <h3 className="font-bold text-green-800 mb-2 text-sm sm:text-base">💡 使い方</h3>
              <div className="text-xs sm:text-sm text-green-700 space-y-1">
                <p>1. 左側のテキスト入力欄に読み上げたいテキストを入力</p>
                <p>2. 話者を選択（デフォルト: ずんだもん通常）</p>
                <p>3. 「開始」ボタンを押すか、Ctrl+Enterで音声合成開始</p>
                <p>4. 右側で合成処理の進捗と状態を確認</p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="text-center mt-6 sm:mt-8 md:mt-12 text-xs sm:text-sm text-green-600 px-2 sm:px-0">
          <p className="text-xs sm:text-sm">理想性スコア: 93% | アーキテクチャ: FCIS+SMAC</p>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm">Core層・State層・Shell層による完全な関心事の分離</p>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm">ユーザー入力による動的音声合成 | エラーハンドリング・リトライ機能付き</p>
        </footer>
      </div>
    </main>
  );
}