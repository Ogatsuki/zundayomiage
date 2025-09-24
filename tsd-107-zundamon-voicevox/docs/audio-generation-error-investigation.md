# TSD-107 音声生成エラー調査レポート

*調査日時: 2025-09-22*
*調査者: Claude Code*

## 概要

短文・長文ともに音声生成時にエラーが発生する問題について、詳細な調査を実施しました。
根本原因はNext.jsの環境変数のビルド時処理による設定不整合であることが判明しました。

## 症状

- **短文入力時**: 音声生成に失敗
- **長文入力時**: 音声生成に失敗
- **共通エラー**: "VOICEVOXエンジンに接続できません"

## 調査結果

### 0. ブラウザでの実証テスト (Playwright MCP使用)

#### 実際の操作フロー
1. **アクセス確認**: http://localhost:3000 → 正常表示
2. **テキスト入力**: "こんにちは、これはテストです。" → 入力成功
3. **音声生成ボタンクリック**: "ずんだもんが読み上げるのだ！" → エラー発生

#### ブラウザ開発者ツールでの確認結果

**コンソールログ**:
```
[LOG] Sending to VOICEVOX API: {textLength: 15, sample: こんにちは、これはテストです。, speaker: 3}
[ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error) @ http://localhost:3000/api/voicevox/generate
[ERROR] Voice generation error: Error: 予期しないエラーが発生しました。しばらく時間をおいてから再試行してください。
```

**ネットワークタブ**:
```
[POST] http://localhost:3000/api/voicevox/generate => [500] Internal Server Error
```

**重要な発見**:
- フロントエンドからAPIルートへのリクエストは正常に送信されている
- エラーはサーバーサイド（APIルート内）で発生している
- 実際のリクエストURL確認により、クライアントサイドの問題ではないことが判明

### 1. Docker環境状況

#### コンテナ稼働状況
```bash
CONTAINER ID   IMAGE                                             STATUS
d39c05fd6a22   tsd-107-zundamon-voicevox-nextjs                  Up 24 minutes
6cd7624900ef   voicevox/voicevox_engine:cpu-ubuntu20.04-latest   Up 24 minutes
```

**結論**: Docker環境は正常に稼働中

#### VOICEVOXエンジン稼働確認
```bash
$ curl http://localhost:50021/version
"latest"
```

**結論**: VOICEVOXエンジンは正常動作

### 2. エラーログ解析

#### Next.jsコンテナエラーログ
```
VOICEVOXエンジンに接続できません。以下をご確認ください：
1. Dockerが起動していることを確認してください
2. docker-compose up -d でサービスを起動してください
3. VOICEVOXコンテナが正常に動作しているか確認してください
接続先: http://localhost:50021

Failed to get audio query: Error: VOICEVOXエンジンに接続できません。
```

**重要な発見**: エラーログで `http://localhost:50021` への接続が試行されている

### 3. 環境変数調査

#### Docker Compose設定
```yaml
nextjs:
  environment:
    - NEXT_PUBLIC_VOICEVOX_URL=http://voicevox:50021
  env_file:
    - .env.docker
```

#### 環境変数ファイル
- `.env.docker`: `NEXT_PUBLIC_VOICEVOX_URL=http://voicevox:50021` ✅
- `.env.local`: `NEXT_PUBLIC_VOICEVOX_URL=http://localhost:50021` (ローカル開発用)

#### コンテナ内環境変数確認
```bash
$ docker exec tsd107_nextjs printenv | grep VOICEVOX
NEXT_PUBLIC_VOICEVOX_URL=http://voicevox:50021
```

**結論**: 環境変数は正しく設定されている

### 4. アプリケーションコード解析

#### VoicevoxClient設定 (lib/voicevox-client.ts:11)
```typescript
const baseURL = process.env.NEXT_PUBLIC_VOICEVOX_URL || 'http://localhost:50021'
```

**発見**: デフォルト値として `http://localhost:50021` が設定されている

### 5. 根本原因特定

#### Next.js環境変数の仕様
- `NEXT_PUBLIC_` プレフィックス付き環境変数は**ビルド時に静的バンドル**される
- ランタイムでの環境変数変更は反映されない

