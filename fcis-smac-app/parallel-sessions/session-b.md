# セッションB用指示書 - Shell層+UI統合

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14, React 18, TypeScript, VOICEVOX API, Tesseract.js
- **開発環境**: Linux, Node.js 20+

### 問題背景（調査結果）
- **現象**: OCR UIが完全に欠落、すべてのロジックがpage.tsxに混在
- **根本原因**: Shell層が未実装、コンポーネント分離なし
- **影響範囲**: UI/UXの完成度、保守性、再利用性
- **解決目標**: FCIS+SMAC準拠のShell層実装とOCR UI追加

## 2. 全体設計（決定事項）

### アーキテクチャ決定
Shell層として以下を実装：
- React HooksによるCore/State層の統合
- OCR UIコンポーネントの追加
- APIコールの管理
- 副作用の適切な隔離

### 共通契約仕様（セッションA定義済み）
```typescript
// アプリケーション状態定義
export type AppState =
  | { type: 'idle' }
  | { type: 'ocr_uploading'; file: File }
  | { type: 'ocr_processing' }
  | { type: 'ocr_complete'; text: string }
  | { type: 'tts_synthesizing'; text: string; speakerId: number }
  | { type: 'tts_playing'; audioUrl: string }
  | { type: 'error'; message: string; recoverable: boolean };

// UIState定義
export interface UIState {
  showOCRSection: boolean;
  showTTSSection: boolean;
  isProcessing: boolean;
  canSubmitOCR: boolean;
  canSubmitTTS: boolean;
  errorMessage?: string;
  progressMessage?: string;
}
```

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層
- **機能**: React統合、OCR UI実装、APIコール管理
- **スコープ**: UIコンポーネントとHooksの実装

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/shell/useAppMachine.tsx` - XState React統合Hook（新規作成）
- `/app/fcis-smac-app/shell/OCRSection.tsx` - OCR UIコンポーネント（新規作成）
- `/app/fcis-smac-app/shell/TTSSection.tsx` - TTS UIコンポーネント（新規作成）
- `/app/fcis-smac-app/shell/AppShell.tsx` - メインShellコンポーネント（新規作成）
- `/app/fcis-smac-app/app/page.tsx` - メインページ更新（編集）

## 4. 実装詳細

### useAppMachine Hook
```typescript
// /app/fcis-smac-app/shell/useAppMachine.tsx
import { useMachine } from '@xstate/react';
import { appMachine } from '../state/app.machine';
import * as ocrCore from '../core/ocr.core';
import * as ttsCore from '../core/tts.core';

export function useAppMachine() {
  const [state, send] = useMachine(appMachine);

  const handleOCRUpload = async (file: File) => {
    const validation = ocrCore.validateOCRFile(file);
    if (!validation.isValid) {
      send({ type: 'ERROR', message: validation.errors.join(', '), recoverable: true });
      return;
    }

    send({ type: 'START_OCR', file });
    send({ type: 'OCR_PROCESS' });

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const normalizedText = ocrCore.normalizeOCRText(data.data.normalizedText);
        send({ type: 'OCR_SUCCESS', text: normalizedText });
      } else {
        throw new Error(data.error || 'OCR処理に失敗しました');
      }
    } catch (error) {
      send({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'OCR処理エラー',
        recoverable: true
      });
    }
  };

  const handleTTSSynthesize = async (text: string, speakerId: number) => {
    const validation = ttsCore.validateTTSRequest(text, speakerId);
    if (!validation.isValid) {
      send({ type: 'ERROR', message: validation.errors.join(', '), recoverable: true });
      return;
    }

    send({ type: 'START_TTS', text, speakerId });

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speakerId })
      });

      const data = await response.json();
      if (response.ok && data.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        send({ type: 'TTS_SUCCESS', audioUrl });
      } else {
        throw new Error(data.error?.message || 'TTS処理に失敗しました');
      }
    } catch (error) {
      send({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'TTS処理エラー',
        recoverable: true
      });
    }
  };

  const resetError = () => send({ type: 'RESET' });

  return {
    state,
    send,
    handleOCRUpload,
    handleTTSSynthesize,
    resetError
  };
}
```

### OCR Section Component
```typescript
// /app/fcis-smac-app/shell/OCRSection.tsx
import React, { useRef } from 'react';

interface OCRSectionProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  canSubmit: boolean;
  extractedText?: string;
}

