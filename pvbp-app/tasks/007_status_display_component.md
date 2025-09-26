# タスク詳細
- 進行状況、エラー表示、接続状態を表示するステータス表示コンポーネントの実装
- アーキテクチャ: FCIS+SMAC
- 層: Shell

## 対象ファイル
- Shell層: fcis-smac-app/shell/status-display.shell.client.vertical.tsx（新規作成）

## 層別制約
### Shell層
- React統合
- 薄いIOレイヤー
- Contract提供
- 表示専用コンポーネント（副作用なし）

## 実装要件
1. 接続状態表示（接続中/接続済み/切断）
2. 進行状況バー（パーセンテージ、処理チャンク数表示）
3. エラーメッセージ表示（エラーコード、メッセージ、リトライ可否）
4. 現在の状態表示（アイドル/処理中/完了/エラー）
5. 音声再生状態表示
6. 適切なアイコンとカラースキーム（緑系統）

## コントラクト定義
```typescript
export interface StatusDisplayContract {
  isConnected: boolean;
  isProcessing: boolean;
  progress: {
    percentage: number;
    processedChunks: number;
    totalChunks: number;
  };
  error: {
    code: string;
    message: string;
    isRetryable: boolean;
  } | null;
  currentState: 'idle' | 'connecting' | 'connected' | 'synthesizing' | 'playing' | 'error';
}
```

## 評価基準
- 層の責務遵守・純粋性・テスタビリティ・MVP適性

## Worker記述欄
- [実装報告・自己評価]

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）