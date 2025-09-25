# タスク詳細
Docker composeでvoicevoxコンテナのヘルスチェックがcurlコマンドを使用しているが、voicevoxイメージにcurlがインストールされていないため失敗している。wgetを使用するように修正する。

## 対象ファイル
- pvbp-app/docker-compose.yml

## 制約
- voicevoxサービスのhealthcheckセクションのみを修正
- wgetコマンドを使用（voicevoxコンテナに確認済み）
- 他のサービスや設定に影響を与えない

## 修正内容
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:50021/version"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 90s
```

## 評価基準
- 自己完結性: ヘルスチェックが正常に動作すること
- 指示適合性: wgetを使用してヘルスチェックが成功すること
- 品質基準: Docker compose upでアプリが正常に起動すること
- MVP適性: 最小限の変更で問題を解決すること

## Worker記述欄
[実装報告・自己評価]

実装完了しました。

### 実装内容
- pvbp-app/docker-compose.ymlのvoicevoxサービスのhealthcheckセクションを修正
- 9行目の`test: ["CMD", "curl", "-f", "http://localhost:50021/version"]`を`test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:50021/version"]`に変更

### テスト結果
1. `docker compose down`で既存コンテナを停止 - 成功
2. `docker compose up -d`で新設定にてコンテナ起動 - 成功
3. voicevoxコンテナのヘルスチェックが正常に動作し、「healthy」状態を確認
4. appコンテナも依存関係に従って正常起動

### 自己評価
- 自己完結性: ✓ ヘルスチェックが正常動作
- 指示適合性: ✓ wgetを使用してヘルスチェック成功
- 品質基準: ✓ Docker compose upでアプリが正常起動
- MVP適性: ✓ 最小限の変更（1行のみ修正）で問題解決

実行時間: 2分程度

## PM品質チェック欄（必須）
### 品質ツール実行結果
1. **quality-checker.js実行**:
   - TypeScript: PASS (エラー0件)
   - 契約準拠: WARNING (契約ファイルなし - インフラタスクのため対象外)
   - 構文: WARNING (デバッグ文1件)
   - スコア: 33/100 (インフラ変更のため低評価だが問題なし)

2. **mega-qa.js実行**:
   - TypeScript型: PASS
   - ESLint: PASS
   - ブロック独立性: FAIL (pvbp構造未完成のため)
   - 総合スコア: 80/100

3. **実動作確認**:
   - docker compose ps: 両コンテナ正常稼働確認 ✓
   - voicevox: healthy状態 ✓
   - app: http://localhost:3001がHTTP 200応答 ✓

## PM評価欄（必須）
### 4項目評価
- **自己完結性**: 5点 - ヘルスチェックが完全に動作
- **指示適合性**: 5点 - wgetへの変更が正確に実施
- **品質基準**: 5点 - Dockerインフラが完全に機能
- **MVP適性**: 5点 - 最小限1行の変更で問題解決

**総合評価**: 20/20点（100点）- 合格 ✓
**修正指示**: なし - タスク完了