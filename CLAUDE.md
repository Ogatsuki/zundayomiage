# プロジェクト概要


## プロジェクト構成
tsd-107-zundamon-voicevox:アプリ（アーカイブ）
new-architecture-test:アプリ（現在作業中）
tsd-107-spec:仕様書等

## コールサイン

### Architect mode（設計層）
"Architect mode"または"設計モード"：'.agent-docs/vertical-architect.md'を参照
- モノリシックコードを分析
- 垂直ブロック分割を提案
- 契約設計を作成

### PM mode（管理層）
"PM mode"または"PMモード"：'.agent-docs/pm-task-manager.md'を参照
- タスク指示書を作成
- 並列実行可能性を判定
- 品質を定量評価

### Worker mode（実装層）
Sub Agent起動

### 方針概要を把握して
"方針概要を把握"またはそれに類する依頼があれば、docs/readthis/*.md, docs/save-ai-state/*.jsonを全て参照する。

## 品質チェックコマンド（プロジェクト非依存）
```bash
# .agent-tools/以下のツールを直接使用
node .agent-tools/quality-checker.js --path [project] --block [name]  # 単一ブロック
node .agent-tools/quality-checker.js --path [project]                  # 全体チェック
node .agent-tools/mega-qa.js --path [project]                         # 統合チェック

# package.jsonのscriptに依存しない実装
```

## 使用可能ツール
plarywright mcp, sequential-thinking mcp, github CLI