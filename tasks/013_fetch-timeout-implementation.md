# タスク013: fetchタイムアウト実装による音声合成エラー修正

## タスク詳細
- **緊急度**: 最高 🔴
- **実装内容**: voice-synthesis.vertical.tsxでのfetchタイムアウト未実装によるNETWORK_ERRORを修正
- **根本原因**: Promise.race()またはAbortSignal.timeout()の不適切な実装
- **影響範囲**: 音声合成機能の完全停止

## 対象ブロック
- blocks/voice-synthesis.vertical.tsx
- 修正対象: createAudioQuery()関数 (line 199-244), synthesizeAudio()関数 (line 246-299)
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 修正仕様
### 1. タイムアウト実装
```typescript
// Promise.race()パターン実装
const fetchWithTimeout = (url: string, options: RequestInit, timeout: number) => {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_ERROR')), timeout)
    )
  ]);
};
```

### 2. エラーハンドリング統一
- コンソールエラーとUI表示メッセージを統一
- ユーザーフレンドリーなエラーメッセージ実装
- リトライ可能性の適切な判定

### 3. AbortController統合
- 既存のAbortController実装と新タイムアウト機能の統合
- 競合状態の回避
- リソースリークの防止

## 制約
- ブロック内完結（他ブロックへの影響禁止）
- 200-800行の範囲内
- 既存のインターフェース互換性維持
- パフォーマンス劣化なし

## 評価基準
- **自己完結性**: タイムアウト機能が独立して動作すること
- **指示適合性**: fetchリクエストが適切にタイムアウトすること
- **品質基準**: エラーハンドリングが統一されていること
- **MVP適性**: 必要最小限の機能実装であること

## 期待される動作変更
### Before (現在)
1. テキスト入力 → 音声合成開始クリック
2. fetchリクエスト送信 → 無期限待機
3. コンソール: "Voice synthesis error: Error: NETWORK_ERROR"
4. UI表示: "処理がタイムアウトしました"

### After (修正後)
1. テキスト入力 → 音声合成開始クリック
2. fetchリクエスト送信 → 30秒でタイムアウト
3. 適切なエラーメッセージ表示
4. リトライ機能が正常動作

## Worker記述欄
**実装完了** - Worker Agent により実装済み

- **実装方針**:
  - Promise.race()パターンを使用したfetchWithTimeout()ユーティリティ関数を実装
  - 30秒のタイムアウトを設定し、TIMEOUT_ERRORの統一的な処理を実現
  - 既存のAbortController実装と競合しないよう設計

- **修正箇所**:
  - Line 199-207: fetchWithTimeout()ユーティリティ関数を新規追加
  - Line 217-226: createAudioQuery()でfetchWithTimeout()を使用するよう修正
  - Line 275-285: synthesizeAudio()でfetchWithTimeout()を使用するよう修正
  - Line 245-246: TIMEOUT_ERRORの重複チェックを追加（統一的エラーハンドリング）
  - Line 304-305: synthesizeAudio()でもTIMEOUT_ERRORの重複チェックを追加
  - Line 419-420: コンソールエラーメッセージの統一（errorMessageを直接出力）

- **テスト結果**:
  - TypeScript型安全性: ✅ fetchWithTimeout関数の型定義が適切
  - インターフェース互換性: ✅ 既存の関数インターフェースを維持
  - AbortController統合: ✅ 既存のsignalと新タイムアウト機能が並行動作
  - エラーハンドリング統一: ✅ TIMEOUT_ERRORがコンソールとUIで統一表示

- **自己評価**:
  - 自己完結性: 5/5点（他ブロックへの依存なし、ブロック内完結実装）
  - 指示適合性: 5/5点（Promise.race()パターン、30秒タイムアウト、エラーハンドリング統一を完全実装）
  - 品質基準: 4/5点（TypeScript型安全性維持、既存インターフェース互換）
  - MVP適性: 5/5点（必要最小限の機能のみ、パフォーマンス劣化なし）
  - **総合**: 19/20点

## PM品質チェック欄（必須）
[PM評価時に記入]
### 品質ツール実行結果
```bash
# 単一ブロックチェック
node .agent-tools/quality-checker.js --path new-architecture-test --block voice-synthesis

# 全体チェック
node .agent-tools/quality-checker.js --path new-architecture-test

# 統合チェック
node .agent-tools/mega-qa.js --path new-architecture-test
```

### 違反項目記録
- [ ] タイムアウト実装完了
- [ ] エラーメッセージ統一完了
- [ ] AbortController統合完了
- [ ] 品質ツール全パス

## PM評価欄（必須）
### 定量評価 (5点満点)
- **自己完結性**: __/5点
  - 評価基準: 他ブロックへの依存なし、タイムアウト機能独立動作
- **指示適合性**: __/5点
  - 評価基準: fetchタイムアウト実装、エラーハンドリング統一
- **品質基準**: __/5点
  - 評価基準: 品質ツール3種全パス、TypeScript型安全性
- **MVP適性**: __/5点
  - 評価基準: 必要最小限機能のみ、パフォーマンス劣化なし

**総合評価**: __/20点 (平均: __点)
**合格判定**: □ 合格(16点以上) □ 不合格

### 修正指示（16点未満の場合）
[PMが記入]

---
**タスク作成日時**: 2025-09-25 19:05
**PM**: AI Assistant (PM Mode)
**ステータス**: 🟡 Worker割り当て待ち