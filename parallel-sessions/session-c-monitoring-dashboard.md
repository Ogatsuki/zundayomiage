# セッションC：VOICEVOXモニタリングダッシュボード

## タスク概要
VOICEVOXサービスの状態監視と診断機能を提供するダッシュボードを実装

## アーキテクチャ準拠事項
- **Core層**：メトリクス計算と分析ロジック
- **State層**：リアルタイム状態管理
- **Shell層**：ダッシュボードUI

## 実装内容

### 1. Core層の実装
`fcis-smac-app/core/voicevox-monitoring.core.ts`を作成：
```typescript
export type ServiceMetrics = {
  uptime: number;
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
  queueLength: number;
};

export const calculateHealthScore = (metrics: ServiceMetrics): number
export const detectAnomaly = (history: ServiceMetrics[]): boolean
export const predictFailure = (trends: ServiceMetrics[]): Risk
```

### 2. State層の実装
`fcis-smac-app/state/monitoring.machine.ts`を作成：
- リアルタイムメトリクス収集
- 30秒間隔でのヘルスチェック
- 履歴データの管理（最新100件）
- アラート状態の管理

### 3. Shell層のダッシュボード
`fcis-smac-app/shell/VoicevoxDashboard.tsx`を作成：

```typescript
// ダッシュボード機能
- サービス状態インジケーター（緑/黄/赤）
- リアルタイムメトリクス表示
- 応答時間グラフ
- エラー率チャート
- 処理キューの可視化
- 診断ツール起動ボタン
```

### 4. API層のモニタリングエンドポイント
`fcis-smac-app/app/api/voicevox-metrics/route.ts`を作成：
- メトリクスの収集と返却
- 診断情報の提供
- パフォーマンス統計

### 5. 開発者向け診断機能
- ネットワーク診断（ping, traceroute相当）
- Docker状態確認
- ログビューアー
- 設定検証ツール

## 検証項目
- [ ] メトリクス収集の精度
- [ ] リアルタイム更新の動作
- [ ] アラート機能の動作確認
- [ ] パフォーマンスへの影響評価

## 成果物
- モニタリングダッシュボード
- リアルタイムメトリクス表示
- 診断ツール群
- アラート機能