# AIフレンドリーなモジュール化実装ガイド

## はじめに

本ガイドは、AI駆動開発における「効率の壁」を突破するための実践的な実装パターンを提供します。

## 1. 問題の本質

### AI開発効率が低下する構造的要因

```typescript
// ❌ 悪い例：巨大なモノリシックコンポーネント
export default function GiantComponent() {
  // 状態管理が8個以上
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()
  const [state3, setState3] = useState()
  // ... さらに続く

  // 複雑なビジネスロジック
  const complexLogic = () => {
    // 100行以上の処理
  }

  // API通信
  const fetchData = async () => {
    // 複数のAPIエンドポイント
  }

  // UIレンダリング
  return (
    <div>
      {/* 200行以上のJSX */}
    </div>
  )
}
```

**問題点**：
- AIが1行を修正するために379行全体を理解する必要がある
- 変更の影響範囲が予測困難
- テストが困難

## 2. 解決パターン

### パターン1: 責務の分離

```typescript
// ✅ 良い例：責務ごとに分割

// hooks/useVoiceGeneration.ts
export const useVoiceGeneration = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generate = async (text: string, speaker: number) => {
    // 音声生成のみに集中
  }

  return { audioBlob, isLoading, generate }
}

// components/VoiceGeneratorUI.tsx
export const VoiceGeneratorUI = () => {
  const { audioBlob, isLoading, generate } = useVoiceGeneration()

  // UIのみに集中
  return <div>...</div>
}
```

### パターン2: 設定の外部化

```typescript
// ✅ 良い例：定数とロジックの分離

// config/voicevox.config.ts
export const VOICEVOX_CONFIG = {
  limits: {
    shortText: 1000,
    normalText: 10000,
    longText: 100000
  },
  endpoints: {
    generate: '/api/voicevox/generate',
    generateLong: '/api/voicevox/generate-long'
  },
  timeouts: {
    short: 60000,
    long: 300000
  }
} as const

// services/textStrategy.ts
export const determineTextStrategy = (text: string) => {
  const length = text.length
  const { limits } = VOICEVOX_CONFIG

  if (length <= limits.shortText) return 'short'
  if (length <= limits.normalText) return 'normal'
  if (length <= limits.longText) return 'long'
  return 'invalid'
}
```

## 3. 実装例：VoiceGeneratorのリファクタリング

### Before: 379行のモノリス

```
VoiceGenerator.tsx (379行)
├── 状態管理 (8個)
├── OCR処理
├── 音声生成
├── エラーハンドリング
├── メモリ管理
└── UI表示
```

### After: 機能別モジュール

```
features/voice-generation/
├── components/
│   ├── VoiceGenerator.tsx (50行) - コンテナコンポーネント
│   ├── SpeakerSelector.tsx (30行)
│   └── TextInput.tsx (40行)
├── hooks/
│   ├── useVoiceGeneration.ts (60行)
│   └── useTextValidation.ts (20行)
├── services/
│   └── VoiceService.ts (80行)
└── constants/
    └── config.ts (15行)
```

### 実装詳細

#### 1. コンテナコンポーネント（調整役）

```typescript
// features/voice-generation/components/VoiceGenerator.tsx
export const VoiceGenerator = () => {
  const { generate, isLoading, audioBlob } = useVoiceGeneration()
  const { validate, error } = useTextValidation()

  return (
    <>
      <SpeakerSelector />
      <TextInput onGenerate={generate} validate={validate} />
      {audioBlob && <AudioPlayer blob={audioBlob} />}
      {error && <ErrorDisplay message={error} />}
    </>
  )
}
```

#### 2. 専門化されたフック

```typescript
// features/voice-generation/hooks/useVoiceGeneration.ts
export const useVoiceGeneration = () => {
  const [state, dispatch] = useReducer(voiceReducer, initialState)
  const service = useMemo(() => new VoiceService(), [])

  const generate = useCallback(async (text: string, speaker: number) => {
    dispatch({ type: 'START_GENERATION' })

    try {
      const blob = await service.generate(text, speaker)
      dispatch({ type: 'GENERATION_SUCCESS', payload: blob })
    } catch (error) {
      dispatch({ type: 'GENERATION_ERROR', payload: error })
    }
  }, [service])

  return {
    ...state,
    generate
  }
}
```

#### 3. 独立したサービス層

```typescript
// features/voice-generation/services/VoiceService.ts
export class VoiceService {
  private readonly config = VOICEVOX_CONFIG

  async generate(text: string, speaker: number): Promise<Blob> {
    const strategy = determineTextStrategy(text)
    const endpoint = this.getEndpoint(strategy)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker })
    })

    if (!response.ok) {
      throw new VoiceGenerationError(response)
    }

    return response.blob()
  }

  private getEndpoint(strategy: TextStrategy): string {
    return strategy === 'long'
      ? this.config.endpoints.generateLong
      : this.config.endpoints.generate
  }
}
```

## 4. AIにとっての利点

### 修正タスクの比較

#### タスク例: "テキスト長の閾値を1000文字から2000文字に変更"

**Before（モノリシック）**:
1. 379行のVoiceGenerator.tsxを読む
2. 関連する3つのAPIファイルを確認
3. 5箇所で閾値を変更
4. 影響範囲が不明確

**After（モジュラー）**:
1. config.tsの1行を変更
```typescript
// config/voicevox.config.ts
limits: {
  shortText: 2000, // ← ここだけ変更
}
```

### 認知負荷の削減

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| 読むべきコード行数 | 600-800行 | 50-100行 | 87.5%削減 |
| 理解すべきファイル数 | 5-7個 | 1-2個 | 71%削減 |
| 変更箇所 | 5箇所 | 1箇所 | 80%削減 |

## 5. 段階的移行戦略

### Phase 1: Quick Wins（1-2日）
- [ ] 定数の外部化
- [ ] エラーメッセージの統一
- [ ] 重複コードの削除

### Phase 2: 構造改善（3-5日）
- [ ] カスタムフックの作成
- [ ] サービス層の分離
- [ ] コンポーネントの分割

### Phase 3: アーキテクチャ刷新（1-2週間）
- [ ] Feature-basedディレクトリ構造
- [ ] 状態管理の最適化
- [ ] テストの追加

## 6. ベストプラクティス

### Do's ✅
- 1ファイル1責務の原則
- 100行以下のファイルサイズ
- 明確な命名規則
- 純粋関数の活用
- 依存関係の明示

### Don'ts ❌
- 暗黙的な依存
- グローバル状態の乱用
- 巨大なuseEffect
- ネストの深いコールバック
- マジックナンバー

## 7. 測定指標

### コードメトリクス
```typescript
// utils/codeMetrics.ts
export const analyzeModularity = (filePath: string) => {
  return {
    lines: countLines(filePath),
    complexity: calculateCyclomaticComplexity(filePath),
    dependencies: countDependencies(filePath),
    cohesion: measureCohesion(filePath)
  }
}
```

### 目標値
- ファイルサイズ: < 100行
- 循環的複雑度: < 10
- 依存関係: < 5個
- 凝集度: > 0.8

## まとめ

AIフレンドリーなコードベースは、人間にとっても理解しやすく、保守しやすいコードベースです。小さく、独立したモジュールの集合体として設計することで、AIは各タスクに必要な最小限のコンテキストで作業でき、結果として開発効率が大幅に向上します。

「AIと共に成長するコードベース」を目指しましょう。