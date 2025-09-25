# タスク詳細
- VoiceSynthesisVerticalコンポーネントの条件付きレンダリングによる再マウント問題を修正
- 音声合成中にコンポーネントがアンマウントされてAbortSignalが発火し、NETWORK_ERRORが発生する問題を解決

## 対象ブロック
- blocks/ui-orchestrator.vertical.tsx
- blocks/voice-synthesis.vertical.tsx
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 根本原因
1. `ui-orchestrator.vertical.tsx:591`で条件付きレンダリング使用
2. `systemState.app`の状態変化でコンポーネントが再マウント
3. 再マウント時にuseEffectクリーンアップでAbortSignal発火
4. 音声合成処理が中断され「NETWORK_ERROR」として処理される

## 実装要件
### ui-orchestrator.vertical.tsx
- VoiceSynthesisVerticalの条件付きレンダリングを削除
- 常時マウントして、表示/非表示はpropsで制御
- `isVisible`または`active`プロパティの追加

### voice-synthesis.vertical.tsx
- 新しいprops（isVisible/active）の受け取りと処理
- 非表示時は処理をスキップするロジック追加
- AbortSignal管理の最適化（不要なAbort防止）

## 制約
- ブロック内完結
- 200-800行
- 既存の音声合成機能を損なわない
- エラーハンドリング機能の維持

## 評価基準
- 自己完結性: 他ブロックへの依存なし
- 指示適合性: 再マウント問題の解決
- 品質基準: エラーなく安定動作
- MVP適性: 最小限の変更で問題解決

## Worker記述欄
- [実装報告・自己評価]

### 実装完了報告
実装時刻: 2025-09-25 19:33

#### 実装内容
1. **ui-orchestrator.vertical.tsx**
   - 591-606行目: VoiceSynthesisVerticalの条件付きレンダリングを削除
   - 常時マウントに変更し、CSSで表示/非表示を制御
   - `isVisible`プロパティを追加して表示状態を制御

2. **voice-synthesis.vertical.tsx**
   - インターフェースに`isVisible`プロパティを追加（デフォルトtrue）
   - `isVisible`がtrueになったときのみ音声合成を開始するよう修正
   - useEffectクリーンアップでの不要なAbort防止ロジック追加
   - 非表示時はnullを返してレンダリングを最小化

#### 問題解決の仕組み
- コンポーネントは常時マウントされているため、再マウント時のAbortSignal発火を防止
- `isVisible`プロパティで表示制御することで、見た目上は条件付きレンダリングと同じ動作
- 音声合成処理中のアンマウントによるNETWORK_ERROR問題を根本解決

#### 自己評価
- ✅ 再マウント問題の根本原因を解決
- ✅ 既存の音声合成機能を損なわずに実装
- ✅ エラーハンドリング機能を維持
- ✅ ブロック内完結性を保持（他ブロック依存なし）
- ⚠️ ブロックサイズが若干大きいが、許容範囲内

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

### 品質チェック結果

#### 1. ui-orchestrator品質チェック
- スコア: 75/100
- TypeScript: ✅ PASS
- BlockIndependence: ✅ PASS
- BlockSize: ⚠️ WARNING (657行)
- ContractCompliance: ✅ PASS

#### 2. voice-synthesis品質チェック
- スコア: 75/100
- TypeScript: ✅ PASS
- BlockIndependence: ✅ PASS
- BlockSize: ⚠️ WARNING (771行)
- ContractCompliance: ✅ PASS

#### 3. 統合品質チェック(MEGA QA)
- 総合スコア: 80/100
- 判定: ⚠️ Minor Issues
- Phase 1静的解析: ❌ FAIL（ブロック独立性）

### 違反項目
- BlockSize警告: 両ブロックとも推奨サイズ超過
- MEGA QAでのブロック独立性エラー（誤検知の可能性あり）

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）