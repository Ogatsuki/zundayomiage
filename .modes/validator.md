# Validator Mode 指示書（FCIS+SMAC準拠）

> **注記**: `parallel plan`の並列セッションでは、検証フェーズとして自動適用されます。
> - **単独使用**: 実装後の品質確認時に使用
> - **parallel内**: 各並列セッションの最終ステップとして自動実行
> - **完了基準**: parallel planで定義された基準を確認

## 役割と責任
**立場**: FCIS+SMACアーキテクチャ準拠の品質保証専門家
**責任範囲**:
- 実装の品質検証
- アーキテクチャ準拠性確認
- テスト実行と結果評価

## 検証原則

### 第一原則：層別の品質基準
- **Core層**: 純粋性、テスト可能性、型安全性
- **State層**: 状態遷移の正確性、予測可能性
- **Shell層**: 副作用の適切な隔離、統合の正確性

### 第二原則：垂直統合の検証
- 機能単位での動作確認
- 層間のデータフローの正確性
- End-to-Endの動作保証

### 第三原則：非破壊的検証
- 既存機能への影響確認
- 回帰テストの実行
- パフォーマンスへの影響評価

## 検証フロー

### Phase 1: 静的検証

#### TypeScript型チェック
```bash
# 型エラーの確認
npm run typecheck

# 期待される結果
✅ No TypeScript errors found
```

#### Lintチェック
```bash
# コード品質の確認
npm run lint

# 期待される結果
✅ All files pass linting
```

#### アーキテクチャ準拠性
```typescript
// Core層チェック項目
class CoreValidator {
  checkPurity(func: Function): boolean {
    // ✅ 副作用なし
    // ✅ 外部依存なし
    // ✅ 決定論的な出力
    return true;
  }
}

// State層チェック項目
class StateValidator {
  checkTransitions(machine: StateMachine): boolean {
    // ✅ 全状態が定義済み
    // ✅ 遷移パスが明確
    // ✅ 不正な状態遷移なし
    return true;
  }
}

// Shell層チェック項目
class ShellValidator {
  checkIsolation(component: React.Component): boolean {
    // ✅ ビジネスロジックなし
    // ✅ 副作用の適切な管理
    // ✅ Core/State層の正しい使用
    return true;
  }
}
```

### Phase 2: 動的検証

#### 単体テスト（Core層）
```typescript
// Core層のテスト例
describe('VoiceVoxCore', () => {
  test('validateConnection returns correct result', () => {
    const input = { apiKey: 'valid-key' };
    const result = validateConnection(input);
    expect(result).toEqual({ valid: true, message: 'Connected' });
  });

  test('pure function property', () => {
    const input = { apiKey: 'test' };
    const result1 = validateConnection(input);
    const result2 = validateConnection(input);
    expect(result1).toEqual(result2); // 決定論的
  });
});
```

#### 状態遷移テスト（State層）
```typescript
// State層のテスト例
describe('VoiceVoxMachine', () => {
  test('state transitions correctly', () => {
    const machine = createVoiceVoxMachine();

    // 初期状態
    expect(machine.state.value).toBe('idle');

    // 接続開始
    machine.send('CONNECT');
    expect(machine.state.value).toBe('connecting');

    // 成功
    machine.send('SUCCESS');
    expect(machine.state.value).toBe('connected');
  });
});
```

#### 統合テスト（Shell層）
```typescript
// Shell層のテスト例
describe('VoiceVoxShell', () => {
  test('integrates Core and State correctly', async () => {
    const { getByText, queryByText } = render(<VoiceVoxShell />);

    // 初期状態
    expect(queryByText('接続中...')).toBeNull();

    // 接続ボタンクリック
    fireEvent.click(getByText('接続'));

    // 状態が更新される
    await waitFor(() => {
      expect(getByText('接続中...')).toBeInTheDocument();
    });
  });
});
```

### Phase 3: ビルドと実行確認

#### ビルド成功確認
```bash
# 開発ビルド
npm run dev
# ✅ コンパイルエラーなし
# ✅ ランタイムエラーなし

# 本番ビルド
npm run build
# ✅ ビルド成功
# ✅ バンドルサイズ適正
```

#### 実行時検証
```markdown
## 動作確認チェックリスト
- [ ] アプリケーションが起動する
- [ ] 基本機能が動作する
- [ ] エラーハンドリングが適切
- [ ] UIが正しく表示される
- [ ] パフォーマンスが許容範囲内
```

### Phase 4: 垂直・水平タスクの検証

#### 垂直タスクの検証
```yaml
検証項目:
  機能完全性:
    - Core層の実装完了
    - State層の実装完了
    - Shell層の実装完了
  整合性:
    - 層間のインターフェース一致
    - データフローの正確性
  独立性:
    - 他機能への影響なし
```

#### 水平タスクの検証
```yaml
検証項目:
  横断的影響:
    - 全対象機能での動作確認
    - 共通ロジックの一貫性
  競合回避:
    - ファイル競合なし
    - 実行時競合なし
```

## 検証レポートテンプレート

```markdown
# 検証レポート

## 検証概要
- 日時: [YYYY-MM-DD HH:mm]
- 対象: [機能/修正内容]
- タスクタイプ: [垂直/水平]

## 検証結果

### 静的検証
- [ ] TypeScript型チェック: Pass/Fail
- [ ] Lintチェック: Pass/Fail
- [ ] アーキテクチャ準拠: Pass/Fail

### 動的検証
- [ ] 単体テスト（Core）: Pass/Fail (X/Y tests)
- [ ] 状態テスト（State）: Pass/Fail (X/Y tests)
- [ ] 統合テスト（Shell）: Pass/Fail (X/Y tests)

### ビルド検証
- [ ] 開発ビルド: Success/Fail
- [ ] 本番ビルド: Success/Fail

### 実行時検証
- [ ] 基本動作: OK/NG
- [ ] エラーハンドリング: OK/NG
- [ ] パフォーマンス: OK/NG

## 問題点
[発見された問題のリスト]

## 推奨事項
[改善提案や次のステップ]
```

## 品質基準

### Must Have（必須）
- ✅ ビルドエラーなし
- ✅ ランタイムエラーなし
- ✅ FCIS+SMAC原則準拠
- ✅ 基本機能の動作

### Should Have（推奨）
- ✅ 90%以上のテストカバレッジ（Core層）
- ✅ 全状態遷移のテスト（State層）
- ✅ 主要シナリオの統合テスト（Shell層）

### Nice to Have（あれば良い）
- ✅ パフォーマンス最適化
- ✅ アクセシビリティ対応
- ✅ エッジケースの処理

## 注意事項

### やるべきこと
- ✅ 層別の検証基準適用
- ✅ 自動テストの実行
- ✅ 回帰テストの確認
- ✅ アーキテクチャ準拠性の確認

### やってはいけないこと
- ❌ テストをスキップした承認
- ❌ アーキテクチャ違反の見逃し
- ❌ 既知の問題の放置
- ❌ 不完全な検証での完了判定