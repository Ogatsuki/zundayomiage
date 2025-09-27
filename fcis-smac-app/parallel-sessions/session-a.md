# セッションA用指示書 - APIルート実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 13 (App Router), React 18, TypeScript, VOICEVOX API
- **開発環境**: Windows, Node.js

### 問題背景（セッション1の調査結果）
- **現象**: /api/synthesizeエンドポイントが404エラーを返す
- **根本原因**: app/api/ディレクトリが存在せず、APIルートが未実装
- **影響範囲**: 音声合成機能が完全に動作しない
- **解決目標**: Next.js 13 App RouterでAPIルートを実装し、VOICEVOXサーバーへのプロキシを提供

## 2. 全体設計（セッション1決定事項）

### アーキテクチャ決定
- Next.js 13のRoute Handlersを使用してAPIエンドポイントを実装
- VOICEVOXサーバーへのプロキシとして機能
- モックモード対応（環境変数NEXT_PUBLIC_MOCK_MODE=true時）
- FCIS+SMACアーキテクチャのShell層として実装（副作用の処理）

### 共通契約仕様
```typescript
// APIリクエスト型
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

// APIレスポンス型
interface SynthesizeResponse {
  audio?: string; // Base64エンコードされた音声データ
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
}

// HTTPステータスコード
// 200: 成功
// 400: バリデーションエラー
// 502: VOICEVOXサーバー接続エラー
// 503: VOICEVOXサーバー利用不可
```

### タスク間依存関係
- 依存元: なし（独立タスク）
- 依存先: セッションB（状態管理）がこのAPIを使用

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（APIルート）
- **機能**: VOICEVOXサーバーへのHTTPプロキシ
- **スコープ**: /app/api/synthesize/route.tsの新規作成

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/app/api/synthesize/route.ts` - 新規作成

### 入出力契約
**入力仕様**:
```typescript
// POST /api/synthesize
// Content-Type: application/json
{
  text: string,        // 音声合成するテキスト（必須、1-1000文字）
  speakerId: number,   // 話者ID（必須、0-10の範囲）
  config?: {           // オプション設定
    speedScale?: number,      // 話速（0.5-2.0）
    pitchScale?: number,      // 音高（-0.15-0.15）
    intonationScale?: number, // 抑揚（0-2.0）
    volumeScale?: number      // 音量（0-2.0）
  }
}
```

**出力仕様**:
```typescript
// 成功時（200）
{
  audio: string  // Base64エンコードされたWAV音声データ
}

// エラー時（400/502/503）
{
  error: {
    code: string,       // エラーコード（例: "VALIDATION_ERROR", "CONNECTION_ERROR"）
    message: string,    // エラーメッセージ
    isRetryable: boolean // リトライ可能かどうか
  }
}
```

### 制約事項
- VOICEVOXサーバーのURLは環境変数`NEXT_PUBLIC_VOICEVOX_API_URL`から取得（デフォルト: http://localhost:50021）
- モックモード時（`NEXT_PUBLIC_MOCK_MODE=true`）はダミーデータを返す
- タイムアウト: Audio Query 30秒、Synthesis 60秒
- CORSヘッダーを適切に設定
- エラー時は詳細なログを出力

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Shell層実装の場合
- [x] 薄いIO層として実装（このAPIルートはIO処理のみ）
- [x] ビジネスロジック禁止（バリデーション以外のロジックなし）
- [x] 副作用の適切な管理（HTTP通信）
- [x] エラーハンドリング完備
- [x] 契約の明確な提供

## 5. 実行ステップ

### ステップ1: ディレクトリ作成とファイル準備（5分）
```bash
mkdir -p /app/fcis-smac-app/app/api/synthesize
touch /app/fcis-smac-app/app/api/synthesize/route.ts
```

### ステップ2: 実装（30分）
```
□ Next.js Route Handler実装
□ VOICEVOXサーバーへのプロキシ処理
□ モックモード対応
□ エラーハンドリング実装
□ タイムアウト処理実装
```

### ステップ3: 検証（10分）
```bash
# ビルドチェック
cd /app/fcis-smac-app
npm run build

# 型チェック
npm run typecheck

# 開発サーバー起動
npm run dev

# APIテスト（別ターミナル）
curl -X POST http://localhost:3000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"テスト","speakerId":3}'
```

## 6. 完了基準

### 必須項目
- [ ] /api/synthesizeエンドポイントが200を返す
- [ ] VOICEVOXサーバー接続時に音声データ返却
- [ ] モックモード時にダミーデータ返却
- [ ] エラー時に適切なステータスコードとメッセージ
- [ ] TypeScript型チェック完全通過

### 品質項目
- [ ] タイムアウト処理が正常動作
- [ ] エラーログが適切に出力
- [ ] CORSヘッダー設定済み

## 7. トラブルシューティングガイド

### よくある問題と解決策

**Next.js APIルートが認識されない**
- 問題: 404エラーが続く
- 解決: app/api/synthesize/route.tsのファイル名確認、exportされた関数名確認

**VOICEVOXサーバー接続エラー**
- 問題: Connection refused
- 解決: VOICEVOXサーバーが起動しているか確認、ポート50021が開いているか確認

**タイムアウトエラー**
- 問題: 処理がタイムアウトする
- 解決: タイムアウト時間を延長、VOICEVOXサーバーの負荷確認

## 8. 参考資料
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- VOICEVOX API仕様: https://voicevox.github.io/voicevox_engine/api/
- FCIS+SMAC仕様: `/app/docs/state/ai-architecture-knowledge-fcis-smac.json`

---
**実装開始**: 上記指示に従って実装を開始してください。
**完了後**: /api/synthesizeエンドポイントが正常に動作することを確認してください。