# Cloud Run 10,000文字生成エラー 第一次調査報告書

*調査日: 2025-09-23*
*更新: 追加情報による修正版*

## エラー概要

- **症状**: ローカル環境では成功する10,000文字の音声生成がCloud Run環境でエラー
- **エラーコード**:
  - HTTP 504 (Gateway Timeout) - 300秒でタイムアウト
  - HTTP 500 (Internal Server Error) - 148秒で内部エラー
- **エラー箇所**: チャンク1/22の処理中

## 動作状況

| テキスト長 | チャンク数 | Cloud Run | ローカル |
|-----------|----------|-----------|----------|
| 500文字以内 | 1 | ✅ 成功 | ✅ 成功 |
| 1500文字超 | 3 | ✅ 成功 | ✅ 成功 |
| 10000文字 | 22 | ❌ 失敗 | ✅ 成功 |

## 環境構成

- **構成**: Cloud Runマルチコンテナ（サイドカーパターン）
  - メインコンテナ: Next.js
  - サイドカーコンテナ: VOICEVOX Engine
- **接続**: `http://localhost:50021`（正常動作確認済み）

## 調査結果

### 原因: 現時点で特定困難

VOICEVOXへの接続は正常であり、中規模（3チャンク）までは処理成功するため、単純な接続問題ではない。22チャンクの処理でのみ発生する問題。

## 仮説リスト（確度順）

### 仮説1: リソース制限（確度: 40%）
**現象**: 3チャンクまでは成功、22チャンクで失敗
**推測される原因**:
- メモリ不足: 22チャンク分の配列保持でメモリ圧迫
- /tmpディレクトリ容量: 22個のWAVファイル一時保存で容量超過
- ファイルディスクリプタ制限: 同時オープンファイル数の上限

### 仮説2: ffmpeg処理の限界（確度: 30%）
**現象**: audio-merger.tsでのconcat処理
**推測される原因**:
- 22ファイルのconcat listが処理限界
- ffmpegプロセスのメモリ使用量増大
- Cloud Run環境でのffmpeg動作の不安定性

### 仮説3: 非決定的な環境要因（確度: 20%）
**現象**: 同じ条件で504エラー（300秒）と500エラー（148秒）が混在
**推測される原因**:
- コールドスタート vs ウォームスタートの差
- インスタンスごとのリソース割り当ての違い
- VOICEVOXエンジンの内部状態（メモリリーク等）

### 仮説4: 未文書化の制限（確度: 10%）
**現象**: 特定のチャンク数以上で発生
**推測される原因**:
- Cloud Runの未公開制限事項
- サイドカーパターン特有の制約
- ネットワークバッファの枯渇

## 推奨調査手順

### ステップ1: 境界値の特定
チャンク数の境界を特定する段階的テスト：
- 5チャンク（2500文字）
- 10チャンク（5000文字）
- 15チャンク（7500文字）
- 20チャンク（9000文字）

### ステップ2: リソース使用状況の確認
```bash
# Cloud Runのメモリ/CPU設定確認
gcloud run services describe zunda --region=asia-northeast1

# ログでメモリ使用状況確認
gcloud logging read "resource.type=cloud_run_revision AND severity>=WARNING" \
  --limit=50 --format=json
```

### ステップ3: 詳細ログの追加
```typescript
// generate-long/route.ts に追加
console.log(`Memory usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
console.log(`Chunk size: ${chunk.length} chars`);
```

## 暫定対策案

### 案1: チャンク数制限（実装容易度: 高）
```typescript
// 最大10チャンク（5000文字）に制限
if (chunks.length > 10) {
  return NextResponse.json(
    { error: 'Cloud Run環境では5000文字までに制限されています' },
    { status: 400 }
  )
}
```

### 案2: メモリ効率化（実装容易度: 中）
```typescript
// WAVバッファを順次処理して即座に解放
for (let i = 0; i < chunks.length; i++) {
  const audioData = await client.generateSpeech(chunk, speaker)
  await appendToTempFile(audioData) // メモリに保持せずファイルに追記
  audioData = null // 明示的に解放
}
```

### 案3: ストリーミング処理（実装容易度: 低）
- Server-Sent Eventsで処理済みチャンクを順次送信
- クライアント側で結合処理

## 追加調査項目

- [ ] text-splitterの実装詳細（lib/text-splitter.ts）
- [ ] Cloud Runのメモリ/CPU割り当て設定
- [ ] VOICEVOXエンジンのログ
- [ ] 他のCloud Runサービスでの同様事例

## 結論

**原因は現時点で特定困難**。3チャンクまでは成功、22チャンクで失敗という事実から、チャンク数に依存する何らかのリソース制限が存在すると推測される。段階的な調査により境界値を特定することが次のステップ。