## 問題2: OCRエラーの原因究明結果

### エラー概要
- **症状**: テキスト入力での音声生成は成功するが、OCR経由での音声生成が失敗
- **エラー**: VOICEVOXエンジンへの接続失敗（500 Internal Server Error）
- **接続先**: `http://voicevox:50021`（Docker環境用URLが使用されている）

### 原因分析

#### 1. 環境変数の不整合
ログに`http://voicevox:50021`と表示されているが、これはDocker環境用のURL。ローカル開発環境では`http://localhost:50021`を使用すべき。

環境変数の設定：
- `.env.local`: `NEXT_PUBLIC_VOICEVOX_URL=http://localhost:50021`（ローカル用）
- `.env.docker`: `NEXT_PUBLIC_VOICEVOX_URL=http://voicevox:50021`（Docker用）

#### 2. 問題の本質
同じAPIエンドポイント（`/api/voicevox/generate`）を使用しているのに、テキスト入力では成功し、OCRでは失敗する矛盾がある。

### 推定される根本原因

#### 可能性1: Next.jsの環境変数キャッシュ問題
- Next.jsが古い環境変数をキャッシュしている
- `.next`フォルダに古い設定が残っている

#### 可能性2: ビルド時の環境変数固定
- `NEXT_PUBLIC_`環境変数はビルド時に固定される
- 開発サーバーの再起動が必要

#### 可能性3: OCRテキストの特殊性（可能性低）
- OCRで抽出したテキストに問題がある可能性もあるが、接続エラーが出ているため、これは主原因ではない

### 解決策

#### 即座の対処法
```bash
# 1. 開発サーバーを停止
# 2. .nextフォルダを削除（キャッシュクリア）
rm -rf .next

# 3. 環境変数を確認
echo $NEXT_PUBLIC_VOICEVOX_URL

# 4. 正しい環境変数で開発サーバー再起動
NEXT_PUBLIC_VOICEVOX_URL=http://localhost:50021 npm run dev
```

#### 根本的な修正
`lib/voicevox-client.ts`の11行目を動的に判定するように修正：

```typescript
// 現在のコード
const baseURL = process.env.NEXT_PUBLIC_VOICEVOX_URL || 'http://localhost:50021'

// 修正案1: 環境に応じて動的に切り替え
const baseURL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_VOICEVOX_URL || 'http://voicevox:50021')
  : 'http://localhost:50021'

// 修正案2: より安全なフォールバック
const isDevelopment = process.env.NODE_ENV === 'development'
const isDocker = process.env.DOCKER_ENV === 'true'
const baseURL = isDevelopment && !isDocker
  ? 'http://localhost:50021'
  : (process.env.NEXT_PUBLIC_VOICEVOX_URL || 'http://localhost:50021')
```

### 検証手順
1. 開発サーバーを完全に再起動
2. ブラウザのキャッシュをクリア
3. テキスト入力で音声生成を確認
4. OCRで音声生成を確認

### 追加調査が必要な点
- なぜテキスト入力では成功するのか（同じAPIを使用しているはず）
- 実際にVOICEVOXコンテナが`localhost:50021`で稼働しているか確認

### OCRテキストの特徴（OCR-text.md より）
実際にOCRで抽出されたテキストを分析した結果：
- **文字数**: 約600文字
- **特徴**:
  - 文字間に多数のスペース（OCRの認識特性）
  - 多数の改行
  - 特殊文字（【】、<、》等）
  - URL（bit.ly短縮URL）
  - 日本語テキスト（ワクチン接種案内）

これらの特徴は音声生成に影響する可能性があるが、エラーログが「VOICEVOXへの接続失敗」を示しているため、テキスト内容は主原因ではない。

### 【訂正：真の原因判明】
**OCRテキスト自体がVOICEVOX APIで処理できない形式**

Playwrightで検証した結果：
1. OCRテキストを「テキスト入力」に貼り付け → **500エラー**
2. 通常のテキスト「こんにちは、今日は良い天気ですね。」→ **成功**

