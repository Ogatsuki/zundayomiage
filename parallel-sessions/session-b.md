# セッションB用指示書 - CSS/TailwindCSS設定の検証と修正

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14.2.33, React 18, TypeScript, TailwindCSS 3.3.0
- **開発環境**: Windows, Node.js

### 問題背景
- **現象**: TailwindCSSスタイルがブラウザで適用されない
- **根本原因**: CSS設定またはPostCSSパイプラインの問題の可能性
- **影響範囲**: 全UIコンポーネント
- **解決目標**: TailwindCSSスタイルの正常適用

## 2. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（UI/スタイリング）
- **機能**: CSS設定、TailwindCSS設定
- **スコープ**: スタイル設定ファイルの検証と修正

### 編集対象ファイル（排他的アクセス）
- `app/globals.css` - グローバルCSS設定
- `tailwind.config.js` - TailwindCSS設定
- `postcss.config.js` - PostCSS設定

## 3. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト（Shell層）
- [ ] スタイル設定の明確性
- [ ] パフォーマンス最適化
- [ ] ブラウザ互換性
- [ ] 開発/本番環境対応

## 4. 実行ステップ

### ステップ1: CSS設定診断
```bash
cd D:\Users\m_kazuya\quick_access\desktop\TSD2wonderful\zundayomiage\fcis-smac-app

# TailwindCSSの依存関係確認
npm list tailwindcss postcss autoprefixer

# 設定ファイルの検証
npx tailwindcss init --full > tailwind.full.config.js
```

### ステップ2: 設定修正

#### globals.css確認と修正
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* カスタムCSS変数 */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

/* グローバルスタイル */
body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

/* レイアウトシフト防止 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

#### tailwind.config.js最適化
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './blocks/**/*.{js,ts,jsx,tsx,mdx}',
    './shell/**/*.{js,ts,jsx,tsx,mdx}', // Shell層を追加
  ],
  theme: {
    extend: {
      colors: {
        'pvbp': {
          primary: 'rgb(147 51 234)',
          secondary: 'rgb(79 70 229)',
          accent: 'rgb(168 85 247)',
        }
      },
    },
  },
  plugins: [],
}
```

### ステップ3: ビルド検証
```bash
# CSSビルド確認
npx tailwindcss -i ./app/globals.css -o ./app/output.css --watch

# 生成されたCSSの確認
head -50 ./app/output.css
```

## 5. 完了基準
- [ ] TailwindCSS設定の最適化完了
- [ ] PostCSS設定の検証完了
- [ ] CSSビルドエラーなし
- [ ] 出力CSSファイルにTailwindクラス含む

## 6. 出力仕様
他のセッションに以下を報告：
- CSS設定: 最適化完了
- TailwindCSS: v3.3.0動作確認
- PostCSS: パイプライン正常