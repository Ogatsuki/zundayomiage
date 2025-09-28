# 🎤 ずんだもん音声生成アプリ (FCIS+SMAC Architecture)

## 概要
画像からテキストを抽出（OCR）し、VOICEVOXを使用してずんだもんの音声に変換するWebアプリケーションです。

## 🚀 クイックスタート

### 1. 環境セットアップ
```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
```

### 2. VOICEVOXの起動

#### 方法A: Docker Compose（推奨）
```bash
# VOICEVOXサービスを起動
./start-voicevox.sh

# または手動で
docker-compose up -d voicevox
```

#### 方法B: VOICEVOXを直接インストール
[VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロードして起動

#### 方法C: モックモード（VOICEVOXなしで開発）
```bash
# .env.localを編集
NEXT_PUBLIC_MOCK_MODE=true
```

### 3. アプリケーションの起動
```bash
npm run dev
```

アプリケーションは http://localhost:3000 でアクセス可能です。

## 🏗️ アーキテクチャ (FCIS+SMAC)

### 三層構造
- **Core層** (`/core`): 純粋関数のみ（ビジネスロジック）
- **State層** (`/state`): 状態管理（XState）
- **Shell層** (`/shell`): React統合とIO処理

### 主要な特徴
- ✅ 100%テスト可能なCore層
- ✅ 明示的な状態遷移
- ✅ React 18 StrictMode完全対応
- ✅ 時間的結合の完全解決

## 🔧 トラブルシューティング

### エラー: "VOICEVOXサービスに接続できません"
**原因**: VOICEVOXサービスが起動していない

**解決方法**:
1. `./start-voicevox.sh`を実行
2. またはモックモードを有効化: `NEXT_PUBLIC_MOCK_MODE=true`

### エラー: "Unknown error"
**原因**: APIエンドポイントへの接続エラー

**解決方法**:
1. アプリケーションを再起動
2. ブラウザのキャッシュをクリア
3. コンソールログでエラー詳細を確認

### ポート競合
デフォルトポート:
- アプリ: 3000（使用中の場合3001）
- VOICEVOX: 50021

## 🧪 テスト
```bash
# 全テスト実行
npm test

# テスト監視モード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

## 📝 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `NEXT_PUBLIC_VOICEVOX_API_URL` | VOICEVOXのAPIエンドポイント | `http://localhost:50021` |
| `NEXT_PUBLIC_MOCK_MODE` | モックモードの有効化 | `false` |
| `NODE_ENV` | 実行環境 | `development` |

## 🐳 Docker環境

### Docker Composeサービス
- **voicevox**: VOICEVOXエンジン（CPU版）
- **app**: Next.jsアプリケーション

### コマンド
```bash
# 全サービス起動
docker-compose up -d

# VOICEVOXのみ起動
docker-compose up -d voicevox

# ログ確認
docker-compose logs -f voicevox

# 停止
docker-compose down
```

## 📚 追加リソース
- [VOICEVOX公式ドキュメント](https://voicevox.github.io/voicevox_engine/api/)
- [FCIS+SMACアーキテクチャ仕様](./docs/state/ai-architecture-knowledge-fcis-smac.json)