### 真の原因
**OCRが生成するテキストの形式問題**：

#### 問題のあるOCRテキストの特徴
- **文字間に大量のスペース**：「剛 すす 本」「【 重 要 】」
- 各文字が個別に認識され、不自然な空白で分離
- 特殊文字（②》、【<】）も含む
- 808文字（1000字制限内だが形式が問題）

#### VOICEVOXがエラーになる理由
- 音声合成エンジンが不自然な文字間スペースを処理できない
- 「剛 すす 本」のようなテキストは日本語として解析不能
- APIレベルでエラー（500 Internal Server Error）

### 推奨する解決策

#### 根本解決: OCRテキストの前処理
OCRResultEditor.tsx または VoiceGenerator.tsx でテキストを正規化：

```typescript
// 日本語文字間の不要なスペースを除去
function normalizeOCRText(text: string): string {
  // 日本語文字（ひらがな、カタカナ、漢字）間のスペースを除去
  return text
    .replace(/([ぁ-んァ-ヶー一-龠]) +([ぁ-んァ-ヶー一-龠])/g, '$1$2')
    // 括弧内のスペースを除去
    .replace(/【 +/g, '【')
    .replace(/ +】/g, '】')
    .replace(/「 +/g, '「')
    .replace(/ +」/g, '」')
    // 連続するスペースを1つに
    .replace(/ +/g, ' ')
    // 句読点前後の不要なスペースを除去
    .replace(/ +([。、,.])/g, '$1')
    .replace(/([。、,.]) +/g, '$1');
}

// handleOCRConfirm内で使用
const handleOCRConfirm = () => {
  const normalizedText = normalizeOCRText(ocrText);
  setOcrText(normalizedText);
  generateVoice();
}
```

#### 暫定対処（簡易版）
最低限のスペース除去：

```typescript
// 連続するスペースを削除
const cleanText = ocrText.replace(/ +/g, ' ').trim();
```

#### 追加の改善案
1. **Tesseract.jsの設定調整**
   - より良い文字認識のための設定最適化
   - 日本語認識の精度向上

2. **ユーザーへのフィードバック**
   - OCR後のテキスト編集を促すUI改善
   - 「OCRテキストを修正してください」のような案内表示

console log----------
先読みされたリンク先 “http://localhost:3000/_next/static/media/e4af272ccee01ff0-s.p.woff2” のリソースが数秒以内に使用されませんでした。すべての preload 属性を持つタグが正しく設定されていることを確認してください。 localhost:3000
Warning: Parameter not found: language_model_ngram_on tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: segsearch_max_char_wh_ratio tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: language_model_ngram_space_delimited_language tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: language_model_ngram_scale_factor tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: language_model_use_sigmoidal_certainty tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: language_model_ngram_nonmatch_score tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: classify_integer_matcher_multiplier tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: assume_fixed_pitch_char_segment tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: chop_enable tesseract-core-simd-lstm.wasm.js:31:307
Warning: Parameter not found: allow_blob_division tesseract-core-simd-lstm.wasm.js:31:307
XHRPOST
http://localhost:3000/api/voicevox/generate
[HTTP/1.1 500 Internal Server Error 7387ms]

Voice generation error: Error: 予期しないエラーが発生しました。しばらく時間をおいてから再試行してください。
    generateVoice webpack-internal:///(app-pages-browser)/./components/VoiceGenerator.tsx:65
    handleOCRConfirm webpack-internal:///(app-pages-browser)/./components/VoiceGenerator.tsx:99
    handleConfirmClick webpack-internal:///(app-pages-browser)/./components/OCRResultEditor.tsx:27
    React 14
        callCallback
        invokeGuardedCallbackImpl
        invokeGuardedCallback
        invokeGuardedCallbackAndCatchFirstError
        executeDispatch
        processDispatchQueueItemsInOrder
        processDispatchQueue
        dispatchEventsForPlugins
        dispatchEventForPluginEventSystem
        batchedUpdates$1
        batchedUpdates
        dispatchEventForPluginEventSystem
        dispatchEvent
        dispatchDiscreteEvent

