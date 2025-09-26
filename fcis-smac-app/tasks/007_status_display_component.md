# タスク詳細
- 進行状況、エラー、接続状態を表示するコンポーネントの実装
- アーキテクチャ: FCIS+SMAC
- 層: Shell

## 対象ファイル
- Shell層: fcis-smac-app/shell/status-display.shell.client.vertical.tsx（新規作成）

## 層別制約
### Shell層
- React統合
- 薄いIOレイヤー
- Contract提供
- 表示専用（副作用なし）
- RUNTIME宣言必須

## 実装要件
1. 接続状態インジケーター：
   - 未接続（グレー）
   - 接続中（黄色点滅）
   - 接続済み（緑）
   - エラー（赤）
2. 進行状況バー：
   - パーセンテージ表示
   - 処理チャンク数（例: 3/10チャンク）
3. エラー表示：
   - エラーコード
   - メッセージ
   - リトライボタン（isRetryableの場合）
4. 状態表示：
   - アイドル、音声合成中、再生中など
   - 適切なアイコン使用
5. Tailwind CSSで緑系統のデザイン

## コントラクト
```typescript
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
```

## 評価基準
- 層の責務遵守・純粋性・テスタビリティ・MVP適性

## Worker記述欄
- **実装完了**: `fcis-smac-app/shell/status-display.shell.client.vertical.tsx`を新規作成
- **コントラクト準拠**: `StatusDisplayContract`インターフェースを完全実装
- **機能実装状況**:
  - ✅ 接続状態インジケーター（未接続/接続中/接続済み/エラー、適切な色分けとアニメーション）
  - ✅ 進行状況バー（パーセンテージ表示、チャンク数表示対応）
  - ✅ エラー表示（エラーコード・メッセージ表示、リトライボタン対応）
  - ✅ 合成状態表示（アイドル/合成中/再生中/完了/エラー、アイコンとアニメーション付き）
  - ✅ Tailwind CSS緑系統デザイン（bg-green-50, border-green-200等）
- **アーキテクチャ遵守**:
  - ✅ Shell層制約遵守（純粋表示コンポーネント、副作用なし）
  - ✅ React統合（適切なProps型定義とコンポーネント分割）
  - ✅ Contract提供（StatusDisplayContract完全実装）
  - ✅ RUNTIME宣言（'client'として宣言）
- **設計特徴**:
  - コンポーネント分割による保守性向上（ConnectionIndicator, ProgressBar等）
  - 適切な条件分岐による表示制御
  - アクセシビリティ配慮（focus:ring, hover等）
  - レスポンシブ対応のTailwindクラス使用

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）