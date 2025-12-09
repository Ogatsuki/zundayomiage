# 音声ダウンロード機能実装 - タスク指示書

## 背景と現状分析

### 現状の問題点
1. **仕様と実装の不整合**
   - 仕様書: MP3形式でのダウンロードと記載
   - 実際: WAV形式でのダウンロード（.wavファイル）
   - audioタグでの再生機能も存在（不要）

2. **既存インフラ**
   - `AudioProcessor`クラス実装済み（`lib/audio-processor.ts`）
   - ffmpeg-fluent組み込み済み
   - `synthesize-chunk` APIで500文字分割処理の骨組みあり
   - ただし、これらが統合されていない

3. **UI上の問題**
   - audioタグが表示されているが仕様外
   - ダウンロードリンクが条件付き表示で見つけにくい

## 実装要件

### 必須要件
1. **500文字分割処理**
   - 500文字以上のテキストは500文字ごとにチャンク分割
   - 各チャンクを個別にVOICEVOXで音声生成
   - 全チャンクのWAVを結合

2. **MP3変換**
   - 結合したWAVをMP3に変換
   - ビットレート: 128kbps
   - チャンネル: モノラル
   - サンプリング周波数: 22050Hz

3. **UI変更**
   - audioタグ（再生機能）を削除
   - ダウンロードボタンを常に表示（音声生成後）
   - ファイル名: `{話者名}_{タイムスタンプ}.mp3`

### 非機能要件
- FCIS+SMACアーキテクチャ準拠
- エラーハンドリング強化
- プログレス表示（処理状況の可視化）

## 実装アーキテクチャ（FCIS+SMAC）

### Core Layer（純粋関数）
```typescript
// core/audio.core.ts（新規作成）
- splitTextIntoChunks(text: string, maxLength: number = 500): string[]
- validateAudioFormat(format: string): boolean
- generateFileName(speakerId: number, timestamp: number): string
- calculateTotalChunks(textLength: number, chunkSize: number): number
```

### State Layer（状態管理）
```typescript
// state/app.machine.ts（既存を修正）
状態遷移:
idle → tts_preparing → tts_chunking → tts_merging → tts_converting → tts_ready
                     ↘ tts_error ↗
```

### Shell Layer（IO処理）

#### バックエンド修正
```typescript
// app/api/synthesize/route.ts
1. テキストを500文字チャンクに分割
2. 各チャンクをVOICEVOXで音声生成
3. AudioProcessorで全WAVを結合
4. MP3に変換
5. Base64エンコードして返す
```

#### フロントエンド修正
```typescript
// shell/TTSSection.tsx
1. audioタグを削除
2. ダウンロードボタンを常に表示
3. MP3形式でBlob生成
4. プログレス表示追加
```

## 実装手順

### Phase 1: Core Layer実装
1. `core/audio.core.ts`を新規作成
2. テキスト分割ロジックを実装
3. ファイル名生成等のユーティリティ実装
4. 単体テストを作成

### Phase 2: API修正
1. `synthesize/route.ts`を修正
   - テキスト分割処理追加
   - AudioProcessorによるWAV結合
   - MP3変換処理
2. レスポンス形式をMP3に変更
3. エラーハンドリング強化

### Phase 3: State Machine更新
1. `app.machine.ts`に新しい状態を追加
   - tts_chunking: チャンク処理中
   - tts_merging: WAV結合中
   - tts_converting: MP3変換中
2. プログレス情報をcontextに追加

### Phase 4: UI修正
1. `TTSSection.tsx`から再生機能を削除
2. ダウンロードボタンのUI改善
3. プログレス表示コンポーネント追加
4. `useAppMachine.tsx`でMP3 Blob処理

### Phase 5: テストと検証
1. 各種文字数でのテスト（499文字、500文字、501文字、30000文字）
2. 話者切り替えテスト
3. エラーケーステスト
4. ファイルサイズとクオリティ確認

## ファイル変更リスト

### 新規作成
- `core/audio.core.ts`
- `core/audio.core.test.ts`

### 修正必要
- `app/api/synthesize/route.ts`（主要変更）
- `state/app.machine.ts`（状態追加）
- `shell/TTSSection.tsx`（UI変更）
- `shell/useAppMachine.tsx`（Blob処理）
- `core/ui.core.ts`（UI状態導出）

### 削除不要（既存活用）
- `lib/audio-processor.ts`（そのまま使用）
- `app/api/synthesize-chunk/route.ts`（参考実装）

## 実装上の注意点

1. **パフォーマンス**
   - 30000文字の場合、60チャンクになる
   - 並列処理を検討（3-5チャンクずつ）
   - メモリ使用量に注意

2. **エラーハンドリング**
   - 個別チャンクの失敗時のリトライ
   - 部分的な成功の扱い
   - タイムアウト設定（20分）

3. **互換性**
   - 既存のVOICEVOX接続ロジックを維持
   - IPv4強制設定を保持
   - Docker環境での動作確認

## 成功基準

1. 500文字以上のテキストが正しく分割・結合される
2. MP3ファイルがダウンロードできる
3. audioタグが表示されない
4. プログレス表示が機能する
5. エラー時の適切なフィードバック

## 参考資料
- 仕様書: `tsd-107-spec/specification.md`
- 競合分析: `tsd-107-spec/competitor-analysis.md`
- FCIS+SMAC: `docs/state/ai-architecture-knowledge-fcis-smac.json`
- 既存実装: `lib/audio-processor.ts`