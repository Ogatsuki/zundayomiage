# TSD-107 VOICEVOX接続・メモリ管理問題の実装計画

## 作成日: 2025-09-23
## 作成者: Claude Code
## ステータス: 計画段階

---

## 1. 問題の概要と根本原因

### 問題1: VOICEVOX接続エラー
**症状**: 「VOICEVOXエンジンに接続できません」エラーが発生

**根本原因**:
- voicevox-client.tsが`/audio_query`エンドポイントにGETメソッドでテキストを送信
- URLパラメータに長文テキスト全体がエンコードされて含まれる（68,000文字以上）
- HTTPプロトコルのURL長制限（約8KB）を大幅に超過
- VOICEVOXエンジンが「Invalid HTTP request received」で拒否

### 問題2: メモリ・データ蓄積
**症状**: 音声生成データがボリュームに蓄積し続ける

**根本原因**:
- ブラウザ側: VoiceGenerator.tsxのstateにaudioBlobが保持され続ける
- サーバー側: 大量データ処理時のメモリ使用量増大
- 一時ファイル: エラー時のクリーンアップ失敗の可能性

---

## 2. 実装計画（3フェーズアプローチ）

### Phase 1: 緊急対応 - HTTPメソッド修正（優先度: 最高）

#### 目的
VOICEVOXエンジンへの接続エラーを即座に解消

#### 実装内容

**1. voicevox-client.ts の修正**
```typescript
// 現在の問題のあるコード
async getAudioQuery(text: string, speaker: number): Promise<AudioQuery> {
  const response = await this.client.post<AudioQuery>(
    '/audio_query',
    null,  // ← 問題: bodyがnullでパラメータで送信
    {
      params: { text, speaker }
    }
  )
}

// 修正後のコード
async getAudioQuery(text: string, speaker: number): Promise<AudioQuery> {
  const response = await this.client.post<AudioQuery>(
    `/audio_query?speaker=${speaker}`,  // speakerのみURL
    { text },  // textはbodyで送信
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
```

**2. synthesis メソッドも同様に修正**
- POSTボディでAudioQueryオブジェクトを適切に送信
- Content-Typeヘッダーの明示的設定

#### 期待効果
- 長文テキスト（10,000文字以上）でも正常に処理可能
- HTTPリクエストサイズ制限エラーの解消

---

### Phase 2: メモリ管理改善（優先度: 高）

#### 目的
メモリリークを防止し、システムの安定性向上

#### 実装内容

**1. ブラウザ側メモリ管理（VoiceGenerator.tsx）**
```typescript
// 新規: Blob解放ユーティリティ
const releasePreviousAudio = (blob: Blob | null) => {
  if (blob) {
    // 既存のBlob URLを解放
    const urls = performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('blob:'))
    urls.forEach(url => URL.revokeObjectURL(url.name))
  }
}

// generateVoice関数内で実装
const generateVoice = async () => {
  // 新しい音声生成前に前のBlobを解放
  releasePreviousAudio(audioBlob)

  // ... 音声生成処理 ...
}

// コンポーネントアンマウント時のクリーンアップ
useEffect(() => {
  return () => {
    releasePreviousAudio(audioBlob)
  }
}, [])
```

**2. AudioPlayer.tsx の改善**
```typescript
// 音声再生完了時の自動解放オプション追加
interface AudioPlayerProps {
  audioBlob: Blob | null
  autoRelease?: boolean  // 新規: 再生完了後の自動解放
}

// 再生完了時の処理
const handleEnded = () => {
  if (autoRelease && audioUrl) {
    URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
  }
}
```

**3. サーバー側メモリ管理（lib/memory-manager.ts）**
```typescript
// 新規ファイル作成
export class MemoryManager {
  private static readonly MEMORY_THRESHOLD = 500 * 1024 * 1024 // 500MB

  static checkMemoryUsage(): MemoryStatus {
    const usage = process.memoryUsage()
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      isHighUsage: usage.heapUsed > this.MEMORY_THRESHOLD
    }
  }

  static forceGarbageCollection() {
    if (global.gc) {
      global.gc()
      console.log('Manual garbage collection triggered')
    }
  }
}
```

**4. 一時ファイル管理の改善（audio-merger.ts）**
```typescript
// 改善: try-finallyの確実性向上
export async function mergeWavToMp3(wavBuffers: ArrayBuffer[]): Promise<Buffer> {
  const tempFiles: string[] = []
  let cleanupTimer: NodeJS.Timeout | null = null

  try {
    // 既存の処理...

    // 新規: タイムアウト後の自動クリーンアップ
    cleanupTimer = setTimeout(() => {
      cleanupTempFiles(tempFiles)
    }, 60000) // 60秒後に自動削除

  } finally {
    if (cleanupTimer) clearTimeout(cleanupTimer)
    await cleanupTempFiles(tempFiles)
  }
}

// 新規: 確実なクリーンアップ関数
async function cleanupTempFiles(files: string[]): Promise<void> {
  const results = await Promise.allSettled(
    files.map(file => fs.unlink(file))
  )

  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    console.error(`Failed to cleanup ${failures.length} temp files`)
  }
}
```

