// ========== VOICEVOX接続管理垂直統合ブロック ==========
// 実装時刻: 2025-09-25 18:00
// 契約準拠: VoicevoxConnectionContract

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ===== 契約型定義の再利用 =====
export type ConnectionState = 'checking' | 'connected' | 'disconnected' | 'error';
export type ErrorCode = 'NETWORK_ERROR' | 'CONFIG_ERROR' | 'TIMEOUT_ERROR';

// ===== 内部型定義（完全自己完結） =====
interface VoicevoxConfig {
  url: string;
  timeout: number;
}

interface ConnectionError {
  code: ErrorCode;
  message: string;
  timestamp: number;
}

interface RetryState {
  count: number;
  maxRetries: number;
  backoffMs: number;
}

// ===== デフォルト設定 =====
const DEFAULT_CONFIG: VoicevoxConfig = {
  url: 'http://localhost:50021',
  timeout: 5000,
};

const DEFAULT_RETRY_STATE: RetryState = {
  count: 0,
  maxRetries: 3,
  backoffMs: 1000,
};

// ===== エラー分類ロジック（自己完結） =====
const classifyError = (error: Error): ErrorCode => {
  const message = error.message.toLowerCase();

  if (message.includes('timeout') || message.includes('aborted')) {
    return 'TIMEOUT_ERROR';
  }

  if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
    return 'NETWORK_ERROR';
  }

  return 'CONFIG_ERROR';
};

