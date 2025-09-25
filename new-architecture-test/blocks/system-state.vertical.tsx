// ========== システム状態管理垂直統合ブロック ==========
// 実装時刻: 2025-09-25
// 契約準拠: SystemStateContract

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SystemStateContract, SystemState, ErrorCode } from '../contracts/performance-test.contract';

// ===== 内部状態型定義 =====
interface SystemStateData {
  currentState: SystemState;
  errorInfo: {
    code: ErrorCode | null;
    message: string | null;
  };
  lastTransition: Date | null;
}

// ===== Context型定義 =====
interface SystemStateContextType extends SystemStateContract {
  // 追加のContext専用メソッド
  getErrorInfo(): { code: ErrorCode | null; message: string | null };
  getLastTransition(): Date | null;
  hasError(): boolean;
}

// ===== Context作成 =====
const SystemStateContext = createContext<SystemStateContextType | null>(null);

// ===== Provider Props型 =====
interface SystemStateProviderProps {
  children: ReactNode;
  initialState?: SystemState;
}

// ===== 状態遷移バリデーション =====
const validateTransition = (from: SystemState, to: SystemState): boolean => {
  // 許可された状態遷移パターン
  const allowedTransitions: Record<SystemState, SystemState[]> = {
    idle: ['processing'],
    processing: ['completed', 'error'],
    completed: ['idle', 'processing'],
    error: ['idle', 'processing']
  };

  return allowedTransitions[from].includes(to);
};

// ===== リトライ可能性判定ロジック =====
const determineRetryability = (code: ErrorCode): boolean => {
  switch (code) {
    case 'NETWORK_ERROR':
      return true; // ネットワークエラーは一時的
    case 'TIMEOUT_ERROR':
      return true; // タイムアウトエラーは一時的
    case 'CONFIG_ERROR':
      return false; // 設定エラーは永続的
    default:
      return false;
  }
};

// ===== SystemStateProvider実装 =====
export const SystemStateProvider: React.FC<SystemStateProviderProps> = ({
  children,
  initialState = 'idle'
}) => {
  // ===== 内部状態管理 =====
  const [stateData, setStateData] = useState<SystemStateData>({
    currentState: initialState,
    errorInfo: {
      code: null,
      message: null
    },
    lastTransition: new Date()
  });

  // ===== SystemStateContract実装 =====

  // 現在の状態を取得
  const getCurrentState = useCallback((): SystemState => {
    return stateData.currentState;
  }, [stateData.currentState]);

  // 状態遷移実行
  const transitionTo = useCallback((newState: SystemState): void => {
    const currentState = stateData.currentState;

    // 状態遷移バリデーション
    if (!validateTransition(currentState, newState)) {
      console.warn(`Invalid state transition: ${currentState} -> ${newState}`);
      return;
    }

    // 状態更新
    setStateData(prev => ({
      ...prev,
      currentState: newState,
      lastTransition: new Date(),
      // エラー状態から抜ける場合はエラー情報をクリア
      errorInfo: newState === 'idle' ? { code: null, message: null } : prev.errorInfo
    }));

    console.log(`State transition: ${currentState} -> ${newState}`);
  }, [stateData.currentState]);

  // エラー設定
  const setError = useCallback((code: ErrorCode, message: string): void => {
    setStateData(prev => ({
      ...prev,
      currentState: 'error',
      errorInfo: {
        code,
        message
      },
      lastTransition: new Date()
    }));

    console.error(`System error set: [${code}] ${message}`);
  }, []);

  // エラークリア
  const clearError = useCallback((): void => {
    setStateData(prev => ({
      ...prev,
      errorInfo: {
        code: null,
        message: null
      }
    }));

    console.log('System error cleared');
  }, []);

  // リトライ可能性判定
  const isRetryable = useCallback((code: ErrorCode): boolean => {
    return determineRetryability(code);
  }, []);

  // ===== Context専用追加メソッド =====

  // エラー情報取得
  const getErrorInfo = useCallback(() => {
    return { ...stateData.errorInfo };
  }, [stateData.errorInfo]);

  // 最後の遷移時刻取得
  const getLastTransition = useCallback((): Date | null => {
    return stateData.lastTransition;
  }, [stateData.lastTransition]);

  // エラー状態判定
  const hasError = useCallback((): boolean => {
    return stateData.currentState === 'error' && stateData.errorInfo.code !== null;
  }, [stateData.currentState, stateData.errorInfo.code]);

  // ===== Context値構築 =====
  const contextValue: SystemStateContextType = {
    // SystemStateContract準拠メソッド
    getCurrentState,
    transitionTo,
    setError,
    clearError,
    isRetryable,
    // 追加メソッド
    getErrorInfo,
    getLastTransition,
    hasError
  };

  return (
    <SystemStateContext.Provider value={contextValue}>
      {children}
    </SystemStateContext.Provider>
  );
};

// ===== カスタムフック =====
export const useSystemState = (): SystemStateContextType => {
  const context = useContext(SystemStateContext);

  if (!context) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }

  return context;
};

// ===== 便利なヘルパーフック =====
export const useSystemStateValue = (): SystemState => {
  const { getCurrentState } = useSystemState();
  return getCurrentState();
};

export const useErrorState = (): {
  hasError: boolean;
  errorInfo: { code: ErrorCode | null; message: string | null };
  isCurrentErrorRetryable: boolean;
} => {
  const { hasError, getErrorInfo, isRetryable } = useSystemState();
  const errorInfo = getErrorInfo();

  return {
    hasError: hasError(),
    errorInfo,
    isCurrentErrorRetryable: errorInfo.code ? isRetryable(errorInfo.code) : false
  };
};

// ===== システム状態表示用コンポーネント =====
export const SystemStateDisplay: React.FC = () => {
  const { getCurrentState, hasError, getErrorInfo } = useSystemState();
  const currentState = getCurrentState();
  const errorInfo = getErrorInfo();

  const getStateDisplayText = (state: SystemState): string => {
    switch (state) {
      case 'idle':
        return '待機中';
      case 'processing':
        return '処理中...';
      case 'completed':
        return '完了';
      case 'error':
        return 'エラー';
      default:
        return '不明';
    }
  };

  const getStateColor = (state: SystemState): string => {
    switch (state) {
      case 'idle':
        return '#6b7280'; // gray
      case 'processing':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStateColor(currentState)
        }}
      />
      <span style={{ fontSize: '14px', color: getStateColor(currentState) }}>
        {getStateDisplayText(currentState)}
      </span>
      {hasError() && errorInfo.code && (
        <span style={{ fontSize: '12px', color: '#ef4444' }}>
          ({errorInfo.code})
        </span>
      )}
    </div>
  );
};

// ===== エクスポート =====
export default {
  SystemStateProvider,
  useSystemState,
  useSystemStateValue,
  useErrorState,
  SystemStateDisplay
};

// ===== 型エクスポート =====
export type {
  SystemStateContract,
  SystemStateContextType
};