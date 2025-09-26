# タスク詳細
- VOICEVOX Docker環境の自動起動機能とエラーハンドリングの改善

## 問題の背景
- VOICEVOXサーバー（Dockerコンテナ）が停止していることが原因でアプリが音声生成エラーを発生
- 現在の実装は接続失敗時の適切なリトライやユーザー通知が不十分

## 実装要件
1. **package.jsonへのスクリプト追加**
   - `dev:voicevox` - VOICEVOXコンテナとNext.jsを同時起動
   - `voicevox:start` - VOICEVOXコンテナのみ起動
   - `voicevox:stop` - VOICEVOXコンテナ停止

2. **voicevox-api.client.vertical.tsxの改修**
   - 接続エラー時の自動リトライ機能（3回まで、間隔1秒）
   - より詳細なエラーメッセージ
   - 環境変数NEXT_PUBLIC_VOICEVOX_API_URLの利用（ハードコード削除）

3. **起動チェックの改善**
   - アプリ起動時のVOICEVOXサーバー状態確認
   - 未起動時の分かりやすいユーザー通知

## 対象ブロック
- blocks/voicevox-api.client.vertical.tsx
- package.json
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 制約
- ブロック内完結
- 200-800行
- 既存のPVBPアーキテクチャ準拠
- クライアントサイド実行のパターン遵守

## 評価基準
- 自己完結性: ブロック内で完結しているか
- 指示適合性: 要件を満たしているか
- 品質基準: TypeScript型安全性、エラーハンドリング
- MVP適性: 必要十分な機能実装

## Worker記述欄
- [実装報告・自己評価]

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）