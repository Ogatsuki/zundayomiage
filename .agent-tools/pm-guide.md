# PM向け品質チェックツール実行ガイド

## ツールの修正が完了しました

以下の不整合を修正済み:
- ✅ PVBPファイル命名規則に対応（[feature].[runtime].vertical.tsx）
- ✅ 契約ファイル検出を修正（-contract.tsパターンも認識）
- ✅ console文検出範囲を拡大（blocksとappディレクトリ両方）
- ✅ Windows環境でのパス処理を改善

## 基本的な使い方

### 1. プロジェクト全体チェック（推奨）
```bash
node .agent-tools/quality-checker.js --path pvbp-app
```

**出力例:**
```
🚀 Quality Checker 開始
🔍 TypeScript型チェック
✅   TypeScriptエラー: 0件
🔍 契約準拠チェック
✅   契約ファイル: 7件
🔍 構文チェック
⚠️    デバッグ文: 5件

📊 Quality Check Report
🎯 スコア: 67/100
```

### 2. 特定ブロックチェック
```bash
# ブロック名だけ指定（runtime部分は自動検出）
node .agent-tools/quality-checker.js --path pvbp-app --block character-selector

# フルネームでも可
node .agent-tools/quality-checker.js --path pvbp-app --block character-selector.universal.vertical
```

### 3. 統合品質チェック（フル）
```bash
node .agent-tools/mega-qa.js pvbp-app
```

⚠️ **注意**: mega-qa.jsのTypeScriptチェックは環境依存のエラーが出ることがあります。
その場合は直接実行してください:
```bash
cd pvbp-app && npx tsc --noEmit
```

## スコア判定基準

| スコア | 判定 | 意味 |
|-------|------|------|
| 90-100 | ✅ PASS | プロダクション準備完了 |
| 70-89 | ⚠️ WARNING | 軽微な問題あり |
| 50-69 | 🔧 NEEDS WORK | 修正推奨 |
| 0-49 | ❌ FAIL | 即座に修正必要 |

## 検出される問題と対処

### console文検出（デバッグ文）
**検出内容:** console.log, console.error, console.warn等

**対処方法:**
1. 開発用console文は削除
2. 必要なエラーハンドリングはstateで管理
3. プロダクション必須のログは環境変数で制御

**現在の検出状況:**
- pvbp-app/app/voice-synthesis/page.tsx: 4件
- pvbp-app/blocks/shared/lifecycle-patterns.ts: 1件（例示コメント内）

### ブロック独立性違反
**検出内容:** 他ブロックへの直接import

**対処方法:**
1. contractsディレクトリ経由のみ許可
2. 共通ロジックは各ブロックに複製（DRY違反OK）

### ブロックサイズ
**理想:** 200-400行
**許容:** 200-800行（PVBPプロトコル）

## トラブルシューティング

### Q: "Block file not found"と表示される
A: ブロック名の指定を確認。runtime部分（universal/client/server）は省略可能。

### Q: TypeScriptエラー0件なのにmega-qaで失敗
A: Windows環境での実行パス問題。直接 `cd pvbp-app && npx tsc --noEmit` を実行。

### Q: 契約ファイルが検出されない
A: contracts/ディレクトリに `-contract.ts` または `contract.ts` で終わるファイルを配置。

## PM評価フロー

1. **タスク完了時**
   ```bash
   # 基本チェック
   node .agent-tools/quality-checker.js --path pvbp-app

   # 問題があれば対象ブロックを個別チェック
   node .agent-tools/quality-checker.js --path pvbp-app --block [ブロック名]
   ```

2. **評価基準**
   - スコア80点以上: 合格
   - console文0件: プロダクション品質
   - ブロック独立性違反0件: アーキテクチャ準拠

3. **修正指示**
   - 具体的な違反箇所を記載
   - タスク番号を採番して記録
   - Worker実行で修正

## まとめ

ツールの不整合は解決済み。PMは上記コマンドでスムーズに品質チェックを実行できます。