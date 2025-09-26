# タスク詳細
FCIS+SMACアーキテクチャのShell層実装。ReactとXStateマシンの統合、IOハンドリング。

## 対象ブロック
- fcis-smac-app/shell/voicevox.shell.client.vertical.tsx
- 参照可能: core/voicevox.core.ts, state/voicevox.machine.ts, contracts/*.ts

## 実装要件
### React Hook実装
```typescript
export function useVoicevoxSynthesis(): VoiceSynthesisContract {
  // XStateマシンの使用
  const [state, send] = useMachine(voicevoxMachine);

  // Core関数の活用
  // State管理の統合
  // 副作用の処理

  return {
    // Contract準拠のインターフェース
    synthesizeVoice,
    stopSynthesis,
    getProgress,
    isConnected,
    error
  };
}
```

### 副作用処理（Shell層のみ）
1. **HTTP通信**
   ```typescript
   const fetchAudioQuery = async (text: string, speaker: number) => {
     const response = await fetch(`${API_URL}/audio_query`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ text, speaker })
     });
     return response.json();
   };
   ```

2. **音声再生**
   ```typescript
   const playAudio = async (audioBlob: Blob) => {
     const audio = new Audio(URL.createObjectURL(audioBlob));
     await audio.play();
   };
   ```

3. **エラーハンドリング**
   ```typescript
   useEffect(() => {
     if (state.matches('error')) {
       console.error('Synthesis error:', state.context.error);
       onError?.(state.context.error.code);
     }
   }, [state]);
   ```

### React 18 StrictMode対応
```typescript
// useEffectOnceパターン活用
const useEffectOnce = (effect: () => void | (() => void)) => {
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return effect();
    }
  }, []);
};

// AbortController管理
const useAbortSafe = () => {
  const abortRef = useRef<AbortController>();
  // 実装詳細...
};
```

### コンポーネント実装
```typescript
export const VoicevoxSynthesisBlock: React.FC<Props> = ({
  text,
  speakerId,
  onComplete,
  onError
}) => {
  const synthesis = useVoicevoxSynthesis();

  return (
    <div className="voice-synthesis-block">
      {/* UI実装 */}
    </div>
  );
};

// Runtime宣言
export const RUNTIME = 'client' as const;
```

## 制約
- Shell層として薄く保つ
- ビジネスロジックはCore/Stateに委譲
- React 18 StrictMode完全対応
- PVBP垂直統合維持
- 200-800行

## Contract準拠
```typescript
interface VoiceSynthesisContract {
  synthesizeVoice: (text: string, speakerId: number) => Promise<void>;
  stopSynthesis: () => void;
  getProgress: () => number;
  isConnected: () => boolean;
  error: ErrorInfo | null;
}
```

## 評価基準
- 層の責務遵守: Shell層として適切
- 指示適合性: Core/State統合完了
- 品質基準: React 18対応
- MVP適性: 必要十分な機能

## Worker記述欄
### 実装完了報告
✅ FCIS+SMACアーキテクチャのShell層を`fcis-smac-app/shell/voicevox.shell.client.vertical.tsx`に実装完了

### 実装内容
- ✅ React 18 StrictMode対応ユーティリティ（useEffectOnce, useAbortSafe等）
- ✅ useVoicevoxSynthesis Hook（XState統合）
- ✅ VoicevoxSynthesisBlockコンポーネント
- ✅ 副作用処理（HTTP通信、音声再生、エラーハンドリング）
- ✅ VoiceSynthesisContract準拠

### 制約遵守状況
- ✅ Shell層として薄く実装（IOと副作用のみ）
- ✅ ビジネスロジックはCore/Stateに委譲
- ✅ React 18 StrictMode対応
- ✅ 583行（200-800行範囲内）

## PM品質チェック欄（必須）
### 品質ツール実行結果（修正後）
1. quality-checker.js: **スコア 100/100 PASS**
   - TypeScript: 0件のエラー ✅
   - ContractCompliance: PASS ✅
   - Syntax: PASS ✅

2. mega-qa.js: **スコア 98/100 Production Ready**
   - 静的解析: PASS ✅
   - ビルド: PASS ✅
   - E2Eテスト: PASS ✅

### 修正実施内容
- @xstate/react v6.0.0へアップデート完了
- XState v5互換のfromPromise関数適用
- 関数名衝突を回避（getProgress → getSynthesisProgress等）
- 型キャストと明示的型定義追加

## PM評価欄（必須）
### 4項目評価（各5点満点）- 修正後
- **層の責務遵守**: 5点（Shell層として適切に実装）
- **指示適合性**: 5点（Core/State統合完了、型定義問題解決）
- **品質基準**: 5点（TypeScriptエラー0件、品質スコア100/100）
- **MVP適性**: 5点（必要十分な機能を提供）

### 総合評価: **20/20点（100%）**
### 判定: **合格** - 修正完了、Production Ready