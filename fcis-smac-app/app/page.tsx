'use client';

import React, { useState, useCallback } from 'react';
import { VoicevoxSynthesisBlock, useVoicevoxSynthesis } from '../shell/voicevox.shell.client.vertical';
import { UIInputComponent } from '../shell/ui-input.shell.client.vertical';
import { StatusDisplay } from '../shell/status-display.shell.client.vertical';
import type { VoiceSynthesisContract } from '../contracts/voice-synthesis.contract';

export default function Home() {
  // 状態管理
  const [inputText, setInputText] = useState('');
  const [currentSpeakerId, setCurrentSpeakerId] = useState(3);

  // VoicevoxSynthesis フックの直接使用
  const synthesis = useVoicevoxSynthesis();

  // UIInput用のイベントハンドラー
  const handleSynthesize = useCallback((text: string, speakerId: number) => {
    if (synthesis && text.trim()) {
      setInputText(text);
      setCurrentSpeakerId(speakerId);
      synthesis.synthesizeVoice(text, speakerId).catch((error) => {
        // エラーはStatusDisplayで表示される
      });
    }
  }, [synthesis]);

  const handleStop = useCallback(() => {
    if (synthesis) {
      synthesis.stopSynthesis();
    }
  }, [synthesis]);

  const handleReset = useCallback(() => {
    if (synthesis) {
      synthesis.reset();
    }
    setInputText('');
  }, [synthesis]);

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (synthesis && synthesis.canRetry()) {
      synthesis.retryLastSynthesis();
    }
  }, [synthesis]);

  // StatusDisplay用の状態マッピング

  const getSynthesisState = () => {
    if (!synthesis) return 'idle';

    if (synthesis.isFailed) return 'error';
    if (synthesis.isCompleted) return 'completed';
    if (synthesis.isProcessing) return 'synthesizing';
    return 'idle';
  };

  const getProgress = () => {
    if (!synthesis) return null;

    const progress = synthesis.getProgress();
    return {
      percentage: progress.percentage,
      processedChunks: progress.processedChunks,
      totalChunks: progress.totalChunks,
      startTime: progress.startTime // タイムアウト検知用のタイムスタンプ
    };
  };

  const getError = () => {
    if (!synthesis || !synthesis.error) return null;

    const error = synthesis.error;
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
              disabled={synthesis?.isProcessing ?? false}
              isProcessing={synthesis?.isProcessing ?? false}
              className="w-full"
            />

            <StatusDisplay
              synthesisState={getSynthesisState()}
              progress={getProgress()}
              error={getError()}
              onRetry={handleRetry}
              onReset={handleReset}
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
                <p>1. <span className="hidden md:inline">左側</span><span className="md:hidden">上部</span>のテキスト入力欄に読み上げたいテキストを入力</p>
                <p>2. 話者を選択（デフォルト: ずんだもん通常）</p>
                <p>3. 「開始」ボタンを押すか、Ctrl+Enterで音声合成開始</p>
                <p>4. <span className="hidden md:inline">右側</span><span className="md:hidden">下部</span>で合成処理の進捗と状態を確認</p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-6 sm:mt-8 md:mt-12 px-2 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-green-200">
            <h3 className="font-bold text-green-800 mb-3 text-sm sm:text-base">利用規約・クレジット</h3>
            <div className="text-xs sm:text-sm text-green-700 space-y-2">
              <div>
                <p className="font-medium">VOICEVOX: ずんだもん</p>
                <p>音声合成：VOICEVOX by Hiroshiba Kazuyuki</p>
                <p>キャラクター：東北ずん子プロジェクト</p>
              </div>
              <div className="border-t border-green-200 pt-2 mt-2">
                <p className="text-xs text-green-600">
                  このアプリケーションはVOICEVOXの利用規約に従って開発されています。
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}