# 同時処理制限機能テストガイド

## 実装概要

同時処理制限機能（ConcurrentLimiter）が実装され、VOICEVOX音声生成APIでの同時アクセス数を最大3人に制限します。

## テスト方法

### 1. アプリケーション起動

```bash
npm run dev
```

### 2. 自動テストの実行

```bash
node test-concurrent-limiter.js
```

### 3. 手動テスト（ブラウザ）

1. ブラウザで http://localhost:3000 にアクセス
2. 同じブラウザで4つのタブを開く
3. 各タブで長めのテキストを入力（音声生成に時間がかかるようにする）
4. 4つのタブで同時に「音声生成」ボタンをクリック
5. 期待結果: 3つは成功、1つは「混雑中です。しばらく待ってからお試しください。」エラー

## 実装ファイル

- `lib/concurrent-limiter.ts` - 同時処理制限クラス
- `app/api/voicevox/generate/route.ts` - APIルート（制限機能統合済み）
- `test-concurrent-limiter.js` - 自動テストスクリプト

## 制限仕様

- 最大同時処理数: 3人
- 制限超過時のHTTPステータス: 429 (Too Many Requests)
- エラーメッセージ: "混雑中です。しばらく待ってからお試しください。"

## 技術詳細

- メモリベースの実装（外部依存なし）
- TypeScript strict mode準拠
- プロセス再起動時に自動リセット
- try-finally構文でリソース管理を保証