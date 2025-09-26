'use client';

/**
 * FCIS+SMAC Shell層実装
 * Status Display Component - 接続状態、進行状況、エラー表示
 *
 * 責務:
 * - 純粋表示コンポーネント（副作用なし）
 * - 接続状態インジケーター表示
 * - 音声合成進行状況バー表示
 * - エラー状態とリトライボタン表示
 * - 合成状態表示（アイドル、合成中、再生中等）
 * - Tailwind CSS緑系統デザイン
 */

import React from 'react';

// ===== Contract Definition =====
export interface StatusDisplayContract {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  synthesisState: 'idle' | 'synthesizing' | 'playing' | 'completed' | 'error';
  progress: {
    percentage: number;
    processedChunks: number;
    totalChunks: number;
  } | null;
  error: {
    code: string;
    message: string;
    isRetryable: boolean;
  } | null;
  onRetry?: () => void;
}

// ===== Component Implementation =====

/**
 * 接続状態インジケーター
 */
interface ConnectionIndicatorProps {
  status: StatusDisplayContract['connectionStatus'];
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'disconnected':
        return {
          color: 'bg-gray-400',
          text: '未接続',
          textColor: 'text-gray-600',
          animate: false
        };
      case 'connecting':
        return {
          color: 'bg-yellow-400',
          text: '接続中',
          textColor: 'text-yellow-700',
          animate: true
        };
      case 'connected':
        return {
          color: 'bg-green-500',
          text: '接続済み',
          textColor: 'text-green-700',
          animate: false
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: '接続エラー',
          textColor: 'text-red-700',
          animate: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
      <div
        className={`w-3 h-3 rounded-full ${config.color} ${
          config.animate ? 'animate-pulse' : ''
        }`}
      />
      <span className={`text-xs sm:text-sm font-medium ${config.textColor}`}>
        VOICEVOXサーバー: {config.text}
      </span>
    </div>
  );
};

/**
 * 進行状況バー
 */
interface ProgressBarProps {
  progress: StatusDisplayContract['progress'];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  if (!progress) return null;

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
      <div className="w-full bg-green-200 rounded-full h-2 sm:h-3">
        <div
          className="bg-green-600 h-2 sm:h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.round(progress.percentage)}%` }}
        />
      </div>

      {/* チャンク情報 */}
      {progress.totalChunks > 1 && (
        <div className="text-xs text-green-600 text-center font-medium">
          {progress.processedChunks}/{progress.totalChunks} チャンク処理済み
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
      case 'playing':
        return {
          color: 'bg-green-600',
          text: '再生中',
          textColor: 'text-green-800',
          icon: '🔊',
          animate: true
        };
      case 'completed':
        return {
          color: 'bg-green-700',
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
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border ${
        error.isRetryable
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0">
          <span className="text-lg sm:text-xl">
            {error.isRetryable ? '⚠️' : '❌'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className={`font-medium text-xs sm:text-sm mb-1 ${
            error.isRetryable ? 'text-yellow-800' : 'text-red-800'
          }`}>
            エラーコード: {error.code}
          </div>
          <div className={`text-xs sm:text-sm ${
            error.isRetryable ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {error.message}
          </div>
        </div>

        {/* リトライボタン */}
        {error.isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 px-2 sm:px-3 py-1 sm:py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors min-w-[60px] sm:min-w-[80px]"
          >
            再試行
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
  connectionStatus,
  synthesisState,
  progress,
  error,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`status-display space-y-3 sm:space-y-4 ${className}`}>
      {/* 接続状態インジケーター */}
      <ConnectionIndicator status={connectionStatus} />

      {/* 合成状態インジケーター */}
      <SynthesisStateIndicator state={synthesisState} />

      {/* 進行状況バー */}
      <ProgressBar progress={progress} />

      {/* エラー表示 */}
      <ErrorDisplay error={error} onRetry={onRetry} />
    </div>
  );
};

// ===== Export RUNTIME =====
export const RUNTIME = 'client' as const;