# セッションA用指示書 - OCR機能の完全実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14, React 18, TypeScript, VOICEVOX API, Tesseract.js
- **開発環境**: /app/fcis-smac-app

### 問題背景
- **現象**: OCR APIは実装済み（/app/api/ocr/route.ts）だがUIが完全欠如
- **根本原因**: OCR機能のフロントエンド実装が未着手
- **影響範囲**: ユーザーがOCR機能を一切利用できない
- **解決目標**: 画像アップロード→OCR処理→テキスト取得→音声合成の完全フロー実現

## 2. 全体設計

### アーキテクチャ決定
FCIS+SMAC垂直統合によるOCR機能実装。Core層は既存関数活用、State層で処理状態管理、Shell層でUI提供。

### 共通契約仕様
```typescript
// OCR処理状態
type OCRState =
  | { type: 'idle' }
  | { type: 'uploading'; progress: number }
  | { type: 'processing' }
  | { type: 'success'; text: string }
  | { type: 'error'; message: string };

// OCR結果
interface OCRResult {
  text: string;
  confidence: number;
  processedAt: string;
}
```

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Core/State/Shell（OCR機能の垂直統合）
- **機能**: OCR画像処理機能全体
- **スコープ**: 画像アップロードUIから音声合成連携まで

### 編集対象ファイル（排他的アクセス）
- `components/ocr/OCRUploader.client.vertical.tsx` - 新規作成：OCR UIコンポーネント
- `state/ocr.machine.ts` - 新規作成：OCR状態管理
- `core/ocr.core.ts` - 新規作成：OCR処理用純粋関数（既存関数を整理）

### 制約事項
- 既存のVOICEVOX機能を破壊しない
- 30MB以下の画像制限
- Tesseract.js使用（既存API活用）
- テキスト抽出後は自動でテキストエリアに挿入

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Core層（ocr.core.ts）
- [ ] 画像バリデーション関数（サイズ、形式チェック）
- [ ] OCRテキスト正規化（既存normalizeOCRText活用）
- [ ] 信頼度スコア計算
- [ ] エラーメッセージ生成（純粋関数）

#### State層（ocr.machine.ts）
- [ ] idle → uploading → processing → success/error
- [ ] アップロード進捗管理
- [ ] エラーリトライ機構
- [ ] XStateで実装

#### Shell層（OCRUploader.client.vertical.tsx）
- [ ] ドラッグ&ドロップ対応
- [ ] ファイル選択ボタン
- [ ] プレビュー表示
- [ ] 進捗バー表示
- [ ] エラー表示

## 5. 実行ステップ

### ステップ1: Core層実装（15分）
```bash
# core/ocr.core.tsを作成
# 純粋関数のみ：validateImage, normalizeOCRResult, calculateConfidence
```

### ステップ2: State層実装（20分）
```bash
# state/ocr.machine.tsを作成
# XStateで状態遷移定義
```

### ステップ3: Shell層実装（30分）
```bash
# components/ocr/OCRUploader.client.vertical.tsxを作成
# React 18対応、ドラッグ&ドロップUI
```

### ステップ4: 統合（10分）
```bash
# app/page.tsxにOCRコンポーネント追加
# テキストエリアとの連携実装
```

### ステップ5: 検証（10分）
```bash
npm run build
npm run typecheck
npm run dev
# 画像アップロードテスト実行
```

## 6. 完了基準
- [ ] 画像ドラッグ&ドロップ動作
- [ ] OCR処理成功でテキストエリアに自動挿入
- [ ] エラー時の適切なメッセージ表示
- [ ] ビルド・型チェック完全通過
- [ ] FCIS+SMAC完全準拠

## 7. 参考資料
- 既存OCR API: `/app/fcis-smac-app/app/api/ocr/route.ts`
- FCIS+SMAC仕様: `/app/docs/state/ai-architecture-knowledge-fcis-smac.json`

**実装開始**: 上記指示に従って実装を開始してください。