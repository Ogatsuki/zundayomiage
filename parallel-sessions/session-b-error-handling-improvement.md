# セッションB：エラーハンドリングとUX改善

## タスク概要
"Unknown error"のような不明瞭なエラーメッセージを改善し、ユーザーに分かりやすいフィードバックを提供

## アーキテクチャ準拠事項
- **Core層**：エラー分類と診断ロジック
- **State層**：エラー状態の管理とリカバリー戦略
- **Shell層**：ユーザーへのフィードバック表示

## 実装内容

### 1. Core層の拡張
`fcis-smac-app/core/voicevox-errors.core.ts`を作成：
```typescript
export type DetailedError =
  | { type: 'SERVER_NOT_RUNNING'; solution: string; canAutoFix: boolean }
  | { type: 'CONNECTION_TIMEOUT'; retryable: true; suggestedWait: number }
  | { type: 'INVALID_SPEAKER'; availableSpeakers: number[] }
  | { type: 'TEXT_PROCESSING'; details: string };

export const diagnoseError = (error: Error): DetailedError
export const suggestSolution = (error: DetailedError): string[]
export const canAutoRecover = (error: DetailedError): boolean
```

### 2. Shell層のUI改善
`fcis-smac-app/shell/VoicevoxErrorDisplay.tsx`を作成：
- エラーの種類に応じた具体的なメッセージ
- 解決方法の提示（手動/自動）
- ワンクリック修復ボタン
- リトライ機能の実装

### 3. API層のエラーレスポンス改善
`fcis-smac-app/app/api/synthesize/route.ts`の更新：
- より詳細なエラー情報の返却
- エラーコードの体系化
- ログ出力の改善

### 4. エラー通知コンポーネント
```typescript
// Toast通知での分かりやすいフィードバック
- "VOICEVOXサーバーが起動していません。起動しますか？ [はい] [いいえ]"
- "接続タイムアウト。再試行中... (3/3)"
- "話者ID 3 は利用できません。利用可能: [2, 7, 22]"
```

## 検証項目
- [ ] 各エラータイプの再現と表示確認
- [ ] 自動修復機能の動作確認
- [ ] エラーメッセージの分かりやすさ評価
- [ ] リトライロジックの動作確認

## 成果物
- 改善されたエラーハンドリング
- ユーザーフレンドリーなエラー表示
- 自動修復機能の実装