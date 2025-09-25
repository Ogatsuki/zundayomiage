# Agent Tools 不整合問題の整理

## 発見された問題

### 1. quality-checker.js のブロックファイル検索問題

**現状の実装:**
```javascript
const blockPath = path.join(this.targetPath, 'blocks', `${this.blockName}.vertical.tsx`);
```

**問題点:**
- PVBPプロトコルのファイル命名規則 `[feature].[runtime].vertical.tsx` に対応していない
- runtime部分（universal/client/server）が考慮されていない

**例:**
- 期待: `character-selector.vertical.tsx`
- 実際: `character-selector.universal.vertical.tsx`

**修正案:**
```javascript
// glob patternを使用して柔軟に検索
const blockPattern = path.join(this.targetPath, 'blocks', `${this.blockName}.*.vertical.tsx`);
```

### 2. 契約ファイル検出の失敗

**現象:**
- `pvbp-app/contracts/` に8個のファイルが存在
- quality-checkerは "No contract files found" と報告

**原因候補:**
- パス結合の問題（Windows環境）
- glob patternの不具合
- 相対パス/絶対パスの混在

### 3. console文検出の範囲不足

**現状:**
- `pvbp-app/blocks/` ディレクトリのみチェック
- `pvbp-app/app/voice-synthesis/page.tsx` の4個のconsole文が未検出

**必要な対応:**
- 検出範囲を `pvbp-app/**/*.{ts,tsx}` に拡張
- blocks以外のディレクトリも含める

### 4. mega-qa.js の統合問題

**症状:**
- TypeScript型チェックが失敗と報告
- 直接 `npx tsc --noEmit` を実行すると成功

**原因:**
- 作業ディレクトリの相違
- Windows環境でのコマンド実行の問題

## 影響と優先度

| 問題 | 影響度 | 優先度 | 理由 |
|------|--------|--------|------|
| ブロック検索 | 高 | 高 | PM評価の基本機能 |
| console文範囲 | 中 | 中 | 品質チェック漏れ |
| 契約ファイル | 低 | 低 | 警告のみ |
| mega-qa統合 | 高 | 高 | 全体品質評価に影響 |

## 推奨対応

### 短期対応（即座に必要）
1. quality-checker.jsのブロック検索ロジックを修正
2. console文検出範囲を全体に拡張

### 中期対応（改善推奨）
1. Windows/Unix両対応のパス処理
2. エラーメッセージの改善
3. デバッグ出力の追加

### 長期対応（将来的に）
1. 設定ファイル対応
2. カスタムルールの追加
3. CI/CD統合

## 現在の回避策

### ブロック指定時
```bash
# フルネームで指定
node .agent-tools/quality-checker.js --path pvbp-app --block character-selector.universal.vertical
```

### console文チェック
```bash
# 手動で全体検索
grep -r "console\." pvbp-app --include="*.tsx" --include="*.ts"
```

### TypeScriptチェック
```bash
# 直接実行
cd pvbp-app && npx tsc --noEmit
```

## まとめ

agent-toolsは基本的な機能は動作しているが、PVBPプロトコルの命名規則との不整合があり、Windows環境での動作に問題がある。短期的には回避策で対応可能だが、ツールの修正が望ましい。