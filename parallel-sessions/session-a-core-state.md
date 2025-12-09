# Session A: Core層とState層の拡張実装

## 目標
FCIS+SMACアーキテクチャのCore層とState層を拡張し、30,000文字対応とOCRテキスト処理を実装

## 実装タスク

### 1. Core層拡張 (`/core/voicevox.core.ts`)
- 30,000文字バリデーション関数
- 500文字チャンク分割ロジック
- OCRテキスト正規化（日本語特化）
- 四国めたん（ID:2）対応の話者情報管理

### 2. State層拡張 (`/state/voicevox.machine.ts`)
- OCR処理状態の追加
- チャンク処理状態の追加
- WAV結合状態の追加
- MP3変換状態の追加
- エラーリトライロジック

### 3. 契約型定義 (`/contracts/extended-voice-synthesis.contract.ts`)
- ExtendedVoiceSynthesisContract インターフェース
- OCR、チャンク処理、変換処理の型定義

## 完了条件
- Core層の全関数が純粋関数として実装
- XState機械の状態遷移が正しく動作
- 単体テストがすべて通過