----サーバーログ---

2025-09-21 02:08:10.755 | Retrying request... (1/3)
2025-09-21 02:08:11.769 | VOICEVOXエンジンに接続できません。以下をご確認ください：
2025-09-21 02:08:11.769 | 1. Dockerが起動していることを確認してください
2025-09-21 02:08:11.769 | 2. docker-compose up -d でサービスを起動してください
2025-09-21 02:08:11.769 | 3. VOICEVOXコンテナが正常に動作しているか確認してください
2025-09-21 02:08:11.769 | 接続先: http://voicevox:50021
2025-09-21 02:08:11.769 | Failed to synthesize speech: Error: VOICEVOXエンジンに接続できません。以下をご確認ください：
2025-09-21 02:08:11.769 | 1. Dockerが起動していることを確認してください
2025-09-21 02:08:11.769 | 2. docker-compose up -d でサービスを起動してください
2025-09-21 02:08:11.769 | 3. VOICEVOXコンテナが正常に動作しているか確認してください
2025-09-21 02:08:11.769 | 接続先: http://voicevox:50021
2025-09-21 02:08:11.769 |     at eval (webpack-internal:///(rsc)/./lib/voicevox-client.ts:41:39)
2025-09-21 02:08:11.769 |     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
2025-09-21 02:08:11.769 |     at async Axios.request (webpack-internal:///(rsc)/./node_modules/axios/lib/core/Axios.js:52:14)
2025-09-21 02:08:11.769 |     at async eval (webpack-internal:///(rsc)/./lib/voicevox-client.ts:92:34)
2025-09-21 02:08:11.769 |     at async VoicevoxClient.retryRequest (webpack-internal:///(rsc)/./lib/voicevox-client.ts:50:20)
2025-09-21 02:08:11.769 |     at async VoicevoxClient.synthesis (webpack-internal:///(rsc)/./lib/voicevox-client.ts:91:20)
2025-09-21 02:08:11.769 |     at async VoicevoxClient.generateSpeech (webpack-internal:///(rsc)/./lib/voicevox-client.ts:109:16)
2025-09-21 02:08:11.769 |     at async POST (webpack-internal:///(rsc)/./app/api/voicevox/generate/route.ts:37:27)
2025-09-21 02:08:11.769 |     at async /app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:57228
2025-09-21 02:08:11.769 |     at async eT.execute (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:46851)
2025-09-21 02:08:11.769 |     at async eT.handle (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:58760)
2025-09-21 02:08:11.769 |     at async doRender (/app/node_modules/next/dist/server/base-server.js:1366:42)
2025-09-21 02:08:11.769 |     at async cacheEntry.responseCache.get.routeKind (/app/node_modules/next/dist/server/base-server.js:1588:28)
2025-09-21 02:08:11.769 |     at async DevServer.renderToResponseWithComponentsImpl (/app/node_modules/next/dist/server/base-server.js:1496:28)
2025-09-21 02:08:11.769 |     at async DevServer.renderPageComponent (/app/node_modules/next/dist/server/base-server.js:1924:24)
2025-09-21 02:08:11.769 |     at async DevServer.renderToResponseImpl (/app/node_modules/next/dist/server/base-server.js:1962:32)
2025-09-21 02:08:11.769 |     at async DevServer.pipeImpl (/app/node_modules/next/dist/server/base-server.js:922:25)
2025-09-21 02:08:11.769 |     at async NextNodeServer.handleCatchallRenderRequest (/app/node_modules/next/dist/server/next-server.js:272:17)
2025-09-21 02:08:11.769 |     at async DevServer.handleRequestImpl (/app/node_modules/next/dist/server/base-server.js:818:17)
2025-09-21 02:08:11.769 |     at async /app/node_modules/next/dist/server/dev/next-dev-server.js:339:20
2025-09-21 02:08:11.769 |     at async Span.traceAsyncFn (/app/node_modules/next/dist/trace/trace.js:154:20)
2025-09-21 02:08:11.769 |     at async DevServer.handleRequest (/app/node_modules/next/dist/server/dev/next-dev-server.js:336:24)
2025-09-21 02:08:11.769 |     at async invokeRender (/app/node_modules/next/dist/server/lib/router-server.js:179:21)
2025-09-21 02:08:11.769 |     at async handleRequest (/app/node_modules/next/dist/server/lib/router-server.js:359:24)
2025-09-21 02:08:11.769 |     at async requestHandlerImpl (/app/node_modules/next/dist/server/lib/router-server.js:383:13)
2025-09-21 02:08:11.769 |     at async Server.requestListener (/app/node_modules/next/dist/server/lib/start-server.js:141:13)
2025-09-21 02:08:11.769 | Voice generation error: Error: 予期しないエラーが発生しました。しばらく時間をおいてから再試行してください。
2025-09-21 02:08:11.769 |     at VoicevoxClient.handleError (webpack-internal:///(rsc)/./lib/voicevox-client.ts:157:16)
2025-09-21 02:08:11.769 |     at VoicevoxClient.synthesis (webpack-internal:///(rsc)/./lib/voicevox-client.ts:102:24)
2025-09-21 02:08:11.769 |     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
2025-09-21 02:08:11.769 |     at async VoicevoxClient.generateSpeech (webpack-internal:///(rsc)/./lib/voicevox-client.ts:109:16)
2025-09-21 02:08:11.769 |     at async POST (webpack-internal:///(rsc)/./app/api/voicevox/generate/route.ts:37:27)
2025-09-21 02:08:11.769 |     at async /app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:57228
2025-09-21 02:08:11.769 |     at async eT.execute (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:46851)
2025-09-21 02:08:11.769 |     at async eT.handle (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:6:58760)
2025-09-21 02:08:11.769 |     at async doRender (/app/node_modules/next/dist/server/base-server.js:1366:42)
2025-09-21 02:08:11.769 |     at async cacheEntry.responseCache.get.routeKind (/app/node_modules/next/dist/server/base-server.js:1588:28)
2025-09-21 02:08:11.769 |     at async DevServer.renderToResponseWithComponentsImpl (/app/node_modules/next/dist/server/base-server.js:1496:28)
2025-09-21 02:08:11.769 |     at async DevServer.renderPageComponent (/app/node_modules/next/dist/server/base-server.js:1924:24)
2025-09-21 02:08:11.769 |     at async DevServer.renderToResponseImpl (/app/node_modules/next/dist/server/base-server.js:1962:32)
2025-09-21 02:08:11.769 |     at async DevServer.pipeImpl (/app/node_modules/next/dist/server/base-server.js:922:25)
2025-09-21 02:08:11.769 |     at async NextNodeServer.handleCatchallRenderRequest (/app/node_modules/next/dist/server/next-server.js:272:17)
2025-09-21 02:08:11.769 |     at async DevServer.handleRequestImpl (/app/node_modules/next/dist/server/base-server.js:818:17)
2025-09-21 02:08:11.769 |     at async /app/node_modules/next/dist/server/dev/next-dev-server.js:339:20
2025-09-21 02:08:11.769 |     at async Span.traceAsyncFn (/app/node_modules/next/dist/trace/trace.js:154:20)
2025-09-21 02:08:11.769 |     at async DevServer.handleRequest (/app/node_modules/next/dist/server/dev/next-dev-server.js:336:24)
2025-09-21 02:08:11.769 |     at async invokeRender (/app/node_modules/next/dist/server/lib/router-server.js:179:21)
2025-09-21 02:08:11.769 |     at async handleRequest (/app/node_modules/next/dist/server/lib/router-server.js:359:24)
2025-09-21 02:08:11.769 |     at async requestHandlerImpl (/app/node_modules/next/dist/server/lib/router-server.js:383:13)
2025-09-21 02:08:11.769 |     at async Server.requestListener (/app/node_modules/next/dist/server/lib/start-server.js:141:13)
2025-09-21 02:08:11.774 |  POST /api/voicevox/generate 500 in 6617ms