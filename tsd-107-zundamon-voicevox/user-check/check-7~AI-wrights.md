# TSD-107 問題7-11 技術分析と解決戦略

## 問題7: テキスト生成中の視覚フィードバック不足

### 現状分析
- **実装状況**: `VoiceGenerator.tsx:248` でloading状態による「生成中なのだ...」「生成中だよ...」表示は実装済み
- **問題**: ボタンテキストのみの変更で、ユーザーが生成状況を認識しづらい

### 解決戦略
**推奨アプローチ**: **プログレス表示の追加**

```tsx
// VoiceGenerator.tsx に追加
{isLoading && (
  <div className="w-full bg-gray-100 rounded-lg p-4 mt-4">
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zundamon-green"></div>
      <span className="text-gray-700">{currentSpeaker.generateText}</span>
    </div>
    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
      <div className="bg-zundamon-green h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
    </div>
  </div>
)}
```

**実装時間**: 15分
**優先度**: 高 (UX大幅改善)

---

## 問題8: MP3変換未実装（WAVのまま）

### 現状分析
- **実装状況**: `lib/audio-converter.ts` でMP3変換ロジックは実装済み
- **問題**: Docker環境でffmpegが利用不可（ENOENTエラー）
- **根本原因**: `Dockerfile` にffmpegがインストールされていない

### 解決戦略
**推奨アプローチ**: **Dockerfileのffmpeg追加**

```dockerfile
# Dockerfile 修正
FROM node:20-alpine

# ffmpegを追加
RUN apk add --no-cache libc6-compat ffmpeg

# 以下既存のまま...
```

**代替案**: ffmpeg-staticの確認
```bash
# package.jsonのffmpeg-staticが正しく動作するかチェック
npm ls ffmpeg-static fluent-ffmpeg
```

**実装時間**: 5分（Dockerfile修正）
**優先度**: 最高 (機能として重要)

---

## 問題9: 英語選択UIの残存

### 現状分析
- **実装状況**: `VoiceGenerator.tsx:219` で `language="jpn"` 固定
- **問題**: `OCRProcessor.tsx:94` で「言語: 英語」表示が残存
- **VOICEVOX制約**: 英語音声合成は非対応

### 解決戦略
**推奨アプローチ**: **表示テキストの日本語固定**

```tsx
// OCRProcessor.tsx:94 修正
<span className="text-xs text-gray-500">
  言語: 日本語
</span>
```

**追加考慮**: interface定義も整理
```tsx
// OCRProcessor.tsx:9 修正
interface OCRProcessorProps {
  imageFile: File | null;
  onOCRComplete: (text: string) => void;
  // language: 'jpn' | 'eng'; // 削除
}
```

**実装時間**: 5分
**優先度**: 中 (混乱回避)

---

## 問題10: OCR長文処理時のタイムアウト

### 現状分析
- **症状**: 800文字程度で `timeout of 10000ms exceeded`
- **CPU使用率**: Intel 12700で100%張り付き
- **Cloud Run懸念**: 大きなリソース消費によるコスト増加

### 解決戦略
**推奨アプローチ**: **段階的最適化**

#### Phase 1: タイムアウト延長
```tsx
// VoiceGenerator.tsx generateVoice関数に追加
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒に延長

const response = await fetch('/api/voicevox/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: targetText.trim(), speaker: selectedSpeakerId }),
  signal: controller.signal
});
```

#### Phase 2: テキスト分割処理
```tsx
// 長文を文単位で分割して個別処理
const splitIntoSentences = (text: string): string[] => {
  return text.split(/[。！？\n]/).filter(s => s.trim().length > 0);
};
```

#### Phase 3: Cloud Run GPU検討
- **現在**: CPU専用インスタンス
- **GPU利用**: VOICEVOX GPU版の検討が必要
- **コスト比較**: GPU利用料 vs CPU処理時間

**実装時間**: Phase1 (20分), Phase2 (1時間)
**優先度**: 高 (スケーラビリティ)

---

## 問題11: ffmpeg ENOENTエラー

### 現状分析
- **エラー**: `spawn /app/.next/server/vendor-chunks/ffmpeg ENOENT`
- **原因**: Next.js bundlingによるffmpeg-staticのパス問題
- **影響**: MP3変換完全停止

### 解決戦略
**推奨アプローチ**: **Dockerコンテナ内ffmpeg直接利用**

#### 解決案A: システムffmpeg利用
```typescript
// lib/audio-converter.ts 修正
import ffmpeg from 'fluent-ffmpeg';

// ffmpeg-staticではなくシステムffmpegを使用
// ffmpeg.setFfmpegPath(ffmpegStatic!); // 削除
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg'); // Alpine Linuxのパス
```

#### 解決案B: next.config.js調整
```javascript
// next.config.js に追加
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static']
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'ffmpeg-static': false,
    };
    return config;
  }
};
```

**実装時間**: 10分
**優先度**: 最高 (機能ブロッカー)

---

## 実装優先順位とスケジュール

| 問題 | 実装時間 | 優先度 | 技術難易度 | ビジネス影響 |
|------|---------|--------|-----------|-------------|
| 問題8&11 (ffmpeg) | 15分 | 最高 | 低 | 高 (機能停止) |
| 問題7 (UI) | 15分 | 高 | 低 | 中 (UX改善) |
| 問題9 (英語表示) | 5分 | 中 | 低 | 低 (混乱回避) |
| 問題10 (タイムアウト) | 20-60分 | 高 | 中 | 高 (スケール対応) |

## 総合実装戦略

### Immediate Actions (今すぐ実装)
1. **ffmpeg問題解決** (問題8&11)
2. **プログレス表示追加** (問題7)
3. **英語表示削除** (問題9)

### Next Phase (次回対応)
1. **OCRタイムアウト対策** (問題10)
2. **パフォーマンス最適化**
3. **Cloud Run GPU移行検討**

### リスク評価
- **低リスク**: 問題7,8,9,11 (既存機能への影響なし)
- **中リスク**: 問題10 (アーキテクチャ変更の可能性)

**推定総実装時間**: 35-95分
**即座実装可能**: 問題7,8,9,11 (35分で完了)