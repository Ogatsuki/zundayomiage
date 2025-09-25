# タスク詳細
- ui-orchestrator.vertical.tsxをPVBP準拠のui-orchestrator.universal.vertical.tsxに移行

## 対象ブロック
- pvbp-app/blocks/ui-orchestrator.universal.vertical.tsx（新規作成）
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 実装内容
1. RUNTIME宣言追加: `export const RUNTIME = 'universal' as const;`
2. 環境適応実装
   - SSR/CSR両対応のレンダリング
   - 条件付き機能有効化
   - useHydratedでハイドレーション検出
3. UIコンポーネント統合
   - テキスト入力
   - 音声再生
   - 状態表示
4. 環境依存処理の分離
   - クライアント専用機能の遅延ロード
   - サーバーサイドフォールバック

## 制約
- ブロック内完結
- 200-800行
- SSR/CSR両対応必須
- ハイドレーションミスマッチ防止

## 評価基準
- 自己完結性: UI要素の独立性
- 指示適合性: universal runtime正確実装
- 品質基準: ハイドレーションエラー0
- MVP適性: 基本UI機能動作

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