# セッションB用指示書 - 音声ダウンロード機能API層実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js, React 18, TypeScript, VOICEVOX API
- **開発環境**: Windows, Node.js, Docker（ffmpeg組み込み済み）

### 問題背景
- **現象**: 仕様書にMP3ダウンロードと記載があるが、実際はWAV形式でダウンロードされている
- **根本原因**: MP3変換処理が未実装、500文字分割処理が統合されていない
- **影響範囲**: synthesize API、TTSSection UI、ユーザー体験
- **解決目標**: 500文字分割→WAV結合→MP3変換→ダウンロード機能の実装

## 2. 全体設計

### アーキテクチャ決定
既存の`AudioProcessor`クラス（`lib/audio-processor.ts`）を活用し、synthesize APIでWAV結合とMP3変換を実装。

### 共通契約仕様
```typescript
// セッションAから提供される契約
interface AudioChunk {
  index: number;
  text: string;
  totalChunks: number;
}

// API Request/Response契約
interface SynthesizeRequest {
  text: string;
  speakerId: number;
  config?: {
    speedScale?: number;
    pitchScale?: number;
    intonationScale?: number;
    volumeScale?: number;
  };
}

interface SynthesizeResponse {
  audio: string;      // Base64 encoded MP3
  format: 'mp3';      // 固定値
  fileName: string;   // 例: "zundamon_1234567890.mp3"
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
}
```

### タスク間依存関係
- 依存元: セッションA（Core層のsplitTextIntoChunks関数）
- 依存先: セッションC（UI層）
- 既存利用: `lib/audio-processor.ts`（変更不要）

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: API層（Shell層の一部）
- **機能**: VOICEVOXとの通信、WAV結合、MP3変換
- **スコープ**: synthesize APIの改修

### 編集対象ファイル（排他的アクセス）
- `app/api/synthesize/route.ts` - 主要改修対象
- `app/api/synthesize/audio-synthesis.ts` - 新規作成（処理分離用、オプション）

### 入出力契約
**入力仕様**:
```typescript
// HTTP POST /api/synthesize
type Input = {
  text: string;        // 1～30000文字
  speakerId: number;   // 2 or 3
  config?: {...}       // 音声パラメータ（オプション）
}
```

**出力仕様**:
```typescript
// HTTP Response
type Output = {
  audio: string;       // Base64 encoded MP3
  format: 'mp3';
  fileName: string;    // "zundamon_1234567890.mp3"
}
// Content-Type: application/json
// Status: 200 (成功) / 400,502,503 (エラー)
```

### 制約事項
- 既存の`AudioProcessor`クラスをそのまま活用
- VOICEVOXとの接続設定を維持（IPv4強制等）
- タイムアウト: 短文60秒、長文20分（1200秒）
- メモリ効率を考慮（30000文字=60チャンク）

## 4. 実装ガイドライン

### Shell層実装チェックリスト
- [ ] 薄いIO層として実装
- [ ] Core層の関数を活用
- [ ] 適切なエラーハンドリング
- [ ] 非同期処理の適切な管理
- [ ] ログ出力（デバッグ用）

## 5. 実行ステップ

### ステップ1: 詳細実装計画（15分）
```
□ Core層のimport方法確認
□ AudioProcessorの使用方法確認
□ チャンク並列処理の設計（3-5個ずつ）
□ エラーハンドリング戦略
```

### ステップ2: 実装（45分）
```typescript
// app/api/synthesize/route.ts の実装概要

import { audioProcessor } from '@/lib/audio-processor';
// import { splitTextIntoChunks, generateFileName } from '@/core/audio.core';

export async function POST(request: NextRequest) {
  // 1. リクエスト検証
  const body = await request.json();

  // 2. テキストを500文字チャンクに分割
  const chunks = splitTextIntoChunks(body.text);

  // 3. 各チャンクをVOICEVOXで音声生成（並列処理）
  const wavBuffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    // VOICEVOXへのリクエスト
    // audio_query → synthesis
    // wavBuffers.push(audioBuffer);
  }

  // 4. WAVファイルを結合
  const mergedWav = await audioProcessor.mergeWavFiles(wavBuffers);

  // 5. MP3に変換
  const mp3Buffer = await audioProcessor.convertToMp3(mergedWav, {
    bitrate: 128,
    channels: 1,
    frequency: 22050
  });

  // 6. Base64エンコードしてレスポンス
  const audioBase64 = Buffer.from(mp3Buffer).toString('base64');
  const fileName = generateFileName(body.speakerId);

  return NextResponse.json({
    audio: audioBase64,
    format: 'mp3',
    fileName
  });
}
```

### ステップ3: 検証（15分）
```bash
# 必須実行コマンド
npm run build      # ビルドエラーチェック
npm run typecheck  # 型エラーチェック

# API動作テスト
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"テスト", "speakerId":3}'

# 長文テスト（500文字以上）
# MP3ファイルが正しく生成されることを確認
```

## 6. 完了基準

### 必須項目
- [ ] ビルド成功（エラー: 0）
- [ ] TypeScript型チェック完全通過
- [ ] 500文字以上でチャンク分割動作
- [ ] MP3ファイルが生成される
- [ ] Base64エンコードが正しい

### 品質項目
- [ ] パフォーマンス（30000文字で20分以内）
- [ ] メモリ使用量が適切
- [ ] エラーハンドリング完備
- [ ] ログ出力が適切

## 7. トラブルシューティングガイド

### よくある問題と解決策

**ffmpeg関連エラー**
- 問題: ffmpegが見つからない
- 解決: Docker環境確認、FFMPEG_PATH環境変数

**メモリ不足**
- 問題: 大量チャンクでメモリエラー
- 解決: チャンクを3-5個ずつ並列処理

**VOICEVOX接続エラー**
- 問題: CONNECTION_ERROR
- 解決: IPv4強制設定を維持、リトライ機構

**タイムアウト**
- 問題: 20分超過
- 解決: チャンク並列度を上げる

## 8. 参考資料
- AudioProcessor実装: `/lib/audio-processor.ts`
- 既存synthesize実装: `/app/api/synthesize/route.ts`（現在のコード）
- synthesize-chunk参考: `/app/api/synthesize-chunk/route.ts`
- 仕様書: `/tsd-107-spec/specification.md`

---
**実装開始**: 上記指示に従ってAPI層の実装を開始してください。
**注意**: セッションAのCore層関数が未完成の場合は、仮実装で進めてください。
**完了後**: MP3ファイルが正しくダウンロードできることを確認してください。