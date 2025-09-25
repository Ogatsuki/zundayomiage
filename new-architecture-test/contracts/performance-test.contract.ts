// ========== 垂直統合パフォーマンス測定用契約 ==========
// PM設計時刻: 2025-09-25 17:20

// ===== 基本型定義 =====
export type ConnectionState = 'checking' | 'connected' | 'disconnected' | 'error';
export type SystemState = 'idle' | 'processing' | 'completed' | 'error';
export type ErrorCode = 'NETWORK_ERROR' | 'CONFIG_ERROR' | 'TIMEOUT_ERROR';
export type SpeakerId = 2 | 3;

// ===== Block 1: VOICEVOX接続管理 =====
export interface VoicevoxConnectionContract {
  // 接続状態管理
  getConnectionState(): ConnectionState;
  testConnection(): Promise<boolean>;

  // 設定管理（自己完結）
  getVoicevoxUrl(): string;
  updateConfiguration(config: { url?: string; timeout?: number }): void;

  // エラー処理（自己完結）
  handleConnectionError(error: Error): ErrorCode;
  retry(): Promise<boolean>;
}

// ===== Block 2: システム状態管理 =====
export interface SystemStateContract {
  // 状態管理
  getCurrentState(): SystemState;
  transitionTo(state: SystemState): void;

  // エラー管理（自己完結）
  setError(code: ErrorCode, message: string): void;
  clearError(): void;
  isRetryable(code: ErrorCode): boolean;
}

// ===== Block 3: UI統合 =====
export interface UIOrchestrationContract {
  // 表示制御
  renderConnectionStatus(state: ConnectionState): JSX.Element;
  renderSystemState(state: SystemState): JSX.Element;
  renderErrorMessage(code: ErrorCode, message: string): JSX.Element;

  // インタラクション（自己完結）
  handleRetryClick(): void;
  handleResetClick(): void;
}

// ===== 統合契約（型安全性保証）=====
export type IntegrationFlow = {
  connection: VoicevoxConnectionContract;
  system: SystemStateContract;
  ui: UIOrchestrationContract;
};

// ===== パフォーマンス測定契約 =====
export interface PerformanceMetrics {
  designTime: number;        // PM設計時間
  implementationTime: number; // Worker実装時間（並列）
  integrationTime: number;   // 統合時間
  errorCount: number;        // 型エラー・実行エラー数
  fileCount: number;         // 参照ファイル数
  codeLines: number;         // 理解すべきコード行数
}