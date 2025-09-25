# タスク詳細
- pvbp-app Docker build エラーの修正

## 対象ブロック
- pvbp-app/Dockerfile（修正）
- pvbp-app/public/（新規作成）
- 他ブロック参照: 禁止

## 問題の特定（PM調査済み）
1. **致命的問題**: `npm ci --only=production`がビルド時に必要なdevDependenciesを除外
2. **構成問題**: publicディレクトリが存在しない
3. **エラー内容**: `COPY --from=builder /app/public ./public`で"not found"エラー

## 実装内容
1. Dockerfile修正
   - `npm ci --only=production`を`npm ci`に変更（builderステージ）
   - publicディレクトリのCOPYを条件化または作成確認
   - マルチステージビルドの最適化

2. publicディレクトリ作成
   - pvbp-app/public/favicon.ico（最小限のファイル）
   - pvbp-app/public/robots.txt（基本的なrobots.txt）

3. ビルド検証
   - docker compose build実行
   - エラー解消確認
   - イメージサイズ最適化

## 制約
- Dockerfile内容の整合性維持
- Next.js標準構成に準拠
- PVBP原則遵守
- production用の最適化維持

## 評価基準
- 自己完結性: Docker buildが単体で成功
- 指示適合性: 問題の完全解決
- 品質基準: エラー0、警告最小化
- MVP適性: 最小限の修正で動作

## Worker記述欄
- 実装完了：Dockerfile修正（npm ci --only=production → npm ci）
- publicディレクトリ作成（favicon.ico, robots.txt）
- Docker build成功確認
- 自己評価：問題を完全解決、最小限の変更で対応

## PM品質チェック欄（必須）
- docker compose build実行結果: ✅ SUCCESS（ビルド時間52秒）
- イメージサイズ確認: 1.13GB（最適化の余地あり）
- コンテナ起動確認: ✅ voicevox起動中（ヘルスチェック中）

## PM評価欄（必須）
- 自己完結性: 5/5（Docker buildが単体で成功）
- 指示適合性: 5/5（特定された3問題を完全解決）
- 品質基準: 4/5（イメージサイズが大きい）
- MVP適性: 5/5（最小限の修正で動作確認）
- 修正指示: なし（合格基準達成）