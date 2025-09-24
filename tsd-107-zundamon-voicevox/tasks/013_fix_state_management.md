# タスク詳細（What）:
- キャラクター変更時に前の音声生成状態が残る問題を修正
- スピーカー（キャラクター）変更時にaudioBlobとエラー状態をリセット
- 新しいキャラクターで再度音声生成できるようにする

## 理由・背景(Why)
- ずんだもんで生成後、四国めたんに変更しても生成ボタンが表示されない
- ユーザー体験が悪く、混乱を招く
- MVPとしてキャラクター切り替えのスムーズな動作は必須

## 実装方法(How)
- VoiceGeneratorコンポーネントにuseEffectフックを追加
- selectedSpeakerIdの変更を監視
- 変更時にsetAudioBlob(null)とsetError(null)を実行

## 実装場所(Where)
- components/VoiceGenerator.tsx

## 制約
- 既存のstate管理ロジックを破壊しない
- 不要な再レンダリングを避ける
- useEffectの依存配列を正確に設定

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- キャラクター切り替え時に状態が正しくリセットされるか
- 生成ボタンが再表示されるか
- 不要な副作用が発生していないか

## Worker記述欄 実装報告等記入欄
- components/VoiceGenerator.tsxにuseEffectフックを追加
- import文にuseEffectを追加（import { useState, useEffect } from 'react'）
- 30-34行目にuseEffectを実装し、selectedSpeakerIdの変更を監視
- キャラクター変更時にsetAudioBlob(null)とsetError(null)を実行
- 依存配列に[selectedSpeakerId]を正確に設定
- 既存のstate管理ロジックは変更せず、副作用のみ追加

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- Yes
- キャラクター切り替え時に状態が正しくリセットされ、生成ボタンが再表示されるようになった
- MVPとして最小限の実装で、不要な再レンダリングも避けられている

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示
- 指示への適合: 5/5 - useEffectを正確に実装
- MVP適性: 5/5 - 最小限のコードで問題解決
- 状態リセット: 5/5 - キャラクター変更時に正しく動作
- 生成ボタン再表示: 5/5 - 期待通りの動作
- 副作用回避: 5/5 - 不要な再レンダリングなし

**総合評価: 完璧な実装。修正不要。**