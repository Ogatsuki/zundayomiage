# Session B: API層とVOICEVOX統合の拡張

## 目標
APIルートを拡張し、30,000文字対応、チャンク処理、四国めたん対応を実装

## 実装タスク

### 1. APIルート拡張 (`/app/api/synthesize/route.ts`)
- 30,000文字制限へのバリデーション更新
- 四国めたん（Speaker ID: 2）サポート追加
- チャンク単位での音声合成処理
- 長文用タイムアウト設定（20分）

### 2. チャンク処理エンドポイント (`/app/api/synthesize-chunk/route.ts`)
```typescript
// 新規作成
export async function POST(request: NextRequest) {
  const { text, speakerId, chunkIndex, totalChunks } = await request.json();

  // VOICEVOXへのチャンク単位リクエスト
  // 500文字チャンクの個別処理
  // WAVデータをBase64で返却
}
```

### 3. VOICEVOX接続改善 (`/lib/voicevox-client.ts`)
```typescript
// 新規作成
export class VoicevoxClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = 'http://localhost:50021', timeout = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async healthCheck(): Promise<boolean>;
  async getAudioQuery(text: string, speakerId: number): Promise<AudioQuery>;
  async synthesize(query: AudioQuery, speakerId: number): Promise<ArrayBuffer>;
  async synthesizeWithRetry(text: string, speakerId: number, maxRetries = 3): Promise<ArrayBuffer>;
}
```

### 4. エラーハンドリング強化
- タイムアウトエラーの詳細化
- リトライロジックの実装
- エラーコードの標準化

## 完了条件
- APIが30,000文字を受け付ける
- 四国めたん（ID:2）での音声合成が可能
- チャンク処理が正しく動作
- エラーハンドリングが適切