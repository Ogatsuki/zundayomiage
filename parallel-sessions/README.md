# Parallel Sessions Directory

このディレクトリは、`parallel plan`モードで生成される並列実行指示ファイルを格納します。

## ファイル構成

- `instructions.md` - 全セッション用の統一指示ファイル（自動生成）
- `README.md` - このファイル

## 使用方法

1. メインセッションで`parallel plan: [タスク内容]`を実行
2. `instructions.md`が自動生成される
3. ファイルの各セクションを新しいClaude Codeセッションにコピペして実行

## 注意事項

- `instructions.md`は自動生成されるため、手動編集は推奨されません
- 各セッションは独立して実行可能な内容になっています
- FCIS+SMACアーキテクチャに準拠した内容が生成されます