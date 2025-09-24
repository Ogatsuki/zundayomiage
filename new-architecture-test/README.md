# ずんだよみあげ - AI中心設計アーキテクチャ実装

VOICEVOX音声読み上げアプリケーションの新アーキテクチャ実装版

## 起動方法

```bash
# Docker環境で起動
docker-compose up

# または個別に起動
npm install
npm run dev
```

## アーキテクチャ原則

- **垂直統合ブロック**: 各機能を1ファイルで自己完結実装
- **ゼロコンテキスト契約**: 型定義のみでブロック間通信
- **AI認知負荷最小化**: ファイル間ジャンプを排除

## ディレクトリ構造

```
new-architecture-test/
├── contracts/          # 契約定義
├── blocks/             # 垂直統合ブロック
├── app/                # Next.js App Router
├── docker-compose.yml  # Docker設定
└── package.json        # 依存関係
```

## 実装完了機能

- [x] Docker環境セットアップ
- [x] ゼロコンテキスト契約システム
- [x] テキスト入力ブロック（OCR対応）
- [x] VOICEVOX音声合成ブロック
- [x] オーディオ再生ブロック
- [x] メインアプリケーション統合

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- VOICEVOX Engine
- Docker & Docker Compose
- Tailwind CSS