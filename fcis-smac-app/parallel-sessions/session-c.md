# セッションC用指示書 - UIコンポーネント統合とエラーハンドリング

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 13, React 18, TypeScript, Tailwind CSS
- **開発環境**: Windows, Node.js

### 問題背景（セッション1の調査結果）
- **現象**: UIコンポーネント間の連携不全、エラー表示の不在
- **根本原因**: UIInputComponentとStatusDisplayの状態同期問題、エラーハンドリング未実装
- **影響範囲**: ユーザー体験の低下、エラー時のフィードバック不足
- **解決目標**: UIコンポーネントの統合強化、包括的エラーハンドリング実装

## 2. 全体設計（セッション1決定事項）

### アーキテクチャ決定
- UIコンポーネント間の状態を明確に定義
- エラー情報の統一的な表示
- アクセシビリティの向上（ARIA属性追加）
- レスポンシブデザインの改善

### 共通契約仕様
```typescript
// UIコンポーネント間の状態契約
interface UIState {
  isInputValid: boolean;       // 入力検証状態
  canStartSynthesis: boolean;  // 合成開始可能か
  isProcessing: boolean;        // 処理中フラグ
  showError: boolean;           // エラー表示フラグ
  errorDetails: ErrorInfo | null; // エラー詳細
  progress: SynthesisProgress;  // 進捗情報
}

// エラー表示契約
interface ErrorDisplay {
  severity: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}
```

### タスク間依存関係
- 依存元: セッションB（状態管理）から状態を受け取る
- 依存先: なし（最終統合レイヤー）

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（UIコンポーネント）
- **機能**: UIコンポーネント統合、エラーハンドリング、UX改善
- **スコープ**: UIInputComponent、StatusDisplayの修正

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/shell/ui-input.shell.client.vertical.tsx` - UI入力コンポーネント修正
- `/app/fcis-smac-app/shell/status-display.shell.client.vertical.tsx` - ステータス表示修正

### 入出力契約
**UIInputComponent入力**:
```typescript
interface UIInputComponentProps {
  onSynthesize: (text: string, speakerId: number) => void;
  onStop: () => void;
  onReset: () => void;
  disabled: boolean;
  isProcessing: boolean;
  className?: string;
}
```

**StatusDisplay入力**:
```typescript
interface StatusDisplayProps {
  synthesisState: 'idle' | 'connecting' | 'synthesizing' | 'completed' | 'error';
  progress: SynthesisProgress | null;
  error: ErrorInfo | null;
  onRetry: () => void;
  onReset: () => void;
  className?: string;
}
```

### 制約事項
- React 18 StrictMode対応必須
- Tailwind CSSクラスのみ使用（インラインスタイル最小限）
- アクセシビリティ基準準拠（WCAG 2.1 AA）
- モバイルファーストデザイン

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Shell層実装の場合
- [x] 薄いIO層として実装（UIレンダリングのみ）
- [x] ビジネスロジック禁止（表示ロジックのみ）
- [x] React Hooks適切使用
- [x] 副作用の適切な管理（イベントハンドラー）
- [x] 契約の明確な提供（Props型定義）

## 5. 実行ステップ

### ステップ1: UIInputComponent改善（20分）
```
□ テキスト入力検証ロジック追加
□ 開始ボタンの有効/無効制御改善
□ キーボードショートカット実装（Ctrl+Enter）
□ ARIA属性追加
□ エラー時のフォーカス管理
```

### ステップ2: StatusDisplay強化（20分）
```
□ エラー表示UI実装
□ 進捗表示の改善
□ タイムアウト検知と表示
□ リトライボタンの条件付き表示
□ アニメーション追加
```

### ステップ3: 統合とエラーハンドリング（15分）
```
□ エラー種別ごとの表示分岐
□ ユーザーフレンドリーなメッセージ
□ アクション可能なエラー対応
□ ログ記録の実装
```

### ステップ4: 検証（10分）
```bash
# 型チェック
cd /app/fcis-smac-app
npm run typecheck

# ビルド確認
npm run build

# 開発サーバーで動作確認
npm run dev

# 確認項目
# 1. テキスト入力時の検証動作
# 2. エラー表示の確認（APIエラー、タイムアウト）
# 3. キーボード操作の確認
# 4. モバイル表示の確認
```

## 6. 完了基準

### 必須項目
- [ ] テキスト入力検証が動作（空文字、文字数制限）
- [ ] エラー時に適切なメッセージ表示
- [ ] リトライ機能が動作
- [ ] キーボードショートカット動作
- [ ] TypeScript型エラーゼロ

### 品質項目
- [ ] ARIA属性が適切に設定
- [ ] タブナビゲーションが自然
- [ ] モバイルレスポンシブ対応
- [ ] アニメーションが滑らか
- [ ] エラーログが記録される

## 7. トラブルシューティングガイド

### よくある問題と解決策

**フォーカス管理の問題**
- 問題: エラー時にフォーカスが失われる
- 解決: useRefでフォーカス要素を管理、エラー時にfocus()呼び出し

**エラー表示が消えない**
- 問題: エラー状態のクリアタイミング
- 解決: リセット時、新規入力時にエラーをクリア

**アニメーションのちらつき**
- 問題: React再レンダリング時のCSS transition
- 解決: key propの適切な設定、CSS will-change使用

## 8. 実装例

### UIInputComponentの改善例
```tsx
// エラー表示付き入力フィールド
const [inputError, setInputError] = useState<string | null>(null);

const validateInput = (text: string): boolean => {
  if (!text.trim()) {
    setInputError('テキストを入力してください');
    return false;
  }
  if (text.length > 1000) {
    setInputError('テキストは1000文字以内で入力してください');
    return false;
  }
  setInputError(null);
  return true;
};

// ARIA属性付きボタン
<button
  onClick={handleStart}
  disabled={disabled || isProcessing || !isValid}
  aria-label="音声合成を開始"
  aria-busy={isProcessing}
  className={cn(
    'px-4 py-2 rounded transition-all',
    isProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700',
    'focus:outline-none focus:ring-2 focus:ring-green-500'
  )}
>
  {isProcessing ? '処理中...' : '開始'}
</button>
```

### StatusDisplayのエラー表示例
```tsx
// エラー種別に応じた表示
const getErrorDisplay = (error: ErrorInfo): ErrorDisplay => {
  if (error.code === 'TIMEOUT') {
    return {
      severity: 'warning',
      title: 'タイムアウト',
      message: '処理に時間がかかっています。しばらくお待ちください。',
      actions: [
        { label: '再試行', handler: onRetry },
        { label: 'キャンセル', handler: onReset }
      ]
    };
  }
  // その他のエラー処理
};

// アニメーション付き進捗バー
<div className="relative">
  <div className="overflow-hidden h-2 text-xs flex rounded bg-green-200">
    <div
      style={{ width: `${progress.percentage}%` }}
      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500 ease-out"
    />
  </div>
  {progress.isLongText && (
    <div className="mt-1 text-xs text-gray-600">
      処理中: {progress.processedChunks}/{progress.totalChunks} チャンク
    </div>
  )}
</div>
```

## 9. 参考資料
- React Accessibility: https://react.dev/learn/accessibility
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Tailwind CSS: https://tailwindcss.com/docs
- FCIS+SMAC仕様: `/app/docs/state/ai-architecture-knowledge-fcis-smac.json`

---
**実装開始**: 上記指示に従って実装を開始してください。
**完了後**: UIコンポーネントが統合され、エラーハンドリングが完全に動作することを確認してください。