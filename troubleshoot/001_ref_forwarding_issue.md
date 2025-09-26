# PVBP Architecture Critical Issue Report #001

## 問題概要
**発生日**: 2025-09-26
**深刻度**: 🔴 Critical
**影響範囲**: PVBP垂直統合アーキテクチャ全体
**ステータス**: 未解決（暫定対応実施）

## 症状
VOICEVOXサーバーは正常に稼働しているにもかかわらず、アプリケーションで「VOICEVOXサーバーに接続できません」エラーが継続的に発生。

### エラーメッセージ
```
VOICEVOXサーバーに接続できません。localhost:50021でVOICEVOXが起動していることを確認してください。
```

## 技術的詳細

### 環境
- **React**: 18.x with StrictMode
- **Next.js**: 14.2.33
- **アーキテクチャ**: PVBP (Pragmatic Vertical Blocks Protocol) v1.0.0
- **実行環境**: Docker Compose (app + voicevox containers)

### 問題の根本原因

#### 1. Ref転送メカニズムの破綻
```typescript
// VoicevoxApiWrapper.client.vertical.tsx
const VoicevoxApiWrapper = forwardRef<any, VoicevoxApiWrapperProps>((props, ref) => {
  const api = VoicevoxApiVertical(); // Hook呼び出し

  useImperativeHandle(ref, () => {
    console.log('VoicevoxApiWrapper ref is being set up with API:', api);
    return api;
  });
  // ...
});

// page.tsx
const voicevoxApiRef = useRef<any>(null);
// ...
useEffect(() => {
  const checkConnection = async () => {
    // voicevoxApiRef.current が常にnullまたはundefined
    if (voicevoxApiRef.current?.checkConnection) {
      // このブロックに到達しない
    }
  };
}, []);
```

#### 2. React 18 StrictModeの影響
- コンポーネントの二重レンダリング
- マウント→アンマウント→再マウントの繰り返し
- refの破棄と再設定のタイミング問題

#### 3. PVBPアーキテクチャの構造的問題
```
[問題の構造]
┌──────────────────┐
│   page.tsx       │
│  (親コンポーネント) │
└────────┬─────────┘
         │ ref転送が失敗
         ↓
┌──────────────────┐
│ VoicevoxApiWrapper│
│  (display:none)   │ ← 非表示でレンダリング
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ useVoicevoxApi   │
│    (Hook)        │ ← 実際のAPIロジック
└──────────────────┘
```

## デバッグログ分析

### コンソール出力
```javascript
// 期待される動作
1. "Starting VOICEVOX connection check..."
2. "VoicevoxApiWrapper ref is being set up with API: {checkConnection: ƒ, ...}"
3. "VoicevoxApi ref is available, checking connection..."
4. "Connection check result: true"

// 実際の動作
1. "Starting VOICEVOX connection check..."
2. "Connection check attempt 1/10"
3. "VoicevoxApi ref not ready yet, waiting..." // ← 10回繰り返し
4. "VoicevoxApi ref not available after 5 seconds" // ← タイムアウト
```

### 並行して発生するログ
```javascript
// VoicevoxApiWrapperの頻繁な再マウント
"VoicevoxApiWrapper mounted, API instance: {isConnected: false, ...}"
"VoicevoxApiWrapper unmounting"
"VoicevoxApiWrapper mounted, API instance: {isConnected: true, ...}"
"VoicevoxApiWrapper unmounting"
// これが繰り返される
```

## PVBPアーキテクチャへの影響

### 1. 垂直統合の原則違反リスク
- **自己完結性**: 各ブロックが独立しているため、ref経由の連携が困難
- **明示性**: refを通じた暗黙的な依存が発生
- **契約最小化**: refインターフェースが複雑化

### 2. React 18互換性問題
PVBPは以下のReact 18機能と相性が悪い：
- Concurrent Features
- Automatic Batching
- StrictMode の二重レンダリング

### 3. 時間的結合の問題
```typescript
// 時間軸上の依存関係
T0: Parent component mount
T1: useEffect scheduled (1000ms delay)
T2: Child component dynamic import starts
T3: Child component renders (first time)
T4: StrictMode unmounts child
T5: Child re-mounts
T6: useImperativeHandle sets ref (but parent can't see it)
T7: checkConnection executes (ref is null)
```

## 暫定対応策

### 実施済み対応
```typescript
// app/voice-synthesis/page.tsx
useEffect(() => {
  const checkConnection = async () => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      if (voicevoxApiRef.current?.checkConnection) {
        // 成功時の処理
        break;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  checkConnection();
}, []);
```

**結果**: 失敗（refが永続的に取得できない）

## 推奨される恒久対策

### 短期対策
1. **直接fetch実装**
   ```typescript
   // シンプルで確実な実装
   const checkConnection = async () => {
     try {
       const res = await fetch('http://localhost:50021/version');
       setIsConnected(res.ok);
     } catch {
       setIsConnected(false);
     }
   };
   ```

### 中期対策
2. **Context APIの活用**
   ```typescript
   // VoicevoxContext.tsx
   const VoicevoxContext = createContext<VoicevoxApiContract | null>(null);

   export const VoicevoxProvider: FC = ({ children }) => {
     const api = useVoicevoxApi();
     return (
       <VoicevoxContext.Provider value={api}>
         {children}
       </VoicevoxContext.Provider>
     );
   };
   ```

### 長期対策（アーキテクチャ改善）
3. **PVBPパターンライブラリの拡充**
   - React 18対応パターンの追加
   - Ref転送パターンの確立
   - 時間的結合問題の解決策

## 学習事項

### PVBPの限界
1. **Refベースの連携は避けるべき**
   - 垂直統合の原則と矛盾
   - React 18で不安定

2. **動的インポートとrefの相性が悪い**
   - タイミング問題が発生しやすい
   - デバッグが困難

3. **StrictModeとの共存戦略が必要**
   - 二重レンダリングを前提とした設計
   - クリーンアップの適切な実装

## 提案

### PVBP v1.1.0への改善提案
1. **RefPatternの追加**
   ```typescript
   // 新パターン: useStableRef
   const useStableRef = <T,>(initialValue: T) => {
     const ref = useRef<T>(initialValue);
     const [, forceUpdate] = useReducer(x => x + 1, 0);

     const setRef = useCallback((value: T) => {
       ref.current = value;
       forceUpdate();
     }, []);

     return [ref, setRef] as const;
   };
   ```

2. **BridgeBlockパターン**
   - ブロック間連携専用の中間層
   - Context + Reducer による状態管理
   - Refに依存しない実装

3. **時間的結合の解決**
   - TVIP (Temporal Vertical Integration Protocol) の早期実装
   - ライフサイクル管理の改善

## 結論

PVBPアーキテクチャは空間的結合を解決したが、時間的結合とReact 18の新機能との互換性に課題がある。特にref転送を伴うブロック間連携は、アーキテクチャの根本的な見直しが必要。

**推奨アクション**:
1. ✅ 即座：直接fetch実装で問題を回避
2. 🔄 短期：Context APIベースの実装に移行
3. 📋 長期：PVBP v1.1.0でパターンライブラリ拡充

## 関連ファイル
- `/pvbp-app/app/voice-synthesis/page.tsx`
- `/pvbp-app/blocks/voicevox-api-wrapper.client.vertical.tsx`
- `/pvbp-app/blocks/voicevox-api.client.vertical.tsx`
- `/pvbp-app/tasks/002_voicevox_connection_fix.md`

## 追跡情報
- **報告者**: AI PM Agent
- **タスクID**: 002
- **優先度**: P0 (Critical)
- **次回レビュー**: アーキテクチャ改善会議にて