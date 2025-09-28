# セッションC用指示書 - 音声ダウンロード機能UI/State層実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js, React 18, TypeScript, XState, Tailwind CSS
- **開発環境**: Windows, Node.js

### 問題背景
- **現象**: audioタグが表示されているが仕様外、ダウンロードリンクが見つけにくい
- **根本原因**: 再生機能は不要、ダウンロード専用UIが未実装
- **影響範囲**: TTSSection、useAppMachine、app.machine、ui.core
- **解決目標**: audioタグ削除、ダウンロードボタン常時表示、プログレス表示追加

## 2. 全体設計

### アーキテクチャ決定
XStateの状態管理を拡張し、チャンク処理のプログレスを追跡。UIはダウンロード専用に最適化。

### 共通契約仕様
```typescript
// APIレスポンス（セッションBから）
interface SynthesizeResponse {
  audio: string;      // Base64 encoded MP3
  format: 'mp3';
  fileName: string;   // "zundamon_1234567890.mp3"
}

// State Machine Context拡張
interface AppMachineContext {
  // 既存
  ocrText?: string;
  audioUrl?: string;
  error?: string;

  // 新規追加
  audioFileName?: string;
  audioFormat?: 'mp3';
  synthesisProgress?: {
    current: number;    // 現在のチャンク
    total: number;      // 総チャンク数
    phase: 'chunking' | 'merging' | 'converting';
  };
}

// UI State
interface UIState {
  // 既存
  showTTSSection: boolean;
  canSubmitTTS: boolean;
  isProcessing: boolean;

  // 新規追加
  showDownloadButton: boolean;
  downloadFileName?: string;
  progressMessage?: string;
  progressPercentage?: number;
}
```

### タスク間依存関係
- 依存元: セッションB（API層のレスポンス形式）
- 依存先: なし（UI最終層）
- 利用: セッションA（Core層のgenerateFileName）※オプション

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（UI）+ State層（XState）
- **機能**: ダウンロードUI、プログレス表示、状態管理
- **スコープ**: audioタグ削除、ダウンロード専用UI実装

### 編集対象ファイル（排他的アクセス）
- `shell/TTSSection.tsx` - UI改修（audioタグ削除、ダウンロードボタン）
- `shell/useAppMachine.tsx` - MP3 Blob処理
- `state/app.machine.ts` - 状態追加（chunking, merging, converting）
- `core/ui.core.ts` - UI状態導出ロジック更新

### 入出力契約
**入力仕様**:
```typescript
// APIからのレスポンス
type Input = {
  audio: string;       // Base64 MP3
  format: 'mp3';
  fileName: string;
}
```

**出力仕様**:
```typescript
// ユーザーへの提供
type Output = {
  action: 'download';
  file: Blob;          // MP3 Blob
  fileName: string;    // "zundamon_1234567890.mp3"
}
```

### 制約事項
- audioタグを完全に削除（再生機能なし）
- ダウンロードボタンは音声生成後に常時表示
- プログレス表示は分かりやすく
- React 18 StrictMode対応

## 4. 実装ガイドライン

### Shell層実装チェックリスト
- [ ] 薄いIO層として実装
- [ ] ビジネスロジック禁止
- [ ] React Hooks適切使用
- [ ] 副作用の適切な管理
- [ ] アクセシビリティ考慮

### State層実装チェックリスト
- [ ] 明示的な状態定義
- [ ] イベント駆動の状態遷移
- [ ] 状態遷移図の更新
- [ ] React非依存
- [ ] XStateパターン準拠

## 5. 実行ステップ

### ステップ1: 詳細実装計画（15分）
```
□ 状態遷移の設計（chunking→merging→converting→ready）
□ プログレス計算ロジック
□ ダウンロードボタンのUI設計
□ エラー状態の扱い
```

### ステップ2: 実装（45分）

#### state/app.machine.ts
```typescript
// 新しい状態を追加
states: {
  tts_preparing: {},
  tts_chunking: {
    on: {
      CHUNK_PROGRESS: {
        actions: 'updateChunkProgress'
      }
    }
  },
  tts_merging: {},
  tts_converting: {},
  tts_ready: {
    on: {
      DOWNLOAD: {
        actions: 'triggerDownload'
      }
    }
  }
}
```

#### shell/TTSSection.tsx
```tsx
// audioタグを削除し、ダウンロードボタンに置き換え
export function TTSSection({...}) {
  // audioタグ関連のコードを削除

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* 既存のフォーム部分 */}

      {/* プログレス表示 */}
      {progressMessage && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-blue-700">{progressMessage}</div>
          {progressPercentage && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ダウンロードボタン（audioタグの代わり） */}
      {audioUrl && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">音声生成が完了しました</p>
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" /* ダウンロードアイコン */ />
            MP3をダウンロード
          </button>
          <p className="text-xs text-gray-500 mt-2">{fileName}</p>
        </div>
      )}
    </div>
  );
}
```

#### shell/useAppMachine.tsx
```typescript
// MP3 Blob処理の更新
const data = await response.json();
if (response.ok && data.audio) {
  // MP3形式でBlob生成（MIMEタイプ変更）
  const audioBlob = new Blob(
    [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
    { type: 'audio/mpeg' }  // WAVからMP3に変更
  );
  const audioUrl = URL.createObjectURL(audioBlob);
  send({
    type: 'TTS_SUCCESS',
    audioUrl,
    fileName: data.fileName,
    format: data.format
  });
}
```

### ステップ3: 検証（15分）
```bash
# 必須実行コマンド
npm run build      # ビルドエラーチェック
npm run typecheck  # 型エラーチェック
npm run lint       # リントチェック

# 開発サーバーで動作確認
npm run dev
# 1. audioタグが表示されないことを確認
# 2. ダウンロードボタンが表示されることを確認
# 3. MP3ファイルがダウンロードされることを確認
# 4. プログレス表示が動作することを確認
```

## 6. 完了基準

### 必須項目
- [ ] ビルド成功（エラー: 0）
- [ ] TypeScript型チェック完全通過
- [ ] audioタグが完全に削除されている
- [ ] ダウンロードボタンが機能する
- [ ] MP3形式でダウンロードされる

### 品質項目
- [ ] プログレス表示が分かりやすい
- [ ] エラー時の表示が適切
- [ ] UIがレスポンシブ
- [ ] アクセシビリティ対応

## 7. トラブルシューティングガイド

### よくある問題と解決策

**Blob生成エラー**
- 問題: Invalid character in atob
- 解決: Base64デコードを確認

**ダウンロード失敗**
- 問題: ファイル名が正しくない
- 解決: fileName プロパティを確認

**状態遷移エラー**
- 問題: 予期しない状態遷移
- 解決: XState Visualizerで確認

**React 18 StrictMode**
- 問題: 二重レンダリング
- 解決: useEffectの依存配列確認

## 8. 参考資料
- 現在のTTSSection: `/shell/TTSSection.tsx`
- XState設定: `/state/app.machine.ts`
- UI導出ロジック: `/core/ui.core.ts`
- Tailwind CSS: https://tailwindcss.com/docs

---
**実装開始**: 上記指示に従ってUI/State層の実装を開始してください。
**重要**: audioタグを完全に削除し、ダウンロード専用UIにしてください。
**完了後**: ユーザーがMP3ファイルをダウンロードできることを確認してください。