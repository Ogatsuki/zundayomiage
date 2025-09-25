# タスク詳細
- PVBP準拠の新規アプリケーションディレクトリ構築と基盤設定

## 対象ブロック
- pvbp-app/blocks/shared/lifecycle-patterns.ts（新規作成）
- pvbp-app/（ディレクトリ構造全体）
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 実装内容
1. pvbp-appディレクトリ作成
2. Next.js環境セットアップ（package.json, tsconfig.json等）
3. lifecycle-patterns.ts作成（PVBP標準パターン実装）
   - useEffectOnce
   - useClientOnly
   - useAbortSafe
   - useMountedRef
   - useHydrated
4. PVBP準拠のディレクトリ構造
   - blocks/shared/
   - contracts/
   - app/

## 制約
- ブロック内完結
- lifecycle-patterns.tsは100行以内
- TypeScript strict mode必須

## 評価基準
- 自己完結性: パターンが独立して動作
- 指示適合性: PVBP仕様書準拠
- 品質基準: TypeScript型安全性100%
- MVP適性: 最小限の基盤機能

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