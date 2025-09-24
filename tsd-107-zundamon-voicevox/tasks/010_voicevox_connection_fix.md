# タスク詳細（What）:
- VOICEVOXエンジンへの接続エラーを解決
- Docker環境での自動起動を確実にする
- 接続失敗時のリトライ機能を実装
- エラーメッセージをユーザーフレンドリーに改善

## 理由・背景(Why)
- 現在VOICEVOXエンジンに接続できないエラーが発生
- MVPとして安定した音声生成機能が必須
- Dockerコンテナ間の通信問題の可能性
- ユーザーが問題を自己解決できるよう明確なエラーメッセージが必要

## 実装方法(How)
- Docker Composeのヘルスチェック機能を追加
- voicevox-clientにリトライロジックを実装（最大3回、間隔1秒）
- 環境変数でVOICEVOX URLを正しく設定
- エラー時に具体的な対処法を表示

## 実装場所(Where)
- /docker-compose.yml (ヘルスチェック追加)
- /lib/voicevox-client.ts (リトライロジック)
- /components/VoiceGenerator.tsx (エラーメッセージ改善)

## 制約
- Docker環境を前提とした実装
- リトライは最大3回まで
- ローカル環境との互換性を維持

## 評価基準
- 必須: 指示に過不足なく実装されたか
- VOICEVOXエンジンへの接続が成功するか
- エラー時に適切なリトライが行われるか
- エラーメッセージが具体的で対処法が明確か
- Docker環境で安定して動作するか

## Worker記述欄 実装報告等記入欄
- ここに記述

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- ここに記述

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示## Worker記述欄 実装報告等記入欄
- docker-compose.ymlにVOICEVOXサービスのヘルスチェックを追加
- nextjsサービスがVOICEVOXサービスの正常起動を待つようdepends_onにcondition: service_healthyを設定
- voicevox-client.tsにリトライ機能を実装（最大3回、間隔1秒）
- retryRequestメソッドで接続エラーや5xxエラーを自動リトライ
- waitForReadyメソッドでVOICEVOXエンジンの準備完了を待機
- エラーメッセージを改善し、具体的な対処法を表示
- 環境変数でVOICEVOX URLを正しく設定（Docker環境ではhttp://voicevox:50021）

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- Yes
