# タスク詳細（What）:
- VOICEVOXクライアント（voicevox-client.ts）のHTTPリクエスト方法を修正
- `/audio_query`エンドポイントへのリクエストをVOICEVOX API仕様準拠に変更
- 現在の問題：POSTメソッドでbodyがnull、テキストがURLパラメータで送信されている
- 修正後：POSTメソッドでJSONボディにテキストを含めて送信

## 理由・背景(Why)
- 現在、長文テキスト（10,000文字以上）でHTTPリクエストサイズ制限エラーが発生
- エラー内容：「Invalid HTTP request received」（URLが68,000文字以上に膨張）
- VOICEVOX APIの正式仕様ではPOSTボディでテキストを受け取る設計
- MVPとして基本的な音声生成機能が動作することが最優先

## 実装方法(How)
### 1. getAudioQueryメソッドの修正
```typescript
// 現在の問題のある実装
await this.client.post('/audio_query', null, {
  params: { text, speaker }  // URLパラメータで送信
})

// 修正後の実装
await this.client.post(
  `/audio_query?speaker=${speaker}`,  // speakerはURLパラメータ
  text,  // textはボディで送信
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'  // または 'text/plain'
    }
  }
)
```

### 2. エラーハンドリングの改善
- リクエストサイズに関するエラーメッセージの追加
- 接続エラー時の詳細ログ出力

### 3. 動作確認
- 10文字のテキストで動作確認
- 1,000文字のテキストで動作確認
- 10,000文字のテキストで動作確認
- 50,000文字のテキストで動作確認

## 実装場所(Where)
- `/lib/voicevox-client.ts`
  - `getAudioQuery`メソッド（147行目付近）
  - `synthesis`メソッド（必要に応じて）
  - `handleError`メソッド（エラーメッセージ改善）

## 制約
- VOICEVOX API仕様に完全準拠すること
- 既存のインターフェース（メソッドシグネチャ）は変更しない
- 後方互換性を維持
- console.logは最小限に抑える（本番環境考慮）
- axiosライブラリの既存設定は可能な限り維持

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- 10,000文字以上のテキストが正常に処理できるか（必須）
- エラーメッセージが適切で問題特定に役立つか
- HTTPリクエストのペイロードサイズが適切か（URLは8KB以内）
- 実装前後でメモリ使用量に大きな差がないか

## 参考情報
### VOICEVOX API仕様（推定）
```bash
POST /audio_query?speaker={speaker_id}
Content-Type: application/x-www-form-urlencoded
Body: text={url_encoded_text}

または

POST /audio_query?speaker={speaker_id}
Content-Type: text/plain
Body: {raw_text}
```

### 現在のエラーログ
```
Failed to get audio query: AxiosError: Request failed with status code 400
data: 'Invalid HTTP request received.'
```

## Worker記述欄 実装報告等記入欄
### 調査結果
VOICEVOX APIの仕様を調査した結果、以下が判明しました：
1. `/audio_query`エンドポイントは**必ず**`text`と`speaker`をURLパラメータ（query parameters）として受け取る仕様
2. リクエストボディでのテキスト送信はAPIが対応していない（422エラーが返される）
3. これはVOICEVOX API自体の仕様制限であり、クライアント側では回避不可能

### テスト結果
実際のテスト結果：
- 10文字: ✓ 成功
- 100文字: ✓ 成功
- 1,000文字: ✓ 成功
- 2,730文字: ✓ 成功（実測上限）
- 2,740文字: ✗ 500 Internal Server Error（VOICEVOX内部エラー）
- 6,000文字以上: ✗ 400 Invalid HTTP request（URL長制限）

### 実装内容
1. **getAudioQueryメソッド**: 当初の仮説（ボディ送信）は不可能だったため、元の実装を維持
2. **エラーハンドリング改善**: URLサイズ制限エラーを明確に識別し、適切なメッセージを表示
3. **コメント追加**: API仕様の制限について明記

### 結論
- VOICEVOX APIの仕様上、テキストはURLパラメータで送信する必要がある
- 実用上の文字数制限は約2,700文字（日本語）
- これ以上の長文を処理するには、アプリケーション側でテキスト分割処理が必要
- 既存の`text-splitter.ts`による分割処理が重要な役割を果たしている

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- No（部分的達成）

### 理由：
- ✓ エラーメッセージの改善は実装完了
- ✓ API仕様の調査と制限事項の明確化は完了
- ✗ 10,000文字以上の処理はAPI仕様上不可能（分割処理が必須）
- △ MVPとしてはテキスト分割機能で対応済みのため実用上問題なし

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示

### 評価結果
- 調査の徹底度: 5/5 - API仕様を実証的に調査し、制限事項を明確化
- エラーハンドリング改善: 5/5 - 適切なエラーメッセージとログを実装
- 10,000文字以上の処理: 2/5 - API制限により不可能（外部要因）
- MVPとしての適切性: 4/5 - text-splitterによる代替案は機能
- ドキュメント化: 5/5 - 制限事項とテスト結果を詳細に記録

### 総合評価: 3/5

### 修正指示
Workerの調査により、VOICEVOX API自体の仕様制限が判明したため、別アプローチが必要です。

**追加タスク031を作成**:
text-splitter.tsの分割サイズを2,500文字に調整し、確実に動作するよう改善してください。

**現タスクの結論**:
- API仕様の制限は回避不可能と判明
- エラーハンドリングの改善は完了
- 根本解決にはアプリケーション側の対応（テキスト分割）が必須

Workerの調査と実装は適切でしたが、当初の前提（APIがボディ送信対応）が誤っていたため、目標の完全達成は不可能でした。MVPとしては既存のテキスト分割機能で対応可能なため、実用上の問題は軽微です。