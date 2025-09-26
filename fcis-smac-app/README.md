# FCIS+SMAC Architecture Implementation

## 🚀 クイックスタート

### Docker Composeで起動（推奨）
```bash
# 1. 環境変数ファイルをコピー
cp .env.example .env

# 2. Docker Composeで起動
docker compose up

# 3. ブラウザでアクセス
# http://localhost:3000
```

### ローカル開発環境
```bash
# 1. 依存関係インストール
npm install

# 2. VOICEVOXを別途起動
# VOICEVOXダウンロード: https://voicevox.hiroshiba.jp/
# 起動後、http://localhost:50021 でAPIが利用可能

# 3. 開発サーバー起動
npm run dev

# 4. ブラウザでアクセス
# http://localhost:3000
```

## アーキテクチャ概要

FCIS+SMAC (Functional Core, Imperative Shell + State Machine as Code) は、PVBPアーキテクチャの進化版です。

- **理想性スコア**: 93% (PVBP: 30%)
- **主な改善点**: 時間的結合の解消、完全な純粋関数化、100%テスタビリティ

## 3層モデル

### 1. Core層 (Functional Core)
- **場所**: `/core`
- **原則**: 純粋関数のみ
- **特徴**:
  - 副作用なし (fetch, setState, console.log禁止)
  - 決定的な入出力
  - 100% ユニットテスト可能
  - 不変データ変換

### 2. State層 (State Machine as Code)
- **場所**: `/state`
- **原則**: 明示的な状態管理
- **特徴**:
  - 明示的な状態定義
  - ビジュアル状態遷移図
  - Reactライフサイクルから独立
  - イベント駆動の状態変更

### 3. Shell層 (Imperative Shell)
- **場所**: `/shell`
- **原則**: 薄いIOレイヤー
- **特徴**:
  - すべての副作用を隔離
  - React統合ポイント
  - 外部世界へのコントラクト提供
  - PVBP垂直統合を維持

## ファイル命名規則

```
[feature].core.ts           # Core層の純粋関数
[feature].machine.ts        # State Machine定義
[feature].shell.[runtime].vertical.tsx  # Shell層のReact統合
```

## 移行ステータス

- [ ] Phase 1: Core抽出 (1日)
- [ ] Phase 2: State Machine導入 (3日)
- [ ] Phase 3: Shell層リファクタリング (2日)

## 開発ガイドライン

### Core層のルール
- async/awaitなし
- throw文なし (Result型を返す)
- 外部依存なし
- 可変操作なし
- すべての関数をエクスポート可能かつテスト可能に

### State層のルール
- すべての状態を明示的に定義
- すべての遷移を文書化
- サービスが非同期操作を処理
- コンテキストは最小限のデータ保持

### Shell層のルール
- 可能な限り薄く
- ビジネスロジックなし
- オーケストレーションとIOのみ
- 明確なコントラクト提供