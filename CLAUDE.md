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
fcis-smac-app:アプリ(開発中アプリ)
tsd-107-spec:仕様書等

## triger word

### モード管理システム（FCIS+SMAC準拠）

#### investigate mode（調査モード）
trigger: "investigate" / "調査"
action: '.modes/investigator.md'の内容に従って調査実行
- エラー分析、影響範囲調査、実装方針提案
- Core/State/Shell層の問題特定

#### worker mode（実装モード）
trigger: "worker" / "実装"
action: '.modes/worker.md'の内容に従って実装
- 忠実な実装、エラー修正、リファクタリング
- FCIS+SMACアーキテクチャ準拠

#### validator mode（検証モード）
trigger: "validate" / "検証"
action: '.modes/validator.md'の内容に従って品質検証
- ビルド確認、テスト実行、品質評価
- 層間の整合性確認

### FCIS+SMAC並列化プロトコル

#### parallel plan（並列計画・ハイブリッド方式）
trigger: "parallel plan: [タスク]" / "並列計画: [タスク]"
action: '.modes/parallel-plan-template.md'に従い、調査統合型の並列実行計画を生成

**実行フロー（セッション1で実行）**:
1. **自動調査フェーズ**（investigator統合）
   - エラー原因の根本分析
   - FCIS+SMAC層別の影響範囲特定
   - 既存コードの依存関係把握

2. **全体設計フェーズ**
   - アーキテクチャレベルの設計決定
   - 層間のインターフェース・契約定義
   - 共通型定義とタスク間依存関係の明確化

3. **タスク分割と指示書生成**
   - 垂直分割優先（機能単位で独立タスク化）
   - 各セッション用の独立指示書を生成：
     - `./parallel-sessions/session-a.md`
     - `./parallel-sessions/session-b.md`
     - `./parallel-sessions/session-c.md`

4. **出力形式**
   - 各Claude Codeセッション用の完結した指示文
   - コピペ可能な形式で明確に区切って表示

**並列セッション（A,B,C）での実行**:
- 各セッションは受け取った指示書に基づき自律的に：
  1. 詳細実装計画（契約内での最適解探索）
  2. FCIS+SMAC準拠の実装
  3. 検証（validator相当の品質確認）

### PM mode（非推奨）
trigger: "PM mode"
action: 非推奨 - 代わりに「parallel plan」を使用してください
- '.agent-docs/pm-task-manager.md'は履歴として保持

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