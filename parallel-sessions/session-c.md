# セッションC用指示書 - スタイリング+品質改善

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **開発環境**: Linux, Node.js 20+

### 問題背景（調査結果）
- **現象**: スタイリングが未実装、セキュリティ問題、テスト不足
- **根本原因**: globals.cssが空、CORS設定が緩い、品質チェック未実施
- **影響範囲**: ユーザー体験、セキュリティ、保守性
- **解決目標**: モダンなUI、セキュリティ強化、基本テスト追加

## 2. 全体設計（決定事項）

### 改善内容
- Tailwindによるモダンなスタイリング
- セキュリティ修正（CORS、環境変数管理）
- 基本的なテストスイート作成
- アクセシビリティ改善
- エラーハンドリング強化

### 共通契約仕様（他セッション定義済み）
他セッションで定義された型定義とインターフェースを尊重し、スタイリングと品質改善に集中。

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: 横断的（スタイリング、テスト、設定）
- **機能**: UI美化、セキュリティ、品質保証
- **スコープ**: CSS、テスト、設定ファイル

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/app/globals.css` - グローバルスタイル（編集）
- `/app/fcis-smac-app/tailwind.config.js` - Tailwind設定（編集）
- `/app/fcis-smac-app/app/api/ocr/security.ts` - OCRセキュリティ設定（新規作成）
- `/app/fcis-smac-app/__tests__/core/ocr.test.ts` - OCRテスト（新規作成）
- `/app/fcis-smac-app/__tests__/core/tts.test.ts` - TTSテスト（新規作成）
- `/app/fcis-smac-app/.env.example` - 環境変数テンプレート更新（編集）

## 4. 実装詳細

### グローバルスタイル
```css
/* /app/fcis-smac-app/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-primary: 34 197 94; /* green-500 */
    --color-secondary: 59 130 246; /* blue-500 */
    --color-danger: 239 68 68; /* red-500 */
    --color-warning: 245 158 11; /* amber-500 */
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-gray-50 text-gray-900 antialiased;
    font-family: 'Inter', 'Noto Sans JP', sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700
           disabled:opacity-50 disabled:cursor-not-allowed transition-colors
           focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2;
  }

  .btn-secondary {
    @apply px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
           disabled:opacity-50 disabled:cursor-not-allowed transition-colors
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6 mb-6;
  }

  .input-field {
    @apply w-full p-3 border border-gray-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           disabled:bg-gray-100 disabled:cursor-not-allowed;
  }

  .error-message {
    @apply p-4 bg-red-50 text-red-700 rounded-lg border border-red-200;
  }

  .success-message {
    @apply p-4 bg-green-50 text-green-700 rounded-lg border border-green-200;
  }

  .info-message {
    @apply p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200;
  }

  .loading-spinner {
    @apply animate-spin h-5 w-5 border-2 border-gray-300 rounded-full
           border-t-blue-600;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* アクセシビリティ: フォーカス表示 */
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-blue-500;
}

/* ダークモード対応準備 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: 17 24 39; /* gray-900 */
    --color-text: 243 244 246; /* gray-100 */
  }
}

/* レスポンシブデザイン調整 */
@media (max-width: 640px) {
  .card {
    @apply p-4 rounded-md;
  }

  .btn-primary,
  .btn-secondary {
    @apply w-full;
  }
}
```

### Tailwind設定拡張
```javascript
// /app/fcis-smac-app/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './shell/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
```

### OCRセキュリティ設定
```typescript
// /app/fcis-smac-app/app/api/ocr/security.ts
import { NextRequest } from 'next/server';

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
export const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '5');
export const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '10'); // requests per minute

export function getCORSHeaders(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
}