---

### Phase 3: 監視・最適化（優先度: 中）

#### 目的
システムの健全性監視と長期的な安定性確保

#### 実装内容

**1. ヘルスチェックエンドポイントの拡張**
```typescript
// app/api/health/route.ts の改善
export async function GET() {
  const memoryStatus = MemoryManager.checkMemoryUsage()
  const tempDirStatus = await checkTempDirectory()

  return NextResponse.json({
    status: 'healthy',
    memory: memoryStatus,
    tempFiles: tempDirStatus,
    voicevoxConnection: await voicevoxClient.checkHealth(),
    timestamp: new Date().toISOString()
  })
}
```

**2. 定期クリーンアップジョブ**
```typescript
// lib/scheduled-cleanup.ts
export class ScheduledCleanup {
  private static interval: NodeJS.Timeout | null = null

  static start() {
    this.interval = setInterval(async () => {
      // 1時間ごとに実行
      await this.performCleanup()
    }, 3600000)
  }

  private static async performCleanup() {
    // 古い一時ファイルの削除
    const tempDir = os.tmpdir()
    const files = await fs.readdir(tempDir)
    const oldFiles = files.filter(f =>
      f.includes('temp_chunk_') ||
      f.includes('concat_list_')
    )

    for (const file of oldFiles) {
      const filepath = path.join(tempDir, file)
      const stats = await fs.stat(filepath)
      const ageInMs = Date.now() - stats.mtime.getTime()

      if (ageInMs > 3600000) { // 1時間以上古い
        await fs.unlink(filepath).catch(() => {})
      }
    }
  }
}
```

**3. ログ強化**
```typescript
// lib/logger.ts
export class AppLogger {
  static logVoiceGeneration(params: {
    textLength: number
    speaker: number
    duration: number
    memoryBefore: number
    memoryAfter: number
  }) {
    console.log(JSON.stringify({
      event: 'voice_generation',
      ...params,
      timestamp: new Date().toISOString()
    }))
  }
}
```

---

## 3. テスト戦略

### 単体テスト
1. voicevox-client.ts のPOSTメソッド動作確認
2. memory-manager.ts のメモリ監視機能
3. audio-merger.ts の一時ファイルクリーンアップ

### 統合テスト
1. 10,000文字以上のテキスト処理
2. 連続音声生成時のメモリ使用量推移
3. エラー発生時のリカバリ処理

### 負荷テスト
```javascript
// test-concurrent-requests.js
const testConcurrentRequests = async () => {
  const requests = []
  for (let i = 0; i < 10; i++) {
    requests.push(
      fetch('/api/voicevox/generate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'テスト'.repeat(5000),
          speaker: 3
        })
      })
    )
  }

  const results = await Promise.allSettled(requests)
  console.log(`Success: ${results.filter(r => r.status === 'fulfilled').length}/10`)
}
```

### ブラウザメモリプロファイリング
1. Chrome DevTools → Memory → Heap Snapshot
2. 音声生成前後でスナップショット比較
3. Detached DOM要素やBlobの確認

---

## 4. リリース計画

### Phase 1（即時対応）
- **期間**: 1日
- **内容**: HTTPメソッド修正
- **リスク**: 低
- **効果**: 接続エラー即座解消

### Phase 2（1週間以内）
- **期間**: 3-4日
- **内容**: メモリ管理改善
- **リスク**: 中
- **効果**: メモリリーク防止、安定性向上

### Phase 3（2週間以内）
- **期間**: 2-3日
- **内容**: 監視・最適化
- **リスク**: 低
- **効果**: 長期安定性確保

---

## 5. 成功指標

### Phase 1
- [ ] 10,000文字以上のテキスト処理成功率 100%
- [ ] VOICEVOX接続エラー発生件数 0

### Phase 2
- [ ] 連続10回音声生成後のメモリ増加率 < 10%
- [ ] 一時ファイル残留数 0

### Phase 3
- [ ] 24時間連続稼働でのメモリ使用量安定
- [ ] ヘルスチェックエンドポイントの可用性 99.9%

---

## 6. 注意事項

### Docker環境の考慮
- os.tmpdir()の環境依存性に注意
- コンテナ再起動時の一時ファイル自動削除を活用

### 後方互換性
- APIエンドポイントのインターフェース変更なし
- クライアント側のコード変更は最小限

### セキュリティ
- 一時ファイルの権限設定適切化
- メモリダンプに機密情報が含まれないよう注意

---

## 7. 参考資料

- [VOICEVOX API仕様書](https://voicevox.github.io/voicevox_engine/api/)
- [Node.js メモリ管理ベストプラクティス](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Web Audio API - Blob管理](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)

---

## 8. 更新履歴

| 日付 | 内容 | 作成者 |
|------|------|--------|
| 2025-09-23 | 初版作成 | Claude Code |