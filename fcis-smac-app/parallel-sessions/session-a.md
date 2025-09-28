# セッションA用指示書 - Core層+State層実装

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14, React 18, TypeScript, VOICEVOX API, Tesseract.js
- **開発環境**: Linux, Node.js 20+

### 問題背景（調査結果）
- **現象**: Core層とState層が完全に未実装。すべてのロジックがpage.tsxに集中
- **根本原因**: FCIS+SMACアーキテクチャが適用されていない
- **影響範囲**: 全体的な保守性、テスタビリティ、時間的結合の問題
- **解決目標**: 純粋関数のCore層と状態機械のState層を実装

## 2. 全体設計（決定事項）

### アーキテクチャ決定
FCIS+SMAC完全準拠の3層アーキテクチャ実装：
- Core層: すべてのビジネスロジックを純粋関数として実装
- State層: XStateによる明示的な状態管理
- Shell層: React統合とIO処理（他セッション担当）

### 共通契約仕様
```typescript
// アプリケーション状態定義
export type AppState =
  | { type: 'idle' }
  | { type: 'ocr_uploading'; file: File }
  | { type: 'ocr_processing' }
  | { type: 'ocr_complete'; text: string }
  | { type: 'tts_synthesizing'; text: string; speakerId: number }
  | { type: 'tts_playing'; audioUrl: string }
  | { type: 'error'; message: string; recoverable: boolean };

// Core層の関数インターフェース
export interface CoreFunctions {
  // OCR関連
  validateOCRFile: (file: File) => { isValid: boolean; errors: string[] };
  normalizeOCRText: (text: string) => string;

  // TTS関連
  validateTTSRequest: (text: string, speakerId: number) => { isValid: boolean; errors: string[] };
  buildTTSRequest: (text: string, speakerId: number) => any;

  // UI導出
  deriveUIState: (appState: AppState) => UIState;
}

// UIState定義
export interface UIState {
  showOCRSection: boolean;
  showTTSSection: boolean;
  isProcessing: boolean;
  canSubmitOCR: boolean;
  canSubmitTTS: boolean;
  errorMessage?: string;
  progressMessage?: string;
}
```

## 3. あなたの責任範囲

### 担当領域
- **レイヤー**: Core層 + State層
- **機能**: OCR処理、TTS処理、状態管理
- **スコープ**: 純粋関数の実装と状態機械の定義

### 編集対象ファイル（排他的アクセス）
- `/app/fcis-smac-app/core/ocr.core.ts` - OCR処理の純粋関数（新規作成）
- `/app/fcis-smac-app/core/tts.core.ts` - TTS処理の純粋関数（新規作成）
- `/app/fcis-smac-app/core/ui.core.ts` - UI状態導出関数（新規作成）
- `/app/fcis-smac-app/state/app.machine.ts` - XState状態機械（新規作成）
- `/app/fcis-smac-app/contracts/types.ts` - 共通型定義（新規作成）

## 4. 実装ガイドライン

### FCIS+SMAC準拠チェックリスト

#### Core層実装
- [x] 純粋関数のみ（副作用完全排除）
- [x] No fetch, setState, console.log
- [x] 決定論的（同じ入力→同じ出力）
- [x] 100%ユニットテスト可能
- [x] 不変データ操作のみ

#### State層実装
- [x] 明示的な状態定義
- [x] イベント駆動の状態遷移
- [x] React非依存の実装
- [x] XState使用

## 5. 実装詳細

### OCR Core層関数
```typescript
// /app/fcis-smac-app/core/ocr.core.ts
export function validateOCRFile(file: File): ValidationResult {
  const errors: string[] = [];
  const maxSizeMB = 5;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file) {
    errors.push('ファイルが選択されていません');
  } else {
    if (file.size > maxSizeBytes) {
      errors.push(`ファイルサイズが${maxSizeMB}MBを超えています`);
    }
    if (!file.type.startsWith('image/')) {
      errors.push('画像ファイルを選択してください');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function normalizeOCRText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[０-９]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0xFEE0)
    )
    .replace(/\s+([。、！？])/g, '$1')
    .replace(/([。、！？])\s+/g, '$1');
}
```

### TTS Core層関数
```typescript
// /app/fcis-smac-app/core/tts.core.ts
export function validateTTSRequest(text: string, speakerId: number): ValidationResult {
  const errors: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push('テキストを入力してください');
  } else if (text.length > 30000) {
    errors.push('テキストは30,000文字以内で入力してください');
  }

  if (![2, 3].includes(speakerId)) {
    errors.push('無効な話者IDです');
  }

  return { isValid: errors.length === 0, errors };
}
```

### XState状態機械
```typescript
// /app/fcis-smac-app/state/app.machine.ts
import { createMachine, assign } from 'xstate';

export const appMachine = createMachine({
  id: 'app',
  initial: 'idle',
  context: {
    ocrText: '',
    ttsText: '',
    speakerId: 3,
    audioUrl: '',
    error: null
  },
  states: {
    idle: {
      on: {
        START_OCR: 'ocr_uploading',
        START_TTS: {
          target: 'tts_synthesizing',
          actions: assign({
            ttsText: (_, event) => event.text,
            speakerId: (_, event) => event.speakerId
          })
        }
      }
    },
    ocr_uploading: {
      on: {
        OCR_PROCESS: 'ocr_processing'
      }
    },
    ocr_processing: {
      on: {
        OCR_SUCCESS: {
          target: 'ocr_complete',
          actions: assign({
            ocrText: (_, event) => event.text
          })
        },
        ERROR: 'error'
      }
    },
    ocr_complete: {
      on: {
        START_TTS: {
          target: 'tts_synthesizing',
          actions: assign({
            ttsText: (context) => context.ocrText
          })
        },
        START_OCR: 'ocr_uploading'
      }
    },
    tts_synthesizing: {
      on: {
        TTS_SUCCESS: {
          target: 'tts_playing',
          actions: assign({
            audioUrl: (_, event) => event.audioUrl
          })
        },
        ERROR: 'error'
      }
    },
    tts_playing: {
      on: {
        PLAY_COMPLETE: 'idle',
        START_TTS: 'tts_synthesizing'
      }
    },
    error: {
      on: {
        RESET: 'idle'
      }
    }
  }
});
```

## 6. 実行コマンド

```bash
# 実装ファイル作成
mkdir -p /app/fcis-smac-app/contracts
mkdir -p /app/fcis-smac-app/core
mkdir -p /app/fcis-smac-app/state

# ビルド確認
cd /app/fcis-smac-app
npm run build
npm run type-check
```

## 7. 完了基準

- [x] ビルド成功（エラー: 0）
- [x] TypeScript型チェック完全通過
- [x] Core層に副作用ゼロ
- [x] State層がReact非依存
- [x] すべての状態遷移が明示的

---
**実装開始**: 上記仕様に従ってCore層とState層を実装してください。
**質問がある場合**: 契約の範囲内で最善の判断を行ってください。