export function OCRSection({ onFileSelect, isProcessing, canSubmit, extractedText }: OCRSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">📷 画像からテキスト抽出（OCR）</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            画像ファイルを選択
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
            aria-label="画像ファイルを選択"
          />
          <p className="mt-1 text-sm text-gray-500">
            対応形式: JPEG, PNG, WebP, BMP（最大5MB）
          </p>
        </div>

        {isProcessing && (
          <div className="p-4 bg-blue-50 rounded" role="status" aria-live="polite">
            <p className="text-blue-700">処理中...</p>
          </div>
        )}

        {extractedText && (
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-medium mb-2">抽出されたテキスト:</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{extractedText}</p>
            <p className="mt-2 text-sm text-green-600">
              ✓ テキストの抽出が完了しました。下の音声生成セクションで読み上げできます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### TTS Section Component
```typescript
// /app/fcis-smac-app/shell/TTSSection.tsx
import React, { useState, useEffect } from 'react';

interface TTSSectionProps {
  onSynthesize: (text: string, speakerId: number) => void;
  isProcessing: boolean;
  canSubmit: boolean;
  audioUrl?: string;
  extractedText?: string;
}

export function TTSSection({
  onSynthesize,
  isProcessing,
  canSubmit,
  audioUrl,
  extractedText
}: TTSSectionProps) {
  const [text, setText] = useState('');
  const [speakerId, setSpeakerId] = useState(3);

  useEffect(() => {
    if (extractedText) {
      setText(extractedText);
    }
  }, [extractedText]);

  const handleSubmit = () => {
    onSynthesize(text, speakerId);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">🎙️ テキスト読み上げ</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">話者選択</label>
          <div className="space-x-4" role="radiogroup" aria-label="話者選択">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={3}
                checked={speakerId === 3}
                onChange={(e) => setSpeakerId(Number(e.target.value))}
                className="mr-2"
                aria-label="ずんだもん"
              />
              <span>ずんだもん</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={2}
                checked={speakerId === 2}
                onChange={(e) => setSpeakerId(Number(e.target.value))}
                className="mr-2"
                aria-label="四国めたん"
              />
              <span>四国めたん</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="tts-text">
            テキスト入力（最大30,000文字）
          </label>
          <textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={speakerId === 3 ?
              "ここにテキストを入力するのだ！" :
              "ここにテキストを入力してね！"}
            className="w-full h-40 p-3 border rounded-lg resize-y"
            maxLength={30000}
            disabled={isProcessing}
            aria-describedby="char-count"
          />
          <div id="char-count" className="text-sm text-gray-600 mt-1">
            {text.length} / 30,000 文字
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isProcessing || !text.trim()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          aria-busy={isProcessing}
        >
          {isProcessing ? '生成中...' : '音声を生成'}
        </button>

        {audioUrl && (
          <div className="p-4 bg-gray-100 rounded">
            <audio controls src={audioUrl} className="w-full mb-2" aria-label="生成された音声" />
            <a
              href={audioUrl}
              download={`${speakerId === 3 ? 'zundamon' : 'metan'}_${Date.now()}.wav`}
              className="text-blue-600 hover:underline"
            >
              音声をダウンロード
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

### App Shell Component
```typescript
// /app/fcis-smac-app/shell/AppShell.tsx
'use client';

import React from 'react';
import { useAppMachine } from './useAppMachine';
import { OCRSection } from './OCRSection';
import { TTSSection } from './TTSSection';
import * as uiCore from '../core/ui.core';

export function AppShell() {
  const { state, handleOCRUpload, handleTTSSynthesize, resetError } = useAppMachine();
  const uiState = uiCore.deriveUIState(state.value);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🎤 ずんだもん音声生成アプリ</h1>
          <p className="mt-2 text-gray-600">画像からテキストを抽出して、音声に変換します</p>
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
          <TTSSection
            onSynthesize={handleTTSSynthesize}
            isProcessing={uiState.isProcessing && state.matches('tts_synthesizing')}
            canSubmit={uiState.canSubmitTTS}
            audioUrl={state.context?.audioUrl}
            extractedText={state.context?.ocrText}
          />
        )}
      </div>
    </main>
  );
}
```

### Main Page Update
```typescript
// /app/fcis-smac-app/app/page.tsx
'use client';

import React from 'react';
import { AppShell } from '../shell/AppShell';

export default function Home() {
  return <AppShell />;
}
```

## 5. 実行コマンド

```bash
# Shell層ファイル作成
mkdir -p /app/fcis-smac-app/shell
touch /app/fcis-smac-app/shell/useAppMachine.tsx
touch /app/fcis-smac-app/shell/OCRSection.tsx
touch /app/fcis-smac-app/shell/TTSSection.tsx
touch /app/fcis-smac-app/shell/AppShell.tsx

# ビルド確認
cd /app/fcis-smac-app
npm run build
npm run dev
```

## 6. 完了基準

- [x] OCR UIが表示され動作する
- [x] TTS UIが正常動作する
- [x] Core/State層と正しく統合
- [x] エラーハンドリング完備
- [x] アクセシビリティ対応
- [x] TypeScript型チェック通過

---
**実装開始**: 上記仕様に従ってShell層とUIを実装してください。
**質問がある場合**: 契約の範囲内で最善の判断を行ってください。