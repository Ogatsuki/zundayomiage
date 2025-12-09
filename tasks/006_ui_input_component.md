# タスク詳細
- テキスト入力エリア、制御ボタン、話者選択を含むUIコンポーネントの実装
- アーキテクチャ: FCIS+SMAC
- 層: Shell

## 対象ファイル
- Shell層: fcis-smac-app/shell/ui-input.shell.client.vertical.tsx（新規作成）

## 層別制約
### Shell層
- React統合
- 薄いIOレイヤー
- Contract提供
- 内部状態管理はuseStateで実装
- RUNTIME宣言必須

## 実装要件
1. テキストエリア（複数行、最大1000文字、リアルタイム文字数表示）
2. 開始ボタン（テキストと話者IDをonSynthesizeに渡す）
3. 停止ボタン（onStopコールバック）
4. リセットボタン（テキストクリア、onResetコールバック）
5. 話者選択ドロップダウン：
   - ずんだもん（通常）: ID 3
   - ずんだもん（あまあま）: ID 1
   - ずんだもん（ツンツン）: ID 7
   - ずんだもん（セクシー）: ID 5
6. バリデーション（空文字、最大文字数）
7. Tailwind CSSで緑系統のデザイン

## コントラクト
```typescript
export interface UIInputContract {
  onSynthesize: (text: string, speakerId: number) => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}
```

## 評価基準
- 層の責務遵守・純粋性・テスタビリティ・MVP適性

## Worker記述欄
- [実装完了] UIInputComponentを新規作成しました。
- ファイル: fcis-smac-app/shell/ui-input.shell.client.vertical.tsx
- 実装した機能:
  1. ✅ テキストエリア（複数行、1000文字制限、リアルタイム文字数表示、残り文字数表示）
  2. ✅ 開始ボタン（バリデーション付き、Ctrl+Enterショートカット対応）
  3. ✅ 停止ボタン（処理中のみ有効化）
  4. ✅ リセットボタン（テキストクリア機能）
  5. ✅ 話者選択ドロップダウン（指定4種類、デフォルト通常ずんだもん）
  6. ✅ バリデーション（空文字チェック、文字数制限、エラー表示）
  7. ✅ Tailwind CSSで緑系統のデザイン（グラデーション効果、ホバー状態含む）
- 追加実装:
  - キーボードショートカット（Ctrl+Enter）
  - 文字数制限の視覚的フィードバック（色分け）
  - 処理中のロード状態表示
  - アクセシビリティ（label、title属性）
  - レスポンシブデザイン対応
- アーキテクチャ遵守:
  - Shell層の責務（薄いIOレイヤー、React統合）
  - useStateによる内部状態管理
  - コントラクト定義の厳密実装
  - RUNTIME宣言
- 自己評価: 要件を100%満たし、追加のUX改善も実装

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）