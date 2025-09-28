# セッションA：VOICEVOX自動起動機能の実装

## タスク概要
VOICEVOXサーバーの自動起動機能を実装し、開発者体験を向上させる

## アーキテクチャ準拠事項
- **Core層**：起動状態の判定ロジック（純粋関数）
- **State層**：サーバー状態の管理（idle, starting, ready, error）
- **Shell層**：Docker操作とプロセス管理

## 実装内容

### 1. Core層の実装
`fcis-smac-app/core/voicevox-startup.core.ts`を作成：
- `shouldAutoStart()`: 自動起動の判定ロジック
- `validateDockerEnvironment()`: Docker環境の検証
- `determineStartupStrategy()`: 起動戦略の決定

### 2. State層の実装
`fcis-smac-app/state/voicevox-startup.machine.ts`を作成：
- 状態定義：idle → checking → starting → ready/error
- イベント定義：CHECK, START, SUCCESS, FAILURE
- タイムアウト処理の実装

### 3. Shell層の実装
`fcis-smac-app/shell/VoicevoxAutoStarter.tsx`を作成：
- useEffectOnceパターンで初回起動
- Docker Composeの実行
- ヘルスチェックの実装

### 4. package.jsonへのスクリプト追加
```json
{
  "scripts": {
    "dev:with-voicevox": "npm run voicevox:start && npm run dev",
    "voicevox:start": "docker-compose up -d voicevox",
    "voicevox:stop": "docker-compose stop voicevox"
  }
}
```

## 検証項目
- [ ] Windows/Mac/Linuxでの動作確認
- [ ] Docker未インストール時のフォールバック
- [ ] 既存起動時のスキップ動作
- [ ] エラー時のリトライ機能

## 成果物
- 自動起動機能の実装
- テストコードの作成
- ドキュメントの更新