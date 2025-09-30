'use client';

import React, { useCallback } from 'react';
import { useAppMachine } from './useAppMachine';
import { OCRSection } from './OCRSection';
import { TTSSection } from './TTSSection';
import { VoicevoxStatus } from './VoicevoxStatus';
import { HistorySection } from './HistorySection';
import { useHistoryPersistence } from './useHistoryPersistence';
import * as uiCore from '../core/ui.core';
import { HistoryItem } from '../contracts/types';

export function AppShell() {
  const { state, send, handleOCRUpload, handleTTSSynthesize, resetError } = useAppMachine();

  // buildAppState関数を使用してXStateのstateをAppStateに変換
  const appState = uiCore.buildAppState(state.value, state.context);
  const uiState = uiCore.deriveUIState(appState);

  // 履歴の永続化
  const handleLoadHistory = useCallback((history: HistoryItem[]) => {
    send({ type: 'LOAD_HISTORY', history });
  }, [send]);

  useHistoryPersistence({
    history: state.context.history,
    onLoad: handleLoadHistory
  });

  // 履歴操作ハンドラー
  const handleHistorySelect = useCallback((item: HistoryItem) => {
    send({ type: 'SELECT_FROM_HISTORY', historyItem: item });
    // TTSセクションにスクロール
    const ttsSection = document.querySelector('[data-section="tts"]');
    if (ttsSection) {
      ttsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [send]);

  const handleHistoryRemove = useCallback((itemId: string) => {
    send({ type: 'REMOVE_FROM_HISTORY', itemId });
  }, [send]);

  const handleHistoryClear = useCallback(() => {
    send({ type: 'CLEAR_HISTORY' });
  }, [send]);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">🎤 ずんだもん音声生成アプリ</h1>
              <p className="mt-2 text-gray-600">画像からテキストを抽出して、音声に変換します</p>
            </div>
            <VoicevoxStatus />
          </div>
        </header>

        {uiState.errorMessage && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center" role="alert">
            <span>{uiState.errorMessage}</span>
            <button
              onClick={resetError}
              className="text-red-800 hover:text-red-900 font-medium"
              aria-label="エラーを閉じる"
            >
              ✕
            </button>
          </div>
        )}

        {uiState.progressMessage && (
          <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded-lg" role="status" aria-live="polite">
            {uiState.progressMessage}
          </div>
        )}

        {uiState.showOCRSection && (
          <OCRSection
            onFileSelect={handleOCRUpload}
            isProcessing={uiState.isProcessing && state.matches('ocr_processing')}
            canSubmit={uiState.canSubmitOCR}
            extractedText={state.context?.ocrText}
          />
        )}

        {uiState.showTTSSection && (
          <div data-section="tts">
            <TTSSection
              onSynthesize={handleTTSSynthesize}
              isProcessing={uiState.isProcessing}
              canSubmit={uiState.canSubmitTTS}
              audioUrl={state.context?.audioUrl}
              audioFileName={state.context?.audioFileName}
              extractedText={state.context?.ocrText}
              progressMessage={uiState.progressMessage}
              progressPercentage={uiState.progressPercentage}
              onDownload={() => {
                // ダウンロードイベントを送信（必要に応じて）
                // send({ type: 'DOWNLOAD' });
              }}
            />
          </div>
        )}

        <HistorySection
          history={state.context.history}
          onSelect={handleHistorySelect}
          onRemove={handleHistoryRemove}
          onClear={handleHistoryClear}
        />
      </div>
    </main>
  );
}