export function validateEnvironment() {
  const required = ['NEXT_PUBLIC_VOICEVOX_API_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

### Core層テスト
```typescript
// /app/fcis-smac-app/__tests__/core/ocr.test.ts
import { describe, expect, test } from '@jest/globals';
import { validateOCRFile, normalizeOCRText } from '../../core/ocr.core';

describe('OCR Core Functions', () => {
  describe('validateOCRFile', () => {
    test('should validate correct file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject oversized file', () => {
      const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイルサイズが5MBを超えています');
    });

    test('should reject non-image file', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('画像ファイルを選択してください');
    });
  });

  describe('normalizeOCRText', () => {
    test('should normalize full-width numbers', () => {
      const input = 'テスト１２３';
      const expected = 'テスト123';
      expect(normalizeOCRText(input)).toBe(expected);
    });

    test('should remove extra spaces', () => {
      const input = 'テスト  です   。';
      const expected = 'テスト です。';
      expect(normalizeOCRText(input)).toBe(expected);
    });

    test('should fix punctuation spacing', () => {
      const input = 'テスト 。 次の文 、 続き';
      const expected = 'テスト。次の文、続き';
      expect(normalizeOCRText(input)).toBe(expected);
    });
  });
});
```

### TTS Core層テスト
```typescript
// /app/fcis-smac-app/__tests__/core/tts.test.ts
import { describe, expect, test } from '@jest/globals';
import { validateTTSRequest } from '../../core/tts.core';

describe('TTS Core Functions', () => {
  describe('validateTTSRequest', () => {
    test('should validate correct request', () => {
      const result = validateTTSRequest('テストテキスト', 3);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject empty text', () => {
      const result = validateTTSRequest('', 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('テキストを入力してください');
    });

    test('should reject text over 30000 characters', () => {
      const longText = 'あ'.repeat(30001);
      const result = validateTTSRequest(longText, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('テキストは30,000文字以内で入力してください');
    });

    test('should reject invalid speaker ID', () => {
      const result = validateTTSRequest('テスト', 999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('無効な話者IDです');
    });

    test('should accept valid speaker IDs', () => {
      expect(validateTTSRequest('テスト', 2).isValid).toBe(true);
      expect(validateTTSRequest('テスト', 3).isValid).toBe(true);
    });
  });
});
```

### 環境変数テンプレート更新
```bash
# /app/fcis-smac-app/.env.example
# VOICEVOX API設定
NEXT_PUBLIC_VOICEVOX_API_URL=http://localhost:50021
VOICEVOX_API_URL=http://localhost:50021

# OCR設定
OCR_LANGUAGE=jpn
MAX_FILE_SIZE_MB=5

# セキュリティ設定
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT=10

# モックモード（開発用）
NEXT_PUBLIC_MOCK_MODE=false

# 音声処理設定
MP3_BITRATE=128
MP3_CHANNELS=1
MP3_FREQUENCY=22050

# FFmpeg設定（オプション）
FFMPEG_PATH=/usr/bin/ffmpeg
```

## 5. 実行コマンド

```bash
# テストディレクトリ作成
mkdir -p /app/fcis-smac-app/__tests__/core

# パッケージインストール（必要に応じて）
cd /app/fcis-smac-app
npm install -D @tailwindcss/forms @tailwindcss/typography

# テスト実行
npm test

# ビルド確認
npm run build
npm run lint
```

## 6. 完了基準

- [x] モダンなスタイリング適用
- [x] セキュリティヘッダー実装
- [x] 環境変数管理改善
- [x] 基本テスト作成
- [x] アクセシビリティ対応
- [x] レスポンシブデザイン

## 7. 追加改善項目

### パフォーマンス最適化
- 画像の遅延読み込み
- コンポーネントのメモ化
- バンドルサイズ最適化

### セキュリティ強化
- CSPヘッダー設定
- Rate limiting実装
- 入力サニタイゼーション

### アクセシビリティ
- キーボードナビゲーション完全対応
- スクリーンリーダー対応
- カラーコントラスト確認

---
**実装開始**: 上記仕様に従ってスタイリングと品質改善を実装してください。
**質問がある場合**: 契約の範囲内で最善の判断を行ってください。