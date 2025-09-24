# タスク詳細（What）:
- VOICEVOXのスピーカーID選択が機能しない問題を修正
- APIエンドポイントでリクエストボディから送られてくるspeaker IDを正しく使用するように修正
- 現在はZUNDAMON_SPEAKER_IDで固定されているのを、動的に変更可能にする

## 理由・背景(Why)
- ユーザーが四国めたんを選択しても、ずんだもんの声で生成されてしまう
- MVPとして複数キャラクターの選択は必須機能
- 既にフロントエンドから正しくspeaker IDが送信されている

## 実装方法(How)
- 29行目の`const speaker = ZUNDAMON_SPEAKER_ID`を修正
- `const speaker = body.speaker || ZUNDAMON_SPEAKER_ID`に変更
- body.speakerが存在しない場合のみデフォルト値を使用

## 実装場所(Where)
- app/api/voicevox/generate/route.ts

## 制約
- 既存のエラーハンドリングを破壊しない
- デフォルト値（ZUNDAMON_SPEAKER_ID）の後方互換性を維持
- speakerパラメータの検証は既存のまま

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- ずんだもんと四国めたんの両方で正しく音声生成できるか
- speakerが未指定の場合にデフォルトが機能するか

## Worker記述欄 実装報告等記入欄
- app/api/voicevox/generate/route.tsの29行目を修正
- `const speaker = ZUNDAMON_SPEAKER_ID`から`const speaker = body.speaker || ZUNDAMON_SPEAKER_ID`に変更
- リクエストボディからspeakerパラメータを受け取るようにし、未指定の場合はデフォルト値を使用
- 既存のエラーハンドリングやパラメータ検証は変更せず、後方互換性を維持
- MVPとして最小限の修正のみ実施

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- Yes
- 指示通り29行目のコードを修正し、動的なスピーカー選択が可能になった
- デフォルト値の後方互換性も維持されている

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示
- 指示への適合: 5/5 - 29行目を正確に修正
- MVP適性: 5/5 - 最小限の修正で問題解決
- 両キャラクター動作: 5/5 - ずんだもんと四国めたん両方で確認
- デフォルト機能: 5/5 - 後方互換性完璧に維持

**総合評価: 完璧な実装。修正不要。**