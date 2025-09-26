'use client';

/**
 * FCIS+SMAC Shell層実装
 * UI Input Component - テキスト入力、制御ボタン、話者選択のIOレイヤー
 *
 * 責務:
 * - ユーザー入力の取得と管理（テキストエリア、ボタン、ドロップダウン）
 * - バリデーション処理（文字数制限、空文字チェック）
 * - UI状態管理（useState）
 * - イベント処理とコールバック呼び出し
 * - Tailwind CSSによるスタイリング
 */

import React, { useState, useCallback, useEffect } from 'react';

// ===== コントラクト定義 =====
export interface UIInputContract {
  onSynthesize: (text: string, speakerId: number) => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

// ===== 定数定義 =====
const MAX_CHARS = 1000;

const SPEAKER_OPTIONS = [
  { id: 3, name: 'ずんだもん（通常）' },
  { id: 1, name: 'ずんだもん（あまあま）' },
  { id: 7, name: 'ずんだもん（ツンツン）' },
  { id: 5, name: 'ずんだもん（セクシー）' }
];

// ===== UIInputComponent実装 =====
export interface UIInputComponentProps extends UIInputContract {
  className?: string;
}

export const UIInputComponent: React.FC<UIInputComponentProps> = ({
  onSynthesize,
  onStop,
  onReset,
  disabled = false,
  isProcessing = false,
  className = ''
}) => {
  // 内部状態管理
  const [text, setText] = useState('');
  const [speakerId, setSpeakerId] = useState(3); // デフォルトは「ずんだもん（通常）」
  const [isValid, setIsValid] = useState(false);

  // バリデーション処理
  const validateInput = useCallback((inputText: string): boolean => {
    return inputText.trim().length > 0 && inputText.length <= MAX_CHARS;
  }, []);

  // テキスト変更ハンドラー
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    setIsValid(validateInput(newText));
  }, [validateInput]);

  // 話者変更ハンドラー
  const handleSpeakerChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeakerId(parseInt(event.target.value, 10));
  }, []);

  // 開始ボタンハンドラー
  const handleStart = useCallback(() => {
    if (isValid && !disabled) {
      onSynthesize(text.trim(), speakerId);
    }
  }, [isValid, disabled, text, speakerId, onSynthesize]);

  // 停止ボタンハンドラー
  const handleStop = useCallback(() => {
    if (!disabled) {
      onStop();
    }
  }, [disabled, onStop]);

  // リセットボタンハンドラー
  const handleReset = useCallback(() => {
    if (!disabled) {
      setText('');
      setIsValid(false);
      onReset();
    }
  }, [disabled, onReset]);

  // キーボードショートカット（Ctrl+Enter で開始）
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && event.key === 'Enter' && isValid && !disabled && !isProcessing) {
      event.preventDefault();
      handleStart();
    }
  }, [isValid, disabled, isProcessing, handleStart]);

  // 初回マウント時にバリデーション実行
  useEffect(() => {
    setIsValid(validateInput(text));
  }, [text, validateInput]);

  // 文字数と残り文字数の計算
  const currentLength = text.length;
  const remainingChars = MAX_CHARS - currentLength;
  const isOverLimit = currentLength > MAX_CHARS;

  return (
    <div className={`ui-input-component bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* ヘッダー */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-green-800 mb-2">テキスト読み上げ</h2>
        <p className="text-sm text-green-600">読み上げたいテキストを入力してください</p>
      </div>

      {/* テキストエリア */}
      <div className="mb-4">
        <label htmlFor="text-input" className="block text-sm font-medium text-green-700 mb-2">
          読み上げテキスト
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="ここに読み上げたいテキストを入力してください..."
          className={`w-full h-32 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 transition-colors ${
            isOverLimit
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : text.trim().length > 0
              ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
              : 'border-gray-300 focus:border-green-500 focus:ring-green-200'
          }`}
          disabled={disabled}
          maxLength={MAX_CHARS + 100} // 制限を少し超えても入力できるようにして、UIでエラー表示
        />

        {/* 文字数表示 */}
        <div className="flex justify-between items-center mt-2">
          <div className={`text-xs ${
            isOverLimit ? 'text-red-500' : remainingChars < 50 ? 'text-yellow-600' : 'text-gray-500'
          }`}>
            {currentLength} / {MAX_CHARS} 文字
          </div>
          <div className={`text-xs ${
            isOverLimit ? 'text-red-500' : remainingChars < 50 ? 'text-yellow-600' : 'text-gray-500'
          }`}>
            残り: {remainingChars} 文字
          </div>
        </div>

        {/* バリデーションエラー表示 */}
        {isOverLimit && (
          <div className="mt-2 text-sm text-red-600">
            文字数が制限を超えています。{MAX_CHARS}文字以内にしてください。
          </div>
        )}
        {text.trim().length === 0 && text.length > 0 && (
          <div className="mt-2 text-sm text-yellow-600">
            空白のみのテキストは読み上げできません。
          </div>
        )}
      </div>

      {/* 話者選択 */}
      <div className="mb-6">
        <label htmlFor="speaker-select" className="block text-sm font-medium text-green-700 mb-2">
          話者選択
        </label>
        <select
          id="speaker-select"
          value={speakerId}
          onChange={handleSpeakerChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-colors bg-white"
          disabled={disabled}
        >
          {SPEAKER_OPTIONS.map((speaker) => (
            <option key={speaker.id} value={speaker.id}>
              {speaker.name}
            </option>
          ))}
        </select>
      </div>

      {/* 制御ボタン */}
      <div className="flex flex-wrap gap-3">
        {/* 開始ボタン */}
        <button
          onClick={handleStart}
          disabled={disabled || !isValid || isProcessing}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex-1 min-w-0 ${
            disabled || !isValid || isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-md hover:shadow-lg'
          }`}
          title={!isValid ? '有効なテキストを入力してください' : 'Ctrl+Enterでも開始できます'}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⏳</span>
              処理中...
            </span>
          ) : (
            '開始'
          )}
        </button>

        {/* 停止ボタン */}
        <button
          onClick={handleStop}
          disabled={disabled || !isProcessing}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex-1 min-w-0 ${
            disabled || !isProcessing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg'
          }`}
        >
          停止
        </button>

        {/* リセットボタン */}
        <button
          onClick={handleReset}
          disabled={disabled}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex-1 min-w-0 ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-md hover:shadow-lg'
          }`}
        >
          リセット
        </button>
      </div>

      {/* ヘルプテキスト */}
      <div className="mt-4 text-xs text-gray-600">
        <p>💡 ヒント: Ctrl+Enter で素早く読み上げを開始できます</p>
      </div>
    </div>
  );
};

// Runtime declaration
export const RUNTIME = 'client' as const;