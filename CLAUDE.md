# プロジェクト概要
ここはずんだもんを使用したテキスト読み上げアプリの開発現場

## AI3大原則
### 第一原則：CLAUDE.mdの厳守
CLAUDE.mdの指示や内容は厳守される。これは全ての事項に優先されることである
### 第二原則：ユーザー指示の順守
第一原則に反しない限り、ユーザー指示や意向に従うこと
### 第三原則：AI自主的活動の奨励
第一、第二原則に反しない限り、AI（あなた）はユーザーの開発を手助けする為の様々な自主的活動が可能であり、これは奨励されている

## プロジェクト構成
tsd-107-zundamon-voicevox:アプリ（アーカイブ）
new-architecture-test:アプリ（現在作業中）
tsd-107-spec:仕様書等

## 初回情報セットトップ - 作業前前提情報の取得
"./docs/save-ai-state/ai-architecture-knowledge-base.json"を参照。ただし既に参照済みの場合は必要無し


## コールサイン
### Architect mode（設計層）
"Architect mode"または"設計モード"：'.agent-docs/vertical-architect.md'を参照
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