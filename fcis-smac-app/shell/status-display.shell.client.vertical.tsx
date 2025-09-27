'use client';

/**
 * FCIS+SMAC Shell層実装
 * Status Display Component - 接続状態、進行状況、エラー表示
 *
 * 責務:
 * - 純粋表示コンポーネント（副作用なし）
 * - 音声合成進行状況バー表示
 * - エラー状態とリトライボタン表示
 * - 合成状態表示（アイドル、合成中、再生中等）
 * - Tailwind CSS緑系統デザイン
 */

import React from 'react';

// ===== Contract Definition =====
export interface StatusDisplayContract {
  synthesisState: 'idle' | 'synthesizing' | 'completed' | 'error';
  progress: {
    percentage: number;
    processedChunks: number;
    totalChunks: number;
    startTime?: number; // タイムアウト検知用
  } | null;
  error: {
    code: string;
    message: string;
    isRetryable: boolean;
  } | null;
  onRetry?: () => void;
  onReset?: () => void;
}

// ===== Component Implementation =====


/**
 * 進行状況バー
 */
interface ProgressBarProps {
  progress: StatusDisplayContract['progress'];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  if (!progress) return null;

  // タイムアウト警告の判定（30秒以上経過）
  const isTimeout = progress.startTime ? (Date.now() - progress.startTime) > 30000 : false;
  const isLongRunning = progress.startTime ? (Date.now() - progress.startTime) > 15000 : false;

  return (
    <div className="space-y-2 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-green-700">
          音声合成進行状況
        </span>
        <span className="text-xs sm:text-sm text-green-600 font-bold">
          {Math.round(progress.percentage)}%
        </span>
      </div>

      {/* プログレスバー */}
      <div className="relative w-full bg-green-200 rounded-full h-2 sm:h-3">
        <div
          className={`h-2 sm:h-3 rounded-full transition-all duration-300 ease-out ${
            isTimeout ? 'bg-orange-500' : isLongRunning ? 'bg-yellow-500' : 'bg-green-600'
          }`}
          style={{ width: `${Math.round(progress.percentage)}%` }}
        />
      </div>

      {/* チャンク情報 */}
      {progress.totalChunks > 1 && (
        <div className="text-xs text-green-600 text-center font-medium">
          {progress.processedChunks}/{progress.totalChunks} チャンク処理済み
        </div>
      )}

      {/* タイムアウト警告 */}
      {isTimeout && (
        <div className="flex items-center justify-center space-x-1 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 border border-orange-200">
          <span>⏰</span>
          <span>処理に時間がかかっています...</span>
        </div>
      )}
      {isLongRunning && !isTimeout && (
        <div className="flex items-center justify-center space-x-1 text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1 border border-yellow-200">
          <span>⏳</span>
          <span>処理中です。しばらくお待ちください</span>
        </div>
      )}
    </div>
  );
};

/**
 * 合成状態インジケーター
 */
interface SynthesisStateIndicatorProps {
  state: StatusDisplayContract['synthesisState'];
}

