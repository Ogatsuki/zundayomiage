# セッションC用指示書 - Next.js設定とビルドプロセスの最適化

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14.2.33, React 18, TypeScript
- **開発環境**: Windows, Node.js

### 問題背景
- **現象**: Next.jsビルド/開発サーバーのタイムアウト
- **根本原因**: Next.js設定またはビルドプロセスの問題
- **影響範囲**: 開発環境、本番ビルド
- **解決目標**: 安定したビルドとサーバー起動

## 2. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（フレームワーク設定）
- **機能**: Next.js設定、ビルドプロセス
- **スコープ**: Next.js設定ファイル、ビルドスクリプト

### 編集対象ファイル（排他的アクセス）
- `next.config.js` - Next.js設定（作成）
- `package.json` - ビルドスクリプト最適化
- `.env.local` - 環境変数確認

## 3. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト（Shell層）
- [ ] 設定の明確性と保守性
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング
- [ ] 開発体験の向上

## 4. 実行ステップ

### ステップ1: Next.js設定作成
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Windows環境での最適化
  webpack: (config, { isServer }) => {
    // ファイル監視の最適化（Windows対応）
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: /node_modules/,
    };

    return config;
  },

  // 開発サーバー設定
  devIndicators: {
    buildActivity: true,
    appIsrStatus: false,
  },

  // 実験的機能
  experimental: {
    // Windows環境でのパフォーマンス改善
    turbo: {
      resolveAlias: {
        canvas: './empty-module.js',
      },
    },
  },

  // CSSモジュール設定
  cssModules: false,

  // 画像最適化
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
```

### ステップ2: package.json最適化
```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:clean": "rm -rf .next && next dev",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### ステップ3: 環境変数確認
```bash
# .env.localの内容確認
cat .env.local

# 必要に応じて追加
echo "NEXT_TELEMETRY_DISABLED=1" >> .env.local
```

### ステップ4: 起動テスト
```bash
cd D:\Users\m_kazuya\quick_access\desktop\TSD2wonderful\zundayomiage\fcis-smac-app

# クリーン起動
npm run dev:clean

# ビルドテスト
npm run build

# 型チェック
npm run type-check
```

## 5. 完了基準
- [ ] next.config.js作成完了
- [ ] 開発サーバー正常起動（3秒以内）
- [ ] ビルド成功（エラー0）
- [ ] 型チェック通過

## 6. 出力仕様
統合セッションに以下を報告：
- Next.js設定: 最適化完了
- 開発サーバー: http://localhost:3000で起動
- ビルド: 正常完了
- CSSスタイル: 適用確認