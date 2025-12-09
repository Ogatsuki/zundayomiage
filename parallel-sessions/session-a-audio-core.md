# セッションA用指示書 - 音声ダウンロード機能Core層実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js, React 18, TypeScript, VOICEVOX API
- **開発環境**: Windows, Node.js

### 問題背景
- **現象**: 仕様書にMP3ダウンロードと記載があるが、実際はWAV形式でダウンロードされている
- **根本原因**: MP3変換処理が未実装、500文字分割処理が統合されていない
- **影響範囲**: synthesize API、TTSSection UI、ユーザー体験
- **解決目標**: 500文字分割→WAV結合→MP3変換→ダウンロード機能の実装

## 2. 全体設計

### アーキテクチャ決定
FCIS+SMACアーキテクチャに従い、Core/State/Shell層で責務を分離。音声ダウンロード機能は垂直分割で実装。

### 共通契約仕様
```typescript
// テキストチャンク
export interface AudioChunk {
  index: number;
  text: string;
  totalChunks: number;
}

// ダウンロード用メタデータ
export interface AudioMetadata {
  fileName: string;
  format: 'mp3';
  speakerName: 'zundamon' | 'metan';
  timestamp: number;
}

// Core層のエクスポート契約
export interface AudioCoreContract {
  splitTextIntoChunks: (text: string, maxLength?: number) => AudioChunk[];
  generateFileName: (speakerId: number, timestamp?: number) => string;
  validateAudioFormat: (format: string) => boolean;
  calculateTotalChunks: (textLength: number, chunkSize?: number) => number;
  getSpeakerName: (speakerId: number) => 'zundamon' | 'metan';
}
```

### タスク間依存関係
- 依存元: なし（新規Core層）
- 依存先: セッションB（API層）、セッションC（UI層）

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Core層
- **機能**: 音声ダウンロード用の純粋関数群
- **スコープ**: テキスト分割、ファイル名生成、バリデーション、ユーティリティ

### 編集対象ファイル（排他的アクセス）
- `core/audio.core.ts` - 新規作成（メイン実装）
- `core/audio.core.test.ts` - 新規作成（単体テスト）

### 入出力契約
**入力仕様**:
```typescript
// splitTextIntoChunks
type Input = {
  text: string; // 1～30000文字
  maxLength?: number; // デフォルト500
}

// generateFileName
type Input = {
  speakerId: number; // 2 or 3
  timestamp?: number; // デフォルトDate.now()
}
```

**出力仕様**:
```typescript
// splitTextIntoChunks
type Output = AudioChunk[]
// 例: [{index: 0, text: "最初の500文字...", totalChunks: 3}, ...]

// generateFileName
type Output = string
// 例: "zundamon_1234567890.mp3"
```

### 制約事項
- 純粋関数のみ（副作用完全禁止）
- Date.now()は引数として受け取る（直接呼び出さない）
- console.log禁止
- 外部ライブラリ依存禁止

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Core層実装の場合
- [ ] 純粋関数のみ（副作用完全排除）
- [ ] No fetch, setState, console.log
- [ ] 決定論的（同じ入力→同じ出力）
- [ ] 100%ユニットテスト可能
- [ ] 不変データ操作のみ

## 5. 実行ステップ

### ステップ1: 詳細実装計画（15分）
```
□ 500文字分割アルゴリズムの設計
□ 日本語文字境界の考慮（文の途中で切らない工夫）
□ エッジケース洗い出し（0文字、500文字ちょうど、30000文字）
□ テストケース設計
```

### ステップ2: 実装（45分）
```typescript
// core/audio.core.ts の実装例
export function splitTextIntoChunks(text: string, maxLength = 500): AudioChunk[] {
  // 実装: 500文字ごとに分割
  // 句読点での区切りを優先（オプション）
}

export function generateFileName(speakerId: number, timestamp = Date.now()): string {
  // 実装: speakerName_timestamp.mp3 形式
}

export function getSpeakerName(speakerId: number): 'zundamon' | 'metan' {
  // 実装: 2 → 'metan', 3 → 'zundamon'
}

export function validateAudioFormat(format: string): boolean {
  // 実装: 'mp3' のみ true
}

export function calculateTotalChunks(textLength: number, chunkSize = 500): number {
  // 実装: Math.ceil(textLength / chunkSize)
}
```

### ステップ3: 検証（15分）
```bash
# 必須実行コマンド
npm run build      # ビルドエラーチェック
npm run typecheck  # 型エラーチェック
npm test core/audio.core.test.ts  # 単体テスト実行
```

## 6. 完了基準

### 必須項目
- [ ] ビルド成功（エラー: 0）
- [ ] TypeScript型チェック完全通過
- [ ] 単体テストカバレッジ100%
- [ ] 全エッジケースのテスト通過

### 品質項目
- [ ] 500文字分割が正確
- [ ] ファイル名形式が正しい
- [ ] 純粋関数として実装
- [ ] 他セッションが使いやすいAPI

## 7. トラブルシューティングガイド

### よくある問題と解決策

**文字数カウントの問題**
- 問題: 絵文字・サロゲートペアの扱い
- 解決: Array.from(text).length を使用

**分割位置の問題**
- 問題: 文の途中で分割される
- 解決: 句読点位置を考慮（ベストエフォート）

## 8. 参考資料
- FCIS+SMAC仕様: `/docs/state/ai-architecture-knowledge-fcis-smac.json`
- 仕様書: `/tsd-107-spec/specification.md`（500文字分割の記載）

---
**実装開始**: 上記指示に従ってCore層の実装を開始してください。
**完了後**: 他セッションが使用できる契約を提供してください。