const SynthesisStateIndicator: React.FC<SynthesisStateIndicatorProps> = ({ state }) => {
  const getStateConfig = () => {
    switch (state) {
      case 'idle':
        return {
          color: 'bg-gray-400',
          text: 'アイドル',
          textColor: 'text-gray-600',
          icon: '⏸️',
          animate: false
        };
      case 'synthesizing':
        return {
          color: 'bg-green-500',
          text: '音声合成中',
          textColor: 'text-green-700',
          icon: '⚙️',
          animate: true
        };
      case 'completed':
        return {
          color: 'bg-green-600',
          text: '完了',
          textColor: 'text-green-800',
          icon: '✅',
          animate: false
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'エラー',
          textColor: 'text-red-700',
          icon: '❌',
          animate: false
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center space-x-2">
        <span className="text-base sm:text-lg">{config.icon}</span>
        <div
          className={`w-3 h-3 rounded-full ${config.color} ${
            config.animate ? 'animate-pulse' : ''
          }`}
        />
      </div>
      <span className={`text-xs sm:text-sm font-medium ${config.textColor}`}>
        合成状態: {config.text}
      </span>
    </div>
  );
};

/**
 * エラー表示
 */
interface ErrorDisplayProps {
  error: StatusDisplayContract['error'];
  onRetry?: () => void;
  onReset?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onReset }) => {
  if (!error) return null;

  // エラーコードに基づく詳細情報を取得
  const getErrorHelp = (errorCode: string) => {
    switch (errorCode) {
      case 'NETWORK':
        return {
          title: 'ネットワークエラー',
          message: 'ネットワーク接続に問題があります',
          help: 'インターネット接続を確認してください。',
          actions: ['接続を確認する', '再試行する'],
          icon: '🌐'
        };
      case 'TIMEOUT':
        return {
          title: 'タイムアウトエラー',
          message: '処理時間が制限を超えました',
          help: 'テキストを短くするか、サーバーの応答を確認してください。',
          actions: ['テキストを分割する', '再試行する'],
          icon: '⏰'
        };
      case 'AUDIO_SYNTHESIS_FAILED':
        return {
          title: '音声合成エラー',
          message: '音声の生成に失敗しました',
          help: 'テキストの内容や話者設定を確認してください。',
          actions: ['話者を変更する', '内容を確認する'],
          icon: '🎤'
        };
      case 'AUDIO_DOWNLOAD_FAILED':
        return {
          title: '音声ダウンロードエラー',
          message: '音声のダウンロードに失敗しました',
          help: 'ブラウザの設定やファイル保存場所を確認してください。',
          actions: ['再試行する', 'ブラウザを更新する'],
          icon: '📥'
        };
      case 'INVALID_SPEAKER':
        return {
          title: '話者エラー',
          message: '指定された話者が見つかりません',
          help: '話者設定を確認してください。',
          actions: ['話者を再選択する', '設定をリセットする'],
          icon: '👤'
        };
      case 'TEXT_TOO_LONG':
        return {
          title: 'テキスト長エラー',
          message: 'テキストが長すぎます',
          help: 'テキストを短く分割してください。',
          actions: ['テキストを分割する', '内容を編集する'],
          icon: '📝'
        };
      default:
        return {
          title: 'エラーが発生しました',
          message: error.message,
          help: '問題が解決しない場合は、アプリケーションをリセットしてください。',
          actions: ['再試行する', 'リセットする'],
          icon: '❌'
        };
    }
  };

  const errorHelp = getErrorHelp(error.code);

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border ${
        error.isRetryable
          ? 'bg-red-50 border-red-200'
          : 'bg-red-50 border-red-200'
      }`}
    >
      {/* エラーヘッダー */}
      <div className="flex items-start space-x-2 sm:space-x-3 mb-3">
        <div className="flex-shrink-0">
          <span className="text-lg sm:text-xl">{errorHelp.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-red-800 font-semibold text-sm sm:text-base">
            {errorHelp.title}
          </h3>
          <p className="text-red-700 text-xs sm:text-sm mt-1">
            {errorHelp.message}
          </p>
        </div>
      </div>

      {/* エラーコード */}
      <div className="mb-3 p-2 bg-red-100 rounded text-xs sm:text-sm">
        <span className="font-mono text-red-800">エラーコード: {error.code}</span>
      </div>

      {/* 対処法 */}
      <div className="mb-4">
        <p className="text-gray-700 text-xs sm:text-sm mb-2">
          💡 {errorHelp.help}
        </p>
        <div className="text-xs text-gray-600 space-y-1">
          {errorHelp.actions.map((action, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-400">•</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-2">
        {error.isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <span>🔄</span>
            <span>再試行</span>
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
          >
            <span>🔄</span>
            <span>リセット</span>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * メインステータス表示コンポーネント
 */
export interface StatusDisplayProps extends StatusDisplayContract {
  className?: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  synthesisState,
  progress,
  error,
  onRetry,
  onReset,
  className = ''
}) => {
  return (
    <div className={`status-display space-y-3 sm:space-y-4 ${className}`}>
      {/* 合成状態インジケーター */}
      <SynthesisStateIndicator state={synthesisState} />

      {/* 進行状況バー */}
      <ProgressBar progress={progress} />

      {/* エラー表示 */}
      <ErrorDisplay error={error} onRetry={onRetry} onReset={onReset} />
    </div>
  );
};

// ===== Export RUNTIME =====
export const RUNTIME = 'client' as const;