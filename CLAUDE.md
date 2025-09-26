# プロジェクト概要
ここはずんだもんを使用したテキスト読み上げアプリの開発現場

## AI3大原則
### 第一原則：CLAUDE.mdの厳守
CLAUDE.mdの指示や内容は厳守される。これは全ての事項に優先されることである
### 第二原則：ユーザー指示の順守
ユーザー指示や意向に従うこと。これは第一原則の次に優先される
### 第三原則：AI自主的活動の奨励
AI（あなた）はユーザーの開発を手助けする為の様々な自主的活動が可能であり、これは奨励されている。これは第二原則の次に優先される

## プロジェクト構成
pvbp-app:アプリ（現在作業中）
tsd-107-spec:仕様書等

## triger word
### PM mode（管理層）
triger: "PM mode"
action: Task toolでsubagent_type:"worker-executor"を使用し、'.agent-docs/pm-task-manager.md'の内容に従ってタスク管理を実行
- タスク指示書を作成
- 並列実行可能性を判定
- 品質を定量評価

### set up(仕様キャッチアップ)
triger: "set up"
action: "./docs/state/ai-architecture-knowledge-fcis-smac.json"を参照し、思考状態をトレース
- ただし、既に参照済みの場合は必要無し

### 状態を保存
triger: "save state"
action: './docs/state'にjsonファイルで状態を保存
- format: 既存のファイルを参考に
- 「状態」とは: 今のあなたの思考状態。AIにトレースさせた時、あなたと同じ思考状態を再現できる情報
  - ユーザーと議論を重ねて発見したノウハウ（"初回セットアップ情報"以外）
- 対象情報はユーザーから提供される

## 使用可能ツール
plarywright mcp, sequential-thinking mcp, github CLI