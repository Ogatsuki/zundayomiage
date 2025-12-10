# タイムアウト問題調査記録 (2025-12-10)

## 現状サマリー

Cloud Run + VOICEVOX sidecar構成で長文音声生成時にタイムアウトが発生。
3層のタイムアウト設定を全て対応したと思っていたが、9チャンク目終了付近で失敗。

---

## 環境構成

| 項目 | 設定値 |
|------|--------|
| Cloud Run CPU | 4コア |
| Cloud Run メモリ | 8GB |
| VOICEVOX | cpu-ubuntu20.04-latest (sidecar) |
| Next.js | 14.x (App Router) |
| チャンクサイズ | 500文字 |
| 1チャンク処理時間 | 約52秒（実測） |

---

## 設定済みタイムアウト（3層）

| 層 | 設定箇所 | 設定値 | 状態 |
|---|----------|--------|------|
| Cloud Run Request | `timeoutSeconds` | 300秒 | ✅ 設定済み |
| Next.js API Route | `export const maxDuration` | 300秒 | ✅ 設定済み |
| fetch AbortSignal | `AbortSignal.timeout()` | 300秒 | ✅ 設定済み |

---

## 発生した問題

### 失敗時のログ（抜粋）

```
11:46:45.782  [VOICEVOX] synthesis request開始（10チャンク目付近）
11:46:57.983  "Truncated response body" ← Cloud Runがレスポンス切断（約12秒後）
11:53:23.394  HeadersTimeoutError: Headers Timeout Error
              code: 'UND_ERR_HEADERS_TIMEOUT'
```

### 重要な発見

1. **「Truncated response body」が先に発生**
   - Cloud Run側で何かが切れた
   - これが根本原因

2. **HeadersTimeoutErrorは二次的なエラー**
   - Node.js undiciのデフォルトヘッダータイムアウト（60秒）
   - 接続が切れた後の残骸処理で発生
   - `AbortSignal.timeout()`とは別のタイムアウト

3. **4層目のタイムアウトが存在した**
   - Node.js 18+の組み込みfetchはundiciを使用
   - undiciには独自のheadersTimeout（デフォルト60秒）がある
   - これは`AbortSignal.timeout()`では制御できない

---

## 未解決の問題

### 「Truncated response body」の原因は何か？

考えられる原因：
1. Cloud Runの内部タイムアウト（ingress/egress）
2. VOICEVOX側のプロセスクラッシュ
3. メモリ不足によるOOM Kill
4. ストリーミングレスポンスの接続維持問題

### なぜ9チャンク目付近で失敗するのか？

- 9チャンク × 52秒 = 約468秒（約7.8分）
- Cloud Runのリクエストタイムアウト（300秒=5分）を超過している可能性
- または累積メモリ使用量の問題

---

## 次のアクション候補

### 理想的解決（デフォルトタイムアウトで動作）

1. **チャンクサイズ縮小**: 500文字 → 200文字
   - 1チャンク処理時間を20秒程度に短縮
   - ただし全体時間が長いと「Truncated」問題は残る

2. **VOICEVOXの高速化**
   - GPU版の使用
   - CPU/スレッド設定の最適化

### 妥協的解決

1. **undiciのタイムアウト延長**
   ```typescript
   import { Agent, setGlobalDispatcher } from 'undici';
   const customAgent = new Agent({
     headersTimeout: 600000,  // 10分
     bodyTimeout: 600000,     // 10分
   });
   setGlobalDispatcher(customAgent);
   ```

2. **Cloud Runタイムアウトのさらなる延長**
   - 現在300秒 → 600秒（10分）に延長

---

## 調査が必要な項目

1. Cloud Runの「Truncated response body」の正確な発生条件
2. VOICEVOXのメモリ使用量の推移（チャンク処理ごと）
3. ストリーミングレスポンス時のCloud Runの挙動
4. 全体処理時間と各タイムアウトの関係

---

## 参考：タイムアウト階層図

```
[Cloud Run: timeoutSeconds=300秒]
  └─ [Next.js: maxDuration=300秒]
       └─ [あなたのコード: route.ts]
            └─ [fetch + AbortSignal.timeout=300秒]
                 └─ [undici内部: headersTimeout=60秒 ← 未設定！]
                      └─ [VOICEVOX API]
```

---

*Last updated: 2025-12-10 12:09 JST*