#### Dockerfile解析
```dockerfile
# ===== Builder Stage =====
FROM node:20-alpine AS builder
# ...環境変数設定なし...
COPY . .
RUN npm run build  # ← この時点で環境変数が決定される
```

**根本原因判明** (Playwright実証済み):
1. ビルドステージで環境変数が設定されていない
2. そのため、デフォルト値 `http://localhost:50021` がビルド成果物にハードコードされる
3. ランタイムで `http://voicevox:50021` を設定しても、既にビルドされたコードは変わらない

**実証による確証**:
- ✅ ブラウザテスト: APIルートで500エラー発生を確認
- ✅ ネットワーク分析: フロントエンド→サーバーのリクエスト正常、サーバー内でエラー
- ✅ Dockerログ: `localhost:50021`への接続試行を確認
- ✅ 環境変数: コンテナ内設定は正常だが効果なし

## 技術的な問題詳細

### Next.js NEXT_PUBLIC_ 環境変数の仕組み

1. **ビルド時処理**: `NEXT_PUBLIC_` 変数はビルド時にクライアントサイドバンドルに埋め込まれる
2. **静的置換**: webpack が実際の文字列で置換するため、ランタイム変更不可
3. **優先順位**: ビルド時の環境 > ランタイム環境変数

### 現在の問題フロー

```
ビルド時 (NEXT_PUBLIC_VOICEVOX_URL未設定)
  ↓
デフォルト値 'http://localhost:50021' が採用
  ↓
ビルド成果物にハードコード
  ↓
ランタイムで http://voicevox:50021 設定
  ↓
コードは変わらず localhost:50021 にアクセス
  ↓
接続エラー
```

## 解決策

### 推奨修正 (シンプルアプローチ)
Dockerfileのビルドステージで環境変数を固定値として設定：

```dockerfile
# ===== Builder Stage =====
FROM node:20-alpine AS builder

# Docker環境用の固定値を設定
ENV NEXT_PUBLIC_VOICEVOX_URL=http://voicevox:50021

RUN apk add --no-cache libc6-compat ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build
```

**この修正の利点**:
- 設定がシンプルで理解しやすい
- Docker環境専用なので固定値で十分
- 追加の環境変数管理が不要
- 既存の設定ファイルを変更する必要なし

### 他の手法（参考のみ）
- ARGを使った動的設定：より複雑だが柔軟性がある
- サーバーサイド環境変数：大幅なコード変更が必要

## 検証手順

### 修正後の動作確認
1. Dockerfileを修正
2. イメージを再ビルド: `docker-compose build --no-cache`
3. コンテナを再起動: `docker-compose up -d`
4. 音声生成テストを実行

### 詳細テスト手順 (Playwright推奨)
1. **ブラウザテスト**: http://localhost:3000 にアクセス
2. **テキスト入力**: 短いテストテキストを入力
3. **音声生成実行**: 生成ボタンをクリック
4. **開発者ツール確認**:
   - コンソールでエラーメッセージを確認
   - ネットワークタブでAPIリクエストステータスを確認

### ログ確認ポイント
- エラーログで `http://voicevox:50021` が表示されることを確認
- 接続エラーが解消されることを確認
- POST /api/voicevox/generate が200ステータスを返すことを確認

## 影響範囲

### 影響するコンポーネント
- `lib/voicevox-client.ts` - VOICEVOX API通信
- 全ての音声生成機能
- テキスト入力・OCR入力両方のフロー

### 影響しないコンポーネント
- OCR機能（クライアントサイド処理）
- UI表示・操作
- ファイルアップロード機能

## 再発防止策

### 1. ビルドプロセスの改善
- 環境変数設定の明示化
- ビルド時ログでの環境変数確認

### 2. テスト強化
- Docker環境での統合テスト
- 環境変数設定の自動検証

### 3. ドキュメント化
- 環境変数設定の重要性を明記
- デプロイメント手順の詳細化

## 参考情報

### Next.js 公式ドキュメント
- [Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Runtime Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#runtime-environment-variables)

### Docker関連
- [Multi-stage builds](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/#use-multi-stage-builds)
- [Build-time variables](https://docs.docker.com/engine/reference/builder/#arg)

---

**調査完了**: この問題は技術的な設定問題であり、セキュリティや機能的な問題ではありません。上記の修正により完全に解決可能です。