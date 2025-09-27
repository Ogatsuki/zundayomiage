# Session C: ffmpeg統合とOCRバックエンド実装

## 目標
WAV結合、MP3変換、OCRバックエンド処理を実装

## 実装タスク

### 1. ffmpeg統合 (`/lib/audio-processor.ts`)
```typescript
// 新規作成
import ffmpeg from 'fluent-ffmpeg';

export class AudioProcessor {
  // WAVファイル結合
  async mergeWavFiles(wavBuffers: ArrayBuffer[]): Promise<ArrayBuffer> {
    // 複数のWAVファイルを1つに結合
    // ffmpeg -i "concat:file1.wav|file2.wav|..." -acodec copy output.wav
  }

  // MP3変換
  async convertToMp3(wavBuffer: ArrayBuffer, options?: {
    bitrate?: number;    // default: 128
    channels?: number;   // default: 1 (mono)
    frequency?: number;  // default: 22050
  }): Promise<ArrayBuffer> {
    // WAVからMP3への変換
    // ffmpeg -i input.wav -acodec libmp3lame -ab 128k -ac 1 -ar 22050 output.mp3
  }

  // ファイル名生成
  generateFileName(speakerId: number): string {
    const speakerName = speakerId === 2 ? 'metan' : 'zundamon';
    const timestamp = Date.now();
    return `${speakerName}_${timestamp}.mp3`;
  }
}
```

### 2. OCRバックエンド処理 (`/app/api/ocr/route.ts`)
```typescript
// 新規作成
import Tesseract from 'tesseract.js';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('image') as File;

  // ファイルサイズチェック（5MB）
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // OCR処理
  const worker = await Tesseract.createWorker('jpn');
  const result = await worker.recognize(file);

  // テキスト正規化
  const normalizedText = normalizeOCRText(result.data.text);

  await worker.terminate();

  return NextResponse.json({
    text: result.data.text,
    normalizedText,
    confidence: result.data.confidence
  });
}
```

### 3. Dockerfile更新 (`/Dockerfile`)
```dockerfile
# ffmpeg追加
RUN apk add --no-cache ffmpeg

# Tesseract.js用の設定
ENV TESSDATA_PREFIX=/usr/share/tessdata
```

### 4. package.json依存関係追加
```json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.3",
    "tesseract.js": "^5.0.0"
  }
}
```

### 5. 環境変数設定 (`.env`)
```
# ffmpeg設定
FFMPEG_PATH=/usr/bin/ffmpeg

# OCR設定
MAX_FILE_SIZE_MB=5
OCR_LANGUAGE=jpn

# 音声設定
MP3_BITRATE=128
MP3_CHANNELS=1
MP3_FREQUENCY=22050
```

## 完了条件
- WAVファイルの結合が可能
- MP3変換が正常動作
- OCR処理がサーバーサイドで実行
- Dockerイメージにffmpegが含まれる
- 環境変数が適切に設定