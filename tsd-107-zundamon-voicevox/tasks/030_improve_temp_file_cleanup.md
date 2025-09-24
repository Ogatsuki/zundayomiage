# タスク詳細（What）:
- audio-merger.tsの一時ファイルクリーンアップ処理を改善
- エラー時でも確実に一時ファイルが削除される仕組みを構築
- Promise.allSettledを使用した確実なクリーンアップ実装

## 理由・背景(Why)
- 現在の実装ではエラー時に一時ファイルが残留する可能性がある
- Dockerコンテナの/tmpディレクトリに不要ファイルが蓄積
- ディスク容量を圧迫し、システムの安定性に影響
- MVPとして基本的なリソース管理は必須

## 実装方法(How)
### 1. クリーンアップ専用関数の作成
```typescript
// 確実なクリーンアップを行う関数
async function cleanupTempFiles(files: string[]): Promise<CleanupResult> {
  if (files.length === 0) {
    return { success: [], failed: [], totalDeleted: 0 }
  }

  // Promise.allSettledで全ファイル削除を試行
  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        await fs.unlink(file)
        return { file, success: true }
      } catch (error) {
        return { file, success: false, error }
      }
    })
  )

  // 結果を集計
  const success = results
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => (r as PromiseFulfilledResult<any>).value.file)

  const failed = results
    .filter(r => r.status === 'fulfilled' && !r.value.success)
    .map(r => (r as PromiseFulfilledResult<any>).value)

  return {
    success,
    failed,
    totalDeleted: success.length
  }
}
```

### 2. mergeWavToMp3関数の改善
```typescript
export async function mergeWavToMp3(wavBuffers: ArrayBuffer[]): Promise<Buffer> {
  const tempFiles: string[] = []
  const tempDir = os.tmpdir()
  let cleanupTimer: NodeJS.Timeout | null = null

  // ユニークな一時ファイル名生成
  const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const listFile = path.join(tempDir, `concat_list_${sessionId}.txt`)
  const outputFile = path.join(tempDir, `merged_output_${sessionId}.mp3`)

  try {
    // 既存の処理...

    // 自動クリーンアップタイマー設定（60秒後）
    cleanupTimer = setTimeout(async () => {
      console.warn(`Auto cleanup triggered for session ${sessionId}`)
      await cleanupTempFiles([...tempFiles, listFile, outputFile])
    }, 60000)

    // 処理実行...

    return mp3Buffer

  } catch (error) {
    // エラー時の詳細ログ
    console.error('Audio merging failed:', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      tempFiles: tempFiles.length,
      tempDir
    })

    throw new Error(`Failed to merge audio files: ${error instanceof Error ? error.message : 'Unknown error'}`)

  } finally {
    // タイマーをクリア
    if (cleanupTimer) {
      clearTimeout(cleanupTimer)
    }

    // 確実なクリーンアップ実行
    const allFiles = [...tempFiles, listFile, outputFile]
    const cleanupResult = await cleanupTempFiles(allFiles)

    if (cleanupResult.failed.length > 0) {
      console.warn('Some temp files could not be deleted:', {
        sessionId,
        failed: cleanupResult.failed.length,
        total: allFiles.length
      })
    }

    // 開発環境では詳細ログ
    if (process.env.NODE_ENV === 'development') {
      console.log('Cleanup completed:', {
        sessionId,
        deleted: cleanupResult.totalDeleted,
        failed: cleanupResult.failed.length
      })
    }
  }
}
```

### 3. 起動時の古いファイルクリーンアップ
```typescript
// アプリケーション起動時に古い一時ファイルを削除
export async function cleanupOldTempFiles(maxAgeMs: number = 3600000): Promise<void> {
  const tempDir = os.tmpdir()

  try {
    const files = await fs.readdir(tempDir)
    const patterns = ['temp_chunk_', 'concat_list_', 'merged_output_', 'single_']

    const oldFiles = []
    for (const file of files) {
      // パターンマッチング
      if (!patterns.some(p => file.includes(p))) continue

      const filepath = path.join(tempDir, file)
      try {
        const stats = await fs.stat(filepath)
        const ageMs = Date.now() - stats.mtime.getTime()

        if (ageMs > maxAgeMs) {
          oldFiles.push(filepath)
        }
      } catch {
        // statエラーは無視
      }
    }

    if (oldFiles.length > 0) {
      const result = await cleanupTempFiles(oldFiles)
      console.log(`Cleaned up ${result.totalDeleted} old temp files`)
    }
  } catch (error) {
    console.error('Failed to cleanup old temp files:', error)
  }
}
```

