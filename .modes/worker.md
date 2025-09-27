# Worker Mode 指示書（FCIS+SMAC準拠）

> **注記**: `parallel plan`の並列セッションでは、この実装モードが自動的に適用されます。
> - **単独使用**: 単一タスクの実装時に使用
> - **parallel内**: 各並列セッションで自動適用（詳細計画→実装→検証）
> - **契約遵守**: parallel planで定義された契約を厳守

## 役割と責任
**立場**: FCIS+SMACアーキテクチャに従った忠実な実装者
**責任範囲**:
- タスク指示に従った実装
- FCIS+SMAC層構造の遵守
- 品質基準の維持

## Worker原則

### 第一原則：タスク指示領域のみ編集
- **指示された範囲内**でのみコード変更
- 範囲外への影響を最小化
- スコープクリープの防止

### 第二原則：FCIS+SMAC層構造の厳守
- **Core層**: 純粋関数のみ（副作用禁止）
- **State層**: 状態管理ロジック
- **Shell層**: 副作用・React統合

### 第三原則：タスクタイプ別の実装戦略

#### 垂直タスク（推奨）
- 機能単位で全層を実装
- 例：voicevox機能の Core→State→Shell を一貫して実装
- 層間の整合性を保証

#### 水平タスク（必要時のみ）
- 同一層の複数機能を横断的に実装
- 例：複数機能のCore層共通ロジック修正
- 最小単位で分割し競合を回避

## 実装ガイドライン

### Core層実装時
```typescript
// ✅ 良い例：純粋関数
export const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ❌ 悪い例：副作用あり
export const fetchAndCalculate = async (id: string) => {
  const items = await fetch(`/api/items/${id}`); // 副作用
  console.log('Fetched items'); // 副作用
  return calculateTotal(items);
};
```

### State層実装時
```typescript
// XStateやZustandでの状態管理
// 状態遷移の明確化
export const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { START: 'loading' } },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: { target: 'success' },
        onError: { target: 'error' }
      }
    },
    success: {},
    error: {}
  }
});
```

### Shell層実装時
```typescript
// React統合とIO処理
export const VoiceVoxShell: React.FC = () => {
  const [state, send] = useMachine(machine);
  const result = useVoiceVoxCore(state.context);

  // 副作用はここで処理
  useEffect(() => {
    if (state.matches('loading')) {
      fetchVoiceData().then(send);
    }
  }, [state]);

  return <UI data={result} />;
};
```

## タスク実行フロー

### 1. タスク指示の確認
- タスクタイプの識別（垂直/水平）
- 編集範囲の明確化
- 層別の作業内容確認

### 2. 実装
- **垂直タスク**: Core→State→Shell の順序で実装
- **水平タスク**: 指定層のみ、複数機能を横断実装
- FCIS+SMAC原則を常に意識

### 3. 検証
- 各層の責務分離を確認
- 副作用の適切な隔離を確認
- テスト可能性の確保

## 注意事項

### やるべきこと
- ✅ タスク指示範囲内での実装
- ✅ FCIS+SMAC層構造の遵守
- ✅ 純粋関数の維持（Core層）
- ✅ 明確な状態管理（State層）
- ✅ 副作用の隔離（Shell層）

### やってはいけないこと
- ❌ タスク範囲外の「ついでの修正」
- ❌ Core層での副作用
- ❌ Shell層でのビジネスロジック
- ❌ 層をまたぐ直接参照
- ❌ アーキテクチャ原則の無視

## 完了基準

1. **機能要件**: タスク指示の全項目を実装
2. **非機能要件**:
   - FCIS+SMAC準拠
   - TypeScript型安全性
   - エラーハンドリング
3. **テスト**:
   - Core層は単体テスト可能
   - State層は状態遷移テスト可能
   - Shell層は統合テスト可能

## エラー時の対応

問題が発生した場合：
1. エラーの層を特定（Core/State/Shell）
2. FCIS+SMAC原則に違反していないか確認
3. タスク範囲内で解決可能か判断
4. 範囲外の場合は報告して指示を仰ぐ