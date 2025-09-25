# PVBP App デプロイメントガイド

## 環境構成の違い

### 1. ローカル開発環境（Docker Compose）
```bash
# 起動
docker-compose up -d

# 構成
├── voicevox:50021 (別コンテナ)
└── app:3001 (別コンテナ)
```

**特徴**：
- 2つの独立したコンテナ
- Docker networkで通信
- ホットリロード対応
- ポート3001でアクセス

### 2. Cloud Run（マルチコンテナ/サイドカー）
```bash
# デプロイ
gcloud run deploy pvbp-zundayomiage \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

**特徴**：
- 同一Pod内の2コンテナ
- localhost通信（高速）
- 自動スケーリング
- HTTPSでアクセス

## 環境変数の使い分け

| 環境変数 | ローカル | Cloud Run | 説明 |
|---------|---------|-----------|------|
| VOICEVOX_API_URL | http://voicevox:50021 | http://localhost:50021 | サーバーサイドAPI |
| NEXT_PUBLIC_VOICEVOX_API_URL | http://localhost:50021 | /api/voicevox（プロキシ経由） | クライアントサイド |

## ビルドとデプロイの流れ

### ローカル開発
```bash
# 1. Docker Composeで起動
docker-compose up -d

# 2. 開発サーバー確認
curl http://localhost:3001
```

### 本番デプロイ（Cloud Run）
```bash
# 1. Dockerイメージビルド
docker build -t pvbp-app .

# 2. イメージをGCRにプッシュ
docker tag pvbp-app gcr.io/PROJECT_ID/pvbp-app
docker push gcr.io/PROJECT_ID/pvbp-app

# 3. Cloud Runにデプロイ（サイドカー構成）
# cloud-run-sidecar.yamlを参照
```

## PVBP特有の考慮事項

### Runtime宣言の影響
- **client blocks**: クライアントサイドでのみ実行
  - VOICEVOX APIはプロキシ経由でアクセス
- **server blocks**: サーバーサイドでのみ実行
  - 直接VOICEVOX_API_URLにアクセス
- **universal blocks**: 両環境で実行
  - 環境に応じて適切なAPIエンドポイントを選択

### 推奨構成
1. **開発**: Docker Compose（迅速な開発サイクル）
2. **ステージング**: Cloud Run（本番同等環境）
3. **本番**: Cloud Run with サイドカー（スケーラビリティ）

## トラブルシューティング

### NETWORK_ERROR が発生する場合
- PVBPのuseAbortSafeパターンが正しく適用されているか確認
- RUNTIME宣言が適切か確認

### VOICEVOXに接続できない場合
- ローカル: `docker-compose ps`でvoicevoxコンテナ確認
- Cloud Run: サイドカーのヘルスチェック確認

### ビルドが遅い場合
- マルチステージビルドを活用
- .dockerignoreで不要ファイル除外
- Cloud Buildの利用を検討