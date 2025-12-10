// ============================================================
// shell.tsx - TSD-107 ずんだ読み上げ Shell層
// ============================================================
// 責務: UIとIO処理
// - 可能な限り薄く、ロジックを持たない
// - State層の利用、UI描画、イベント処理
// - ビジネスロジック禁止、直接API呼び出し禁止
// ============================================================

'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useMachine } from '@xstate/react';
import { appMachine, getAppStatus, canGenerate, getCurrentSpeakerConfig } from './state';
import type { SpeakerId, InputMode, OcrStep } from './types';
import { OCR_STEP_LABELS } from './types';
import { formatCharacterCount, isOverCharacterLimit, getAllSpeakers, generateFilename } from './core';

// ------------------------------------------------------------
// IO処理（Shell層の責務）
// ------------------------------------------------------------

/** Blobをダウンロードする */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// メインコンポーネント
// ------------------------------------------------------------

export function AppShell() {
  const [state, send] = useMachine(appMachine);
  const { context } = state;
  const status = getAppStatus(state);
  const speakerConfig = getCurrentSpeakerConfig(context);
  const canSubmit = canGenerate(context);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zundamon-light to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <Header />

        {/* メインカード */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* 話者選択 */}
          <SpeakerSelector
            selectedId={context.speakerId}
            onChange={(id) => send({ type: 'SET_SPEAKER', speakerId: id })}
            disabled={status === 'generating'}
          />

          {/* 入力モードタブ */}
          <InputModeTabs
            mode={context.inputMode}
            onChange={(mode) => send({ type: 'SET_INPUT_MODE', mode })}
            disabled={status === 'generating'}
          />

          {/* 入力エリア */}
          {context.inputMode === 'text' ? (
            <TextInput
              value={context.text}
              onChange={(text) => send({ type: 'SET_TEXT', text })}
              placeholder={speakerConfig.placeholder}
              disabled={status === 'generating'}
            />
          ) : (
            <OcrUpload
              file={context.ocrImage}
              progress={context.ocrProgress}
              onFileSelect={(file) => send({ type: 'SET_OCR_IMAGE', file })}
              onStartOcr={() => send({ type: 'START_OCR' })}
              disabled={status === 'generating'}
              isProcessing={state.value === 'ocr'}
            />
          )}

          {/* エラー表示 */}
          {context.error && <ErrorMessage message={context.error} />}

          {/* 生成ボタン or 成功時のUI */}
          {status === 'success' ? (
            <SuccessSection
              onDownload={() => {
                if (context.audioBlob) {
                  const filename = generateFilename(context.speakerId);
                  downloadBlob(context.audioBlob, filename);
                }
              }}
              onReset={() => send({ type: 'RESET' })}
            />
          ) : (
            <GenerateButton
              text={speakerConfig.buttonText}
              onClick={() => send({ type: 'GENERATE' })}
              disabled={!canSubmit || status === 'generating'}
              isLoading={status === 'generating'}
              progress={context.generateProgress}
            />
          )}
        </div>

        {/* フッター（クレジット） */}
        <Footer />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// サブコンポーネント
// ------------------------------------------------------------

/** ヘッダー */
function Header() {
  return (
    <header className="text-center mb-8">
      <h1 className="text-3xl font-bold text-zundamon-dark mb-2">
        VOICEVOX音声生成システム
      </h1>
      <p className="text-gray-600">
        好きなキャラクターの声で読み上げます！
      </p>
    </header>
  );
}

/** 話者選択 */
function SpeakerSelector({
  selectedId,
  onChange,
  disabled,
}: {
  selectedId: SpeakerId;
  onChange: (id: SpeakerId) => void;
  disabled: boolean;
}) {
  const speakers = getAllSpeakers();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        キャラクター選択
      </label>
      <div className="flex gap-4">
        {speakers.map((speaker) => (
          <label
            key={speaker.id}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer
              transition-all duration-200
              ${selectedId === speaker.id
                ? 'border-zundamon-green bg-zundamon-light'
                : 'border-gray-200 hover:border-zundamon-green/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="speaker"
              value={speaker.id}
              checked={selectedId === speaker.id}
              onChange={() => onChange(speaker.id)}
              disabled={disabled}
              className="text-zundamon-green focus:ring-zundamon-green"
            />
            <span className="font-medium">{speaker.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** 入力モードタブ */
function InputModeTabs({
  mode,
  onChange,
  disabled,
}: {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex border-b border-gray-200">
      <TabButton
        active={mode === 'text'}
        onClick={() => onChange('text')}
        disabled={disabled}
      >
        📝 テキスト入力
      </TabButton>
      <TabButton
        active={mode === 'ocr'}
        onClick={() => onChange('ocr')}
        disabled={disabled}
      >
        🖼️ 画像からOCR
      </TabButton>
    </div>
  );
}

/** タブボタン */
function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 font-medium transition-colors
        ${active
          ? 'text-zundamon-dark border-b-2 border-zundamon-green'
          : 'text-gray-500 hover:text-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

/** テキスト入力エリア */
function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOver = isOverCharacterLimit(value.length);

  // 自動高さ調整
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        className={`
          w-full px-4 py-3 rounded-lg border-2 resize-none
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-zundamon-green/50
          ${isOver
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-200 focus:border-zundamon-green'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
      />
      <div className={`text-sm text-right ${isOver ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
        {formatCharacterCount(value.length)}
      </div>
    </div>
  );
}

/** OCRアップロードエリア */
function OcrUpload({
  file,
  progress,
  onFileSelect,
  onStartOcr,
  disabled,
  isProcessing,
}: {
  file: File | null;
  progress: { step: OcrStep; progress: number } | null;
  onFileSelect: (file: File | null) => void;
  onStartOcr: () => void;
  disabled: boolean;
  isProcessing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // プレビューURL管理（メモリリーク防止）
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [disabled, onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelect(selectedFile);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-4">
      {/* ドロップエリア */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          transition-colors duration-200 cursor-pointer
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-zundamon-green hover:bg-zundamon-light/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-600">
          画像をドラッグ&ドロップ または クリックして選択
        </p>
        <p className="text-sm text-gray-400 mt-1">
          JPEG, PNG, WEBP（最大5MB）
        </p>
      </div>

      {/* ファイルプレビュー */}
      {file && !isProcessing && previewUrl && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
              <img
                src={previewUrl}
                alt="プレビュー"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartOcr}
            className="px-4 py-2 bg-zundamon-green text-white rounded-lg hover:bg-zundamon-dark transition-colors"
          >
            テキスト抽出
          </button>
        </div>
      )}

      {/* OCR進捗表示 */}
      {isProcessing && progress && (
        <div className="bg-zundamon-light rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <LoadingSpinner size="sm" />
            <span className="font-medium">{OCR_STEP_LABELS[progress.step]}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-zundamon-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 生成ボタン */
function GenerateButton({
  text,
  onClick,
  disabled,
  isLoading,
  progress,
}: {
  text: string;
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  progress: { current: number; total: number } | null;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full py-4 rounded-xl font-bold text-lg
          transition-all duration-200 transform
          ${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-zundamon-green text-white hover:bg-zundamon-dark hover:scale-[1.02] active:scale-[0.98]'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            {progress
              ? `音声生成中... ${Math.round((progress.current / progress.total) * 100)}%`
              : '音声を生成中...'
            }
          </span>
        ) : (
          text
        )}
      </button>
      {/* 進捗バー */}
      {isLoading && progress && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-zundamon-green h-2 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** 成功時のセクション */
function SuccessSection({
  onDownload,
  onReset,
}: {
  onDownload: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-green-700 font-medium">音声の生成が完了しました！</p>
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 py-3 bg-zundamon-green text-white rounded-xl font-bold hover:bg-zundamon-dark transition-colors"
        >
          📥 ダウンロード
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-3 border-2 border-zundamon-green text-zundamon-dark rounded-xl font-bold hover:bg-zundamon-light transition-colors"
        >
          🔄 もう一度作る
        </button>
      </div>
    </div>
  );
}

/** エラーメッセージ */
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-700 text-sm">{message}</p>
    </div>
  );
}

/** ローディングスピナー */
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  );
}

/** フッター（クレジット） */
function Footer() {
  return (
    <footer className="mt-8 text-center text-sm text-gray-500">
      <p>VOICEVOX:ずんだもん / VOICEVOX:四国めたん</p>
      <p className="mt-1">
        <a
          href="https://voicevox.hiroshiba.jp/term/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zundamon-green hover:underline"
        >
          VOICEVOX利用規約
        </a>
      </p>
    </footer>
  );
}

// ------------------------------------------------------------
// End of shell.tsx
// ------------------------------------------------------------
