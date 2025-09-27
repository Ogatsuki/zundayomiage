# アーキテクチャリファクタリング計画
作成日: 2024-09-27

## 背景と問題点

### 現状の問題
1. **PM + Subagentアーキテクチャの複雑性**
   - PMがinvestigator, worker, validatorの3つのsubagentを管理
   - フロー管理が複雑（5フェーズ構成）
   - 認知負荷が高すぎて原則違反が頻発

2. **実際の失敗パターン**（pm-log.md参照）
   - PMが直接実装（原則違反）
   - Validator完全無視
   - investigator過少利用
   - 並列実行の非効率

3. **根本的な課題**
   - データの受け渡しが複雑
   - 並列起動の管理が困難
   - 実装過程がブラックボックス
   - コンテキスト分離の利点が薄い（1タスク1セッション運用のため）

## 新アーキテクチャ方針

### 1. Subagent完全廃止 → モード管理への移行

**理由**：
- PMレイヤーが不要（複雑性の根本除去）
- 実行過程の透明性確保
- 即座のフィードバック
- コンテキスト連続性の維持

### 2. モード管理実装案

```markdown
# CLAUDE.md追加内容

## investigator mode
trigger: "investigate" / "調査"
action: '.agent-docs/investigator.md'の内容に従って調査実行
- エラー分析、影響範囲調査、実装方針提案

## worker mode
trigger: "implement" / "実装"
action: '.agent-docs/worker-executor.md'の内容に従って実装
- 忠実な実装、エラー修正、リファクタリング

## validator mode
trigger: "validate" / "検証"
action: '.agent-docs/validator.md'の内容に従って品質検証
- ビルド確認、テスト実行、品質評価
```

### 3. 並列実行問題の解決

**問題**：
- 大きなタスクを小分けにすると時間がかかる
- 複数セッション起動すると競合リスク
- 1セッションで大きなタスクは精度低下

**解決策：FCIS+SMAC準拠の並列化プロトコル**

```markdown
## FCIS+SMAC並列化プロトコル
trigger: "parallel plan" / "並列計画"
action: FCIS+SMACアーキテクチャに従った並列実行計画を生成

### 並列化の2軸モデル

1. **垂直機能スライス並列化**（安全）
   - 異なる機能間は完全並列可能
   - 例：voicevox機能 vs status-display機能

2. **水平レイヤー並列化**（制限付き）
   - Core層：純粋関数のため並列可能
   - State/Shell層：順次実行必須（依存関係あり）

### タスク分類フォーマット
[Session N - モデル推奨]
機能: {feature_name}
層: Core | State | Shell | Full-Stack
タスク: {具体的作業}
依存: {前提となるSession番号}

### 実行例
---
[Session 1 - Opus推奨]
機能: voicevox
層: Core
タスク: validateConnection、buildRequestの純粋関数実装
依存: なし

[Session 2 - Opus推奨]
機能: status-display
層: Full-Stack
タスク: 新機能の全層実装
依存: なし（別機能のため）

[Session 3 - Sonnet可]
機能: voicevox
層: State
タスク: 状態遷移の更新
依存: Session1（Core層完了後）

[Session 4 - Sonnet可]
機能: voicevox
層: Shell
タスク: React統合の更新
依存: Session3（State層完了後）
---
```

## 実装手順

### Phase 1: 基本モード実装
1. CLAUDE.mdにinvestigator/worker/validatorモードを追加
2. 各モードのトリガーワード設定
3. 既存のagent-docsファイルを活用

### Phase 2: 並列化プロトコル実装
1. parallel protocolモードを追加
2. タスク分割ロジックの実装
3. セッション間の依存関係明示

### Phase 3: PM関連の削除
1. PM modeトリガーを削除
2. pm-task-manager.mdを非推奨化（履歴として保持）

## 期待される効果

1. **複雑性の削減**
   - フロー管理不要
   - データ受け渡し不要
   - 並列管理の簡素化

2. **精度向上**
   - 実行過程の可視化
   - 人間による適切な介入
   - モデルの使い分け（Opus/Sonnet）

3. **開発速度向上**
   - 並列実行による高速化
   - 競合回避による安定性
   - 直感的な操作

## 使用例

### 単純なタスク
```
ユーザー: investigate: Result型エラーを調査
AI: [investigator modeで動作、過程が見える]

ユーザー: implement: 型アサーションで修正
AI: [worker modeで動作、実装過程が見える]

ユーザー: validate: ビルド確認
AI: [validator modeで動作、検証結果表示]
```

### 複雑なタスク（FCIS+SMAC準拠の並列実行）
```
ユーザー: parallel plan: voicevoxエラー修正とstatus-display新機能追加
AI: [FCIS+SMAC並列実行計画を生成]

出力:
---
[Session 1 - Opus]
機能: voicevox
層: Core
タスク: Result型エラー修正（純粋関数）

[Session 2 - Opus]
機能: status-display
層: Full-Stack
タスク: 新機能の全層実装（独立機能）

[Session 3 - Sonnet]
機能: voicevox
層: State→Shell
タスク: Session1完了後、状態遷移とReact統合更新
依存: Session1
---

ユーザー: [3つのClaude Codeセッション起動、計画に従って実行]
```

## 注意事項

### FCIS+SMAC整合性の維持
- **垂直統合の保護**：機能単位の完全性を維持
- **層間依存の尊重**：Core→State→Shellの順序を厳守
- **純粋性の保証**：Core層の並列化は副作用なしを前提

### 並列実行時の原則
- **異なる機能**：完全並列可能（voicevox vs status-display）
- **同一機能のCore層**：並列可能（純粋関数のため）
- **同一機能のState/Shell層**：順次実行必須（依存関係のため）
- **競合回避**：ファイル単位での明確な責任分離

## 次のアクション

1. このプランをレビュー
2. CLAUDE.md更新
3. 小規模タスクでテスト
4. 段階的に複雑なタスクへ適用