// ===== 接続テストロジック（自己完結） =====
const testVoicevoxConnection = async (url: string, timeout: number): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${url}/version`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    return false;
  }
};

// ===== React Hooks実装（契約インターフェース） =====
export const useVoicevoxConnection = () => {
  // 状態管理
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [config, setConfig] = useState<VoicevoxConfig>(DEFAULT_CONFIG);
  const [lastError, setLastError] = useState<ConnectionError | null>(null);
  const [retryState, setRetryState] = useState<RetryState>(DEFAULT_RETRY_STATE);

  // Refs for cleanup and persistence
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===== 契約メソッド: getConnectionState =====
  const getConnectionState = useCallback((): ConnectionState => {
    return connectionState;
  }, [connectionState]);

  // ===== 契約メソッド: getVoicevoxUrl =====
  const getVoicevoxUrl = useCallback((): string => {
    return config.url;
  }, [config.url]);

  // ===== 契約メソッド: updateConfiguration =====
  const updateConfiguration = useCallback((newConfig: { url?: string; timeout?: number }): void => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
    }));

    // 設定変更時は接続状態をリセット
    setConnectionState('disconnected');
    setLastError(null);
    setRetryState(DEFAULT_RETRY_STATE);
  }, []);

  // ===== 契約メソッド: handleConnectionError =====
  const handleConnectionError = useCallback((error: Error): ErrorCode => {
    const errorCode = classifyError(error);
    const connectionError: ConnectionError = {
      code: errorCode,
      message: error.message,
      timestamp: Date.now(),
    };

    setLastError(connectionError);
    setConnectionState('error');

    return errorCode;
  }, []);

  // ===== 契約メソッド: testConnection =====
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (connectionState === 'checking') {
      return false; // 既にテスト中
    }

    setConnectionState('checking');
    setLastError(null);

    try {
      // 前回のAbortControllerをクリーンアップ
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const isConnected = await testVoicevoxConnection(config.url, config.timeout);

      if (isConnected) {
        setConnectionState('connected');
        setRetryState(DEFAULT_RETRY_STATE); // 成功時はリトライ状態をリセット
        return true;
      } else {
        const error = new Error('Connection test failed');
        handleConnectionError(error);
        return false;
      }
    } catch (error) {
      handleConnectionError(error as Error);
      return false;
    }
  }, [connectionState, config.url, config.timeout, handleConnectionError]);

  // ===== 契約メソッド: retry =====
  const retry = useCallback(async (): Promise<boolean> => {
    if (retryState.count >= retryState.maxRetries) {
      return false; // リトライ上限に達している
    }

    // バックオフ遅延
    const delay = retryState.backoffMs * Math.pow(2, retryState.count);

    return new Promise((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        setRetryState(prev => ({
          ...prev,
          count: prev.count + 1,
        }));

        const result = await testConnection();
        resolve(result);
      }, delay);
    });
  }, [retryState, testConnection]);

  // ===== 自動接続テスト（初期化時） =====
  useEffect(() => {
    const initialConnectionTest = async () => {
      await testConnection();
    };

    initialConnectionTest();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ===== 設定変更時の自動再テスト =====
  useEffect(() => {
    if (connectionState !== 'checking') {
      testConnection();
    }
  }, [config.url, config.timeout]);

  // ===== 契約準拠インターフェース返却 =====
  return {
    // 契約メソッド
    getConnectionState,
    testConnection,
    getVoicevoxUrl,
    updateConfiguration,
    handleConnectionError,
    retry,

    // 状態アクセス（React用）
    connectionState,
    lastError,
    retryState,
    config,
  };
};

// ===== UI コンポーネント（自己完結表示） =====
interface VoicevoxConnectionPanelProps {
  className?: string;
}

export const VoicevoxConnectionPanel: React.FC<VoicevoxConnectionPanelProps> = ({
  className = '',
}) => {
  const {
    connectionState,
    lastError,
    retryState,
    config,
    getVoicevoxUrl,
    updateConfiguration,
    testConnection,
    retry,
  } = useVoicevoxConnection();

  // URL更新ハンドラー
  const handleUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    updateConfiguration({ url: newUrl });
  }, [updateConfiguration]);

  // タイムアウト更新ハンドラー
  const handleTimeoutChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeout = parseInt(event.target.value, 10);
    if (!isNaN(newTimeout) && newTimeout > 0) {
      updateConfiguration({ timeout: newTimeout });
    }
  }, [updateConfiguration]);

  // 手動テストハンドラー
  const handleTestClick = useCallback(() => {
    testConnection();
  }, [testConnection]);

  // リトライハンドラー
  const handleRetryClick = useCallback(() => {
    retry();
  }, [retry]);

  // 接続状態表示
  const renderConnectionStatus = () => {
    const statusConfig = {
      checking: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '接続確認中...' },
      connected: { color: 'text-green-600', bg: 'bg-green-100', text: '接続済み' },
      disconnected: { color: 'text-gray-600', bg: 'bg-gray-100', text: '未接続' },
      error: { color: 'text-red-600', bg: 'bg-red-100', text: '接続エラー' },
    };

    const status = statusConfig[connectionState];

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${status.bg} ${status.color}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          connectionState === 'checking' ? 'bg-yellow-400 animate-pulse' :
          connectionState === 'connected' ? 'bg-green-400' :
          connectionState === 'disconnected' ? 'bg-gray-400' :
          'bg-red-400'
        }`} />
        {status.text}
      </div>
    );
  };

  // エラー表示
  const renderErrorMessage = () => {
    if (!lastError) return null;

    const errorMessages = {
      NETWORK_ERROR: 'ネットワークエラーが発生しました',
      CONFIG_ERROR: '設定に問題があります',
      TIMEOUT_ERROR: '接続がタイムアウトしました',
    };

    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <div className="text-red-400 mr-2">⚠</div>
          <div>
            <div className="text-sm font-medium text-red-800">
              {errorMessages[lastError.code]}
            </div>
            <div className="text-xs text-red-600 mt-1">
              {lastError.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 border border-gray-200 rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">VOICEVOX接続設定</h3>
        {renderConnectionStatus()}
      </div>

      {/* URL設定 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          VOICEVOX URL
        </label>
        <input
          type="text"
          value={config.url}
          onChange={handleUrlChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="http://localhost:50021"
        />
      </div>

      {/* タイムアウト設定 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          タイムアウト (ms)
        </label>
        <input
          type="number"
          value={config.timeout}
          onChange={handleTimeoutChange}
          min="1000"
          max="30000"
          step="1000"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleTestClick}
          disabled={connectionState === 'checking'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connectionState === 'checking' ? '確認中...' : '接続テスト'}
        </button>

        {connectionState === 'error' && retryState.count < retryState.maxRetries && (
          <button
            onClick={handleRetryClick}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            リトライ ({retryState.count}/{retryState.maxRetries})
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {renderErrorMessage()}

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-xs text-gray-600">
            <div>Current URL: {getVoicevoxUrl()}</div>
            <div>Timeout: {config.timeout}ms</div>
            <div>Retry Count: {retryState.count}/{retryState.maxRetries}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== デフォルトエクスポート =====
export default VoicevoxConnectionPanel;