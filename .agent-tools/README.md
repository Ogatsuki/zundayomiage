# 🛠️ Agent Tools
AIエージェント専用の品質保証ツール群

## 📁 ディレクトリ構造
```
.agent-tools/
├── README.md           # このファイル
├── mega-qa.js         # 統合品質保証システム
├── scripts/           # 個別チェックスクリプト
│   ├── quality-gate.js    # 必須品質ゲート
│   └── block-check.js     # ブロック品質チェック
├── configs/           # 設定ファイル
└── tests/            # テストテンプレート
```

## 🚀 使い方

### 全品質チェックを一気に実行
```bash
# プロジェクトルートから実行
node .agent-tools/mega-qa.js [project-path]

# 例: new-architecture-testの品質チェック
node .agent-tools/mega-qa.js new-architecture-test
```

### 個別チェック
```bash
# 品質ゲートのみ
node .agent-tools/scripts/quality-gate.js

# ブロックチェックのみ
node .agent-tools/scripts/block-check.js [block-name]
```

## 📊 MEGA QA の実行フェーズ

### Phase 1: 静的解析（30秒）
- TypeScript型チェック
- ESLint
- ブロック独立性検証

### Phase 2: ビルド（1-2分）
- Next.js プロダクションビルド
- バンドルサイズ分析

### Phase 3: 単体テスト（2-3分）※オプション
- Jest/Vitest実行
- カバレッジ測定

### Phase 4: E2Eテスト（5-10分）※オプション
- Playwright実行
- 基本フロー確認

### Phase 5: パフォーマンス測定
- ビルドサイズ
- ブロックサイズ分析

## 📈 スコアリング

### 100-90点: Production Ready ✨
- 全チェック合格
- デプロイ可能

### 89-70点: Minor Issues ⚠️
- 軽微な問題あり
- デプロイ可能だが改善推奨

### 69-50点: Needs Work 🔧
- 複数の問題あり
- デプロイ前に修正必要

### 49点以下: Critical Issues ❌
- 重大な問題あり
- 即座に修正必要

## 🤖 AI Agent向け使用方法

### PMモードでの品質確認
```
PM: "タスク完了後、以下を実行"
node .agent-tools/mega-qa.js

結果をタスク指示書に記載：
- スコア: 85/100
- 判定: Minor Issues
- 要対応: ブロックサイズの最適化
```

### Workerモードでの確認
```
Worker: "実装完了後、自動実行"
npm run qa:quick  # 簡易チェック（30秒）

修正後：
npm run qa:full   # フルチェック（10分）
```

## 📝 レポート

実行後、以下にレポートが生成されます：
- `.agent-tools/qa-report.json` - 詳細なJSON形式レポート
- コンソール出力 - サマリーと推奨事項

## 🔧 カスタマイズ

### 閾値の調整
`mega-qa.js`内の以下を編集：
```javascript
// ブロックサイズの理想値
const IDEAL_BLOCK_SIZE = { min: 200, max: 400 };

// 合格スコア
const PASSING_SCORE = 70;
```

## 📦 必要な依存関係

プロジェクトに以下が必要：
```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@playwright/test": "^1.40.0",  // E2E用（オプション）
    "jest": "^29.0.0"               // 単体テスト用（オプション）
  }
}
```

## 🎯 設計思想

### プロジェクト非依存
- `.agent-tools/`はプロジェクトと独立
- 複数プロジェクトで再利用可能
- gitignoreに追加推奨

### 段階的導入
- 基本チェックから開始
- テスト環境は後から追加
- 必要に応じて拡張

### AI最適化
- 機械的チェックは自動化
- AIは高度な判断に集中
- 定量的な品質指標

---
*Agent Tools - AIと人間の協調による品質保証*