### 4. 型定義
```typescript
interface CleanupResult {
  success: string[]
  failed: Array<{
    file: string
    error: any
  }>
  totalDeleted: number
}
```

## 実装場所(Where)
- `/lib/audio-merger.ts`
  - cleanupTempFiles関数の追加
  - mergeWavToMp3関数の改善
  - convertSingleWavToMp3関数の改善
  - cleanupOldTempFiles関数の追加
  - 型定義の追加

## 制約
- Node.js標準APIのみ使用（fs.promises推奨）
- エラーでプロセスを停止させない（エラーハンドリング必須）
- ログは構造化（オブジェクト形式）で出力
- 一時ファイル名にはタイムスタンプとランダム文字列を含める（衝突防止）
- Docker環境とローカル環境の両方で動作すること

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- エラー時でも一時ファイルが削除されるか（必須）
- Promise.allSettledを適切に使用しているか（必須）
- ログ出力が適切で問題特定に役立つか
- パフォーマンスへの影響が最小限か

## 参考情報
### 一時ディレクトリ
```javascript
os.tmpdir()
// Linux/Mac: /tmp
// Windows: C:\Users\{user}\AppData\Local\Temp
// Docker: /tmp (コンテナ内)
```

### Promise.allSettled
```javascript
const results = await Promise.allSettled([promise1, promise2, promise3])
// 全てのPromiseが完了するまで待機
// 個別のPromiseが失敗してもエラーにならない
```

## Worker記述欄 実装報告等記入欄
### 実装内容
1. **cleanupTempFiles関数の作成**
   - Promise.allSettledを使用して全ファイル削除を試行
   - 個別のファイル削除失敗がプロセス全体を止めない設計
   - CleanupResult型で成功/失敗を詳細に記録

2. **mergeWavToMp3関数の改善**
   - ユニークなsessionIdを生成（タイムスタンプ+ランダム文字列）
   - 60秒後の自動クリーンアップタイマーを設定
   - finallyブロックでPromise.allSettledによる確実なクリーンアップ
   - エラー時も含めて必ず実行される設計
   - 開発環境での詳細ログ出力

3. **convertSingleWavToMp3関数の改善**
   - 同様のsessionId生成とタイマー機構
   - finallyブロックでの確実なクリーンアップ
   - 構造化されたエラーログ

4. **cleanupOldTempFiles関数の追加**
   - アプリケーション起動時の古いファイル削除機能
   - 1時間以上経過したファイルを自動削除
   - パターンマッチングで対象ファイルを特定

5. **型定義の追加**
   - CleanupResult型を定義（success, failed, totalDeleted）

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- **Yes** - 全ての評価基準を満たしています
  - ✅ 指示に過不足なく実装完了
  - ✅ MVPとしてバランスのとれた実装
  - ✅ エラー時でも一時ファイルが削除される（finallyブロック使用）
  - ✅ Promise.allSettledを適切に使用
  - ✅ ログ出力が適切で問題特定に役立つ（構造化ログ）
  - ✅ パフォーマンスへの影響が最小限（非同期処理）

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示

### 評価結果
- 指示への適合度: 5/5 - 仕様通り実装完了
- MVPとしての適切性: 5/5 - 必要十分な機能を実装
- エラー時のファイル削除: 5/5 - finallyブロックで確実に実行
- Promise.allSettled使用: 5/5 - 適切に活用
- ログ出力: 5/5 - 構造化ログで問題特定が容易
- パフォーマンス影響: 5/5 - 非同期処理で影響最小限

### 総合評価: 5/5

Workerは完璧な実装を行いました。Promise.allSettledを活用した確実なクリーンアップ機構、60秒タイマーによる安全策、sessionIdによる追跡可能性など、全て高品質な実装です。