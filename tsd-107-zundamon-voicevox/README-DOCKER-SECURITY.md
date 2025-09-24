# Docker セキュリティ設定ガイド

## 🔒 環境変数とボリュームマウントのセキュリティ

### 問題と解決策

#### 1. `.env`ファイルがイメージに含まれる問題
**問題**: Dockerイメージビルド時に`.env`ファイルが含まれてしまう
**解決済**:
- `.dockerignore`で除外設定
- 不要な`RUN rm`コマンドを削除

#### 2. ボリュームマウントによる露出
**問題**: 開発時の`volumes: - .:/app`で全ファイルがマウントされる
**解決済**:
- 必要なファイル/フォルダのみを個別マウント
- `.env`ファイルを明示的に除外

### 現在の構成

#### 開発環境 (`docker-compose.yml`)
```yaml
volumes:
  # 個別マウント（.envファイル除外）
  - ./app:/app/app
  - ./components:/app/components
  - ./lib:/app/lib
  # 設定ファイル（読み取り専用）
  - ./package.json:/app/package.json:ro
  # ビルド生成物はコンテナ内保持
  - /app/node_modules
  - /app/.next
```

#### 本番環境 (`docker-compose.prod.yml`)
- ボリュームマウント完全削除
- 環境変数直接指定
- ヘルスチェック追加

## 🚀 使用方法

### 開発環境
```bash
# 開発用（ホットリロードあり）
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 本番環境
```bash
# 本番用ビルド
docker-compose -f docker-compose.prod.yml build --no-cache

# 本番起動
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Run デプロイ
```bash
# イメージビルド
docker build -t gcr.io/PROJECT_ID/tsd107-nextjs .

# プッシュ
docker push gcr.io/PROJECT_ID/tsd107-nextjs

# デプロイ
gcloud run deploy tsd107 \
  --image gcr.io/PROJECT_ID/tsd107-nextjs \
  --platform managed \
  --region asia-northeast1
```

## 🔍 セキュリティ確認方法

### イメージ内の.envファイル確認
```bash
# イメージに.envファイルが含まれていないことを確認
docker run --rm -it tsd107_nextjs sh -c "ls -la | grep env"
# → 何も表示されなければOK
```

### ヘルスチェック確認
```bash
# ローカルでヘルスチェック
curl http://localhost:3000/api/health
```

## 📝 重要な変更点

1. **`.dockerignore`最適化**
   - `.env`と`.env.*`で全て除外
   - CRLF → LF改行に変換

2. **`docker-compose.yml`改善**
   - 個別ボリュームマウント
   - `env_file`セクション削除

3. **`docker-compose.prod.yml`新規作成**
   - ボリューム完全削除
   - ヘルスチェック追加
   - Cloud Run対応

4. **ヘルスチェックAPI追加**
   - `/api/health`エンドポイント
   - VOICEVOXとの接続性確認

## ⚠️ 注意事項

- 開発時: `.env.local`を直接編集しても反映されない（マウント除外のため）
- 環境変数変更時は`docker-compose.yml`を編集して再起動が必要
- 本番環境では必ず`docker-compose.prod.yml`を使用すること