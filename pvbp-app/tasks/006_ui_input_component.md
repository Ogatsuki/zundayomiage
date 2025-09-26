# タスク詳細
- テキスト入力エリア、制御ボタン（開始/停止/リセット）、話者選択を含むUIコンポーネントの実装
- アーキテクチャ: FCIS+SMAC
- 層: Shell

## 対象ファイル
- Shell層: fcis-smac-app/shell/ui-input.shell.client.vertical.tsx（新規作成）

## 層別制約
### Shell層
- React統合
- 薄いIOレイヤー
- Contract提供
- useStateによる内部状態管理
- 親コンポーネントへのコールバック経由での値提供

## 実装要件
1. テキストエリア（複数行、最大1000文字）
2. 開始ボタン（onSynthesizeコールバック呼び出し）
3. 停止ボタン（onStopコールバック呼び出し）
4. リセットボタン（onResetコールバック呼び出し）
5. 話者選択ドロップダウン（ずんだもん等の選択肢）
6. 文字数カウント表示
7. バリデーション（空文字チェック、最大文字数チェック）

## コントラクト定義
```typescript
export interface UIInputContract {
  text: string;
  speakerId: number;
  onTextChange: (text: string) => void;
  onSpeakerChange: (speakerId: number) => void;
  onSynthesize: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}
```

## 評価基準
- 層の責務遵守・純粋性・テスタビリティ・MVP適性

## Worker記述欄
- [実装報告・自己評価]

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）