# セッションB用指示書 - 状態管理修正

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 13, React 18, TypeScript, XState
- **開発環境**: Windows, Node.js

### 問題背景（セッション1の調査結果）
- **現象**: 開始ボタンが有効にならない（synthesis.isProcessingが常にundefined）
- **根本原因**: page.tsxでの状態管理が不適切、synthesisMachineRefとsynthesisフックの同期不全
- **影響範囲**: UIコンポーネントの状態表示、ボタンの有効/無効制御
- **解決目標**: useVoicevoxSynthesisフックを正しく使用し、状態を適切に管理

## 2. 全体設計（セッション1決定事項）

### アーキテクチャ決定
- useVoicevoxSynthesisフックを直接使用（refによる間接参照を削除）
- React 18 StrictMode対応の維持
- XStateマシンの状態を正しくUIに反映
- 不要な強制再レンダリング（synthesisKey）を削除

### 共通契約仕様
```typescript
// VoiceSynthesisContract（既存、contracts/voice-synthesis.contract.ts）
interface VoiceSynthesisContract {
  synthesizeVoice: (text: string, speakerId: number) => Promise<void>;
  stopSynthesis: () => void;
  getProgress: () => SynthesisProgress;
  isConnected: () => boolean;
  error: ErrorInfo | null;
  isIdle: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  updateConfig: (config: Partial<SynthesisConfig>) => void;
  getConfig: () => SynthesisConfig;
  updateSpeaker: (speakerId: number) => void;
  getSpeakerId: () => number;
  getFinalAudio: () => Blob | null;
  downloadAudio: (filename?: string) => void;
  retryLastSynthesis: () => void;
  canRetry: () => boolean;
  reset: () => void;
}
```

### タスク間依存関係
- 依存元: セッションA（APIルート）- 実際のHTTP通信はShell層が処理
- 依存先: セッションC（UIコンポーネント）- 状態を正しく渡す必要がある

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（React統合）
- **機能**: 状態管理の修正とUIコンポーネントへの状態配信
- **スコープ**: page.tsxの修正、状態管理ロジックの改善

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/app/page.tsx` - 状態管理ロジックの修正

### 入出力契約
**入力仕様**:
```typescript
// useVoicevoxSynthesisフックから取得
const synthesis = useVoicevoxSynthesis();
// synthesisオブジェクトはVoiceSynthesisContract型
```

**出力仕様**:
```typescript
// UIコンポーネントに渡す状態
{
  isProcessing: boolean,        // 処理中フラグ（必ずboolean）
  isCompleted: boolean,          // 完了フラグ
  isFailed: boolean,             // エラーフラグ
  error: ErrorInfo | null,       // エラー情報
  progress: SynthesisProgress,   // 進捗情報
  canRetry: boolean              // リトライ可能フラグ
}
```

### 制約事項
- synthesisMachineRefを削除し、直接synthesisオブジェクトを使用
- synthesisKeyによる強制再レンダリングを削除
- React 18 StrictModeでの二重実行を考慮
- VoicevoxSynthesisBlockコンポーネントの削除または簡略化を検討

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Shell層実装の場合
- [x] 薄いIO層として実装（状態管理のみ、ビジネスロジックなし）
- [x] React Hooks適切使用（useCallback, useMemoで最適化）
- [x] 副作用の適切な管理（useEffect使用時の依存配列）
- [x] 契約の明確な提供（型安全性の確保）

## 5. 実行ステップ

### ステップ1: 現状分析（10分）
```
□ page.tsxの現在の問題点を確認
□ synthesisMachineRefの使用箇所を特定
□ synthesisKeyの使用箇所を特定
□ VoicevoxSynthesisBlockの使用方法を確認
```

### ステップ2: 実装（30分）
```
□ synthesisMachineRefを削除
□ synthesis直接使用に変更
□ synthesisKey関連コードを削除
□ イベントハンドラーを修正
□ 状態取得ロジックを簡略化
□ VoicevoxSynthesisBlockの使用を最適化
```

### ステップ3: 検証（15分）
```bash
# 型チェック
cd /app/fcis-smac-app
npm run typecheck

# ビルド確認
npm run build

# 開発サーバーで動作確認
npm run dev

# ブラウザで確認
# 1. テキスト入力時に開始ボタンが有効になること
# 2. synthesis.isProcessingが正しくbooleanを返すこと
# 3. 状態遷移が正しく動作すること
```

## 6. 完了基準

### 必須項目
- [ ] synthesis.isProcessingが常にboolean値を返す
- [ ] テキスト入力時に開始ボタンが有効になる
- [ ] 処理中は開始ボタンが無効になる
- [ ] 状態遷移が正しく動作する
- [ ] TypeScript型エラーがゼロ

### 品質項目
- [ ] 不要な再レンダリングが削除されている
- [ ] React 18 StrictModeで正常動作
- [ ] メモリリークがない
- [ ] パフォーマンスが改善されている

## 7. トラブルシューティングガイド

### よくある問題と解決策

**synthesis.isProcessingがundefined**
- 問題: フックの初期化タイミング
- 解決: useVoicevoxSynthesisの返り値を直接使用、Optional chainingで安全にアクセス

**ボタンが有効にならない**
- 問題: disabled条件の評価
- 解決: synthesis?.isProcessing ?? falseのようにデフォルト値を設定

**状態更新が反映されない**
- 問題: Reactの再レンダリングタイミング
- 解決: 依存配列を正しく設定、useCallbackで関数を安定化

**React 18 StrictModeで二重実行**
- 問題: 副作用が2回実行される
- 解決: useEffectOnceパターンの使用、Shell層のuseEffectOnce実装を参照

## 8. 参考コード例

```tsx
// 修正例（概要）
export default function Home() {
  const [inputText, setInputText] = useState('');
  const [currentSpeakerId, setCurrentSpeakerId] = useState(3);

  // 直接フックを使用
  const synthesis = useVoicevoxSynthesis();

  // シンプルなイベントハンドラー
  const handleSynthesize = useCallback((text: string, speakerId: number) => {
    if (text.trim()) {
      setInputText(text);
      setCurrentSpeakerId(speakerId);
      synthesis.synthesizeVoice(text, speakerId).catch((error) => {
        console.error('Synthesis failed:', error);
      });
    }
  }, [synthesis]);

  // UIコンポーネントに渡す
  return (
    <UIInputComponent
      onSynthesize={handleSynthesize}
      disabled={synthesis?.isProcessing ?? false}
      isProcessing={synthesis?.isProcessing ?? false}
    />
  );
}
```

## 9. 参考資料
- React 18 Strict Mode: https://react.dev/reference/react/StrictMode
- XState React: https://xstate.js.org/docs/packages/xstate-react/
- FCIS+SMAC仕様: `/app/docs/state/ai-architecture-knowledge-fcis-smac.json`

---
**実装開始**: 上記指示に従って実装を開始してください。
**完了後**: synthesis.isProcessingが正しく動作し、UIが適切に更新されることを確認してください。