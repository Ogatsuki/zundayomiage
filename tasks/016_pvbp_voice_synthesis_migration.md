# タスク詳細
- voice-synthesis.vertical.tsxをPVBP準拠のvoice-synthesis.client.vertical.tsxに移行

## 対象ブロック
- pvbp-app/blocks/voice-synthesis.client.vertical.tsx（新規作成）
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 実装内容
1. RUNTIME宣言追加: `export const RUNTIME = 'client' as const;`
2. ライフサイクルパターン適用
   - useClientOnlyでクライアント環境検出
   - useAbortSafeでAbortController管理
   - useEffectOnceでStrictMode対応
3. NETWORK_ERROR解決実装
   - AbortControllerの永続化
   - unmount時の条件付きabort
   - 適切なクリーンアップタイミング
4. 既存機能の移植
   - テキスト分割処理
   - 並列音声合成
   - エラーハンドリング

## 制約
- ブロック内完結
- 200-800行
- ブラウザAPI依存部分の明示化
- SSR時はnullレンダリング

## 評価基準
- 自己完結性: 外部依存なし
- 指示適合性: PVBP完全準拠
- 品質基準: NETWORK_ERROR解消
- MVP適性: 基本音声合成機能動作

## Worker記述欄
- [実装報告・自己評価]

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 自己完結性: /5
- 指示適合性: /5
- 品質基準: /5
- MVP適性: /5
- 修正指示: