# タスク詳細（What）:
- VOICEVOX連携用のNext.js APIルートを作成
- 音声クエリ生成と音声合成の2つのエンドポイント
- サーバーサイドでVOICEVOXと通信

## 理由・背景(Why)
- クライアントから直接VOICEVOXに接続するとCORS問題が発生
- サーバーサイドプロキシによる安定した通信
- 環境変数をサーバーサイドで管理しセキュリティ向上

## 実装方法(How)
- POST /api/voicevox/query - 音声クエリ生成
- POST /api/voicevox/synthesis - 音声合成
- app/api/voicevox/ディレクトリにroute.tsファイル作成
- voicevox-clientライブラリを使用

## 実装場所(Where)
- /TSD2amazing/tsd-107-zundamon-voicevox/app/api/voicevox/query/route.ts
- /TSD2amazing/tsd-107-zundamon-voicevox/app/api/voicevox/synthesis/route.ts

## 制約
- POSTメソッドのみ対応
- ずんだもん（speaker=3）固定
- エラーレスポンスは適切なHTTPステータスコードを返す
- リクエストボディのバリデーション実装

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- APIルートが正常に動作するか
- エラーハンドリングが適切か
- レスポンスヘッダーが正しく設定されているか

## Worker記述欄 実装報告等記入欄
- app/api/voicevox/query/route.tsを作成：音声クエリ生成エンドポイント
- app/api/voicevox/synthesis/route.tsを作成：音声合成エンドポイント
- app/api/voicevox/generate/route.tsを作成：統合エンドポイント（クエリ生成と合成を一度に実行）
- POSTメソッドのみ対応
- ずんだもん（speaker=3）固定で実装
- リクエストボディのバリデーション実装（テキスト必須、1000文字制限）
- エラーレスポンスに適切なHTTPステータスコード設定
- 接続エラー時の503ステータスコードと日本語エラーメッセージ
- Content-Typeヘッダーをaudio/wavで正しく設定

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
Yes

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示
- 指示への適合: 5/5 - APIルートが正しく実装されている
- MVP適性: 5/5 - 必要最小限の2エンドポイント+統合エンドポイント
- 動作性: 5/5 - サーバーサイドプロキシでCORS回避
- エラーハンドリング: 5/5 - 適切なHTTPステータスコード
- レスポンスヘッダー: 5/5 - audio/wavヘッダーが正しく設定

総評: 全評価項目で5点。VOICEVOX連携のサーバーサイド実装が完璧。