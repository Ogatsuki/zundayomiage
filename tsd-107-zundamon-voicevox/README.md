# TSD-107: VOICEVOX音声生成アプリ

ずんだもん・四国めたんの声でテキストを読み上げるWebアプリケーション

## 機能

- 2つの話者から選択可能
  - ずんだもん（ノーマル音声）
  - 四国めたん（ノーマル音声）
- 2つの入力モード
  - テキスト入力（最大1000文字）
  - 画像からのOCR（光学文字認識）
- OCR機能
  - JPEG/PNG/WEBP画像対応（最大5MB）
  - 日本語/英語の文字認識
  - 認識結果の編集・修正機能
  - ドラッグ&ドロップ対応
- 音声の再生・停止
- WAVファイルとしてダウンロード
- 話者に応じたUIテキストの動的変更

## 環境要件

- Docker & Docker Compose
- Node.js 20以上（ローカル開発時）
- ポート3000（Next.js）と50021（VOICEVOX）が使用可能であること

## クイックスタート（Docker推奨）

```bash
# リポジトリをクローン
git clone [repository-url]
cd TSD2amazing/tsd-107-zundamon-voicevox

# Dockerコンテナを起動
docker-compose up -d

# ブラウザでアクセス
# http://localhost:3000
```

起動完了まで約1分程度かかります。

## 起動方法詳細

### Docker環境での起動（推奨）

1. **初回起動**
```bash
cd TSD2amazing/tsd-107-zundamon-voicevox
docker-compose up -d
```

2. **停止**
```bash
docker-compose down
```

3. **再起動**
```bash
docker-compose restart
```

4. **ログ確認**
```bash
# 全体のログ
docker-compose logs -f

# VOICEVOXのログのみ
docker logs tsd107_voicevox -f

# Next.jsのログのみ
docker logs tsd107_nextjs -f
```

5. **完全クリーンアップ**
```bash
docker-compose down -v
docker system prune -a
```

### ローカル環境での起動

1. **VOICEVOXを別途起動**
```bash
# VOICEVOXをダウンロードして起動
# https://voicevox.hiroshiba.jp/
# デフォルトでhttp://localhost:50021で起動
```

2. **依存関係インストール**
```bash
npm install
```

3. **開発サーバー起動**
```bash
npm run dev
```

4. **ブラウザでアクセス**
```
http://localhost:3000
```

## 環境変数

- `.env.local`: ローカル開発用
- `.env.docker`: Docker環境用（自動選択）

## 技術スタック

- **フロントエンド**: Next.js 14（App Router）、TypeScript、Tailwind CSS
- **音声合成**: VOICEVOX API
- **OCR**: Tesseract.js（クライアントサイド文字認識）
- **コンテナ**: Docker、Docker Compose
- **HTTP通信**: axios（IPv4強制）

## 話者情報

| 話者名 | Speaker ID | 説明 |
|--------|------------|------|
| ずんだもん | 3 | 東北ずん子の関連キャラクター |
| 四国めたん | 2 | 四国地方のご当地キャラクター |

## トラブルシューティング

### ポート競合エラー
```bash
# 使用中のポートを確認
netstat -an | grep :50021
netstat -an | grep :3000

# 既存のコンテナを停止
docker ps -a | grep tsd107
docker stop [container_id]
docker rm [container_id]
```

### VOICEVOXエンジン接続エラー
```bash
# VOICEVOXコンテナの状態確認
docker ps --filter "name=tsd107_voicevox"

# VOICEVOXのログ確認
docker logs tsd107_voicevox --tail 50

# 手動でVOICEVOXをテスト
curl http://localhost:50021/version
```

### Docker起動が遅い場合
VOICEVOXエンジンの初期化に時間がかかることがあります。
`docker logs tsd107_voicevox -f`でログを確認し、「Uvicorn running on」のメッセージが表示されるまで待ってください。

## 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# プロダクション起動
npm start

# Lint実行
npm run lint
```

## ディレクトリ構造

```
tsd-107-zundamon-voicevox/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   │   └── voicevox/     # VOICEVOX関連エンドポイント
│   ├── layout.tsx        # レイアウト
│   └── page.tsx          # メインページ
├── components/            # Reactコンポーネント
│   ├── AudioPlayer.tsx   # 音声プレイヤー
│   ├── ImageUpload.tsx   # 画像アップロード
│   ├── OCRProcessor.tsx  # OCR処理
│   ├── OCRResultEditor.tsx # OCR結果編集
│   └── VoiceGenerator.tsx # メインUI
├── lib/                   # ユーティリティ
│   └── voicevox-client.ts # VOICEVOXクライアント
├── types/                 # TypeScript型定義
│   └── voicevox.ts       # VOICEVOX関連の型
├── tasks/                 # PM/Workerタスク管理
├── docker-compose.yml     # Docker設定
├── Dockerfile            # Dockerイメージ定義
└── package.json          # 依存関係
```

## ライセンス

このプロジェクトで使用している音声ライブラリのクレジット表記：
- VOICEVOX:ずんだもん
- VOICEVOX:四国めたん

## 注意事項

- 音声生成にはVOICEVOXエンジンが必要です
- 商用利用の際は各キャラクターの利用規約をご確認ください
- 初回起動時はDockerイメージのダウンロードで時間がかかります