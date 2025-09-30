# 読み上げ履歴機能 - 疑似コード仕様書
Version: 1.0.0
Architecture: FCIS+SMAC

## 1. Core層 - 履歴管理の純粋関数

### 1.1 型定義
```pseudo
type HistoryItem = {
  id: string          // UUID
  text: string        // 読み上げたテキスト
  speakerId: number   // 話者ID
  timestamp: number   // Unix timestamp
  displayText: string // 表示用短縮テキスト（最初の50文字）
}

type HistoryState = {
  items: HistoryItem[]
  maxItems: number = 10
}
```

### 1.2 履歴追加関数
```pseudo
function addToHistory(currentHistory: HistoryItem[], newItem: HistoryData, maxItems: number) {
  // 入力検証
  if (!newItem.text または newItem.text が空) {
    return currentHistory  // 変更なし
  }

  // 重複チェック（同じテキスト＋話者の組み合わせ）
  既存アイテム = currentHistory.find(item =>
    item.text === newItem.text かつ
    item.speakerId === newItem.speakerId
  )

  if (既存アイテムが存在) {
    // 既存アイテムを最新にする（削除して再追加）
    フィルター済み = currentHistory.filter(item => item.id !== 既存アイテム.id)
    新しいアイテム = {
      ...既存アイテム,
      timestamp: 現在時刻
    }
    return [新しいアイテム, ...フィルター済み].slice(0, maxItems)
  } else {
    // 新規アイテムとして追加
    新しいアイテム = {
      id: generateUUID(),
      text: newItem.text,
      speakerId: newItem.speakerId,
      timestamp: 現在時刻,
      displayText: newItem.text.slice(0, 50) + (長い場合 "...")
    }
    return [新しいアイテム, ...currentHistory].slice(0, maxItems)
  }
}
```

### 1.3 履歴削除関数
```pseudo
function removeFromHistory(currentHistory: HistoryItem[], itemId: string) {
  if (!itemId) {
    return currentHistory
  }

  return currentHistory.filter(item => item.id !== itemId)
}
```

### 1.4 履歴クリア関数
```pseudo
function clearHistory(currentHistory: HistoryItem[]) {
  return []  // 空配列を返す
}
```

### 1.5 履歴検証関数
```pseudo
function validateHistoryItem(item: unknown) {
  if (!item がオブジェクト) {
    return { valid: false, error: "履歴アイテムが不正" }
  }

  if (!item.id または !item.text または !item.speakerId が存在) {
    return { valid: false, error: "必須フィールド不足" }
  }

  if (item.text.length > 30000) {
    return { valid: false, error: "テキストが長すぎます" }
  }

  return { valid: true }
}
```

## 2. State層 - XState統合

### 2.1 Context拡張
```pseudo
context: {
  // 既存フィールド
  ocrText: '',
  ttsText: '',
  speakerId: 3,
  audioUrl: '',

  // 新規追加
  history: HistoryItem[] = [],
  historyMaxItems: 10
}
```

### 2.2 新規イベント
```pseudo
events: {
  // 履歴追加（TTS成功時に自動実行）
  ADD_TO_HISTORY: {
    text: string,
    speakerId: number
  },

  // 履歴から選択
  SELECT_FROM_HISTORY: {
    historyItem: HistoryItem
  },

  // 履歴削除
  REMOVE_FROM_HISTORY: {
    itemId: string
  },

  // 履歴クリア
  CLEAR_HISTORY: {}
}
```

### 2.3 状態遷移の更新
```pseudo
tts_complete: {
  entry: [
    // 既存のentry処理...

    // 履歴に追加
    assign({
      history: (context) => {
        return addToHistory(
          context.history,
          { text: context.ttsText, speakerId: context.speakerId },
          context.historyMaxItems
        )
      }
    })
  ]
}

// どの状態からでも履歴操作可能
on: {
  SELECT_FROM_HISTORY: {
    actions: assign({
      ttsText: (_, event) => event.historyItem.text,
      speakerId: (_, event) => event.historyItem.speakerId
    })
  },

  REMOVE_FROM_HISTORY: {
    actions: assign({
      history: (context, event) =>
        removeFromHistory(context.history, event.itemId)
    })
  },

  CLEAR_HISTORY: {
    actions: assign({
      history: []
    })
  }
}
```

## 3. Shell層 - UI統合

### 3.1 履歴コンポーネント
```pseudo
function HistorySection({ history, onSelect, onRemove, onClear }) {
  if (history.length === 0) {
    return <空の履歴メッセージ />
  }

  return (
    <セクション>
      <ヘッダー>
        <タイトル>読み上げ履歴</タイトル>
        <クリアボタン onClick={onClear} />
      </ヘッダー>

      <リスト>
        for each (item in history) {
          <履歴アイテム key={item.id}>
            <テキスト>{item.displayText}</テキスト>
            <話者>{item.speakerId === 3 ? "ずんだもん" : "めたん"}</話者>
            <時刻>{formatTime(item.timestamp)}</時刻>
            <ボタン群>
              <選択ボタン onClick={() => onSelect(item)} />
              <削除ボタン onClick={() => onRemove(item.id)} />
            </ボタン群>
          </履歴アイテム>
        }
      </リスト>
    </セクション>
  )
}
```

### 3.2 localStorage同期
```pseudo
function useHistoryPersistence(history: HistoryItem[]) {
  // 初回読み込み
  useEffect(() => {
    try {
      保存データ = localStorage.getItem('tts-history')
      if (保存データが存在) {
        パース済み = JSON.parse(保存データ)
        検証済み = パース済み.filter(item => validateHistoryItem(item).valid)
        send({ type: 'LOAD_HISTORY', history: 検証済み })
      }
    } catch (エラー) {
      console.warn('履歴の読み込みに失敗', エラー)
    }
  }, [])

  // 変更時に保存
  useEffect(() => {
    try {
      localStorage.setItem('tts-history', JSON.stringify(history))
    } catch (エラー) {
      console.warn('履歴の保存に失敗', エラー)
    }
  }, [history])
}
```

### 3.3 AppShellへの統合
```pseudo
function AppShell() {
  const { state, send, ... } = useAppMachine()

  // localStorage同期
  useHistoryPersistence(state.context.history)

  // 履歴操作ハンドラー
  const handleHistorySelect = (item: HistoryItem) => {
    send({ type: 'SELECT_FROM_HISTORY', historyItem: item })
    // TTSセクションにスクロール
    ttsSection.scrollIntoView({ behavior: 'smooth' })
  }

  const handleHistoryRemove = (itemId: string) => {
    send({ type: 'REMOVE_FROM_HISTORY', itemId })
  }

  const handleHistoryClear = () => {
    if (確認ダイアログ("履歴をクリアしますか？")) {
      send({ type: 'CLEAR_HISTORY' })
    }
  }

  return (
    <main>
      {/* 既存コンポーネント */}

      {/* 履歴セクション追加 */}
      <HistorySection
        history={state.context.history}
        onSelect={handleHistorySelect}
        onRemove={handleHistoryRemove}
        onClear={handleHistoryClear}
      />
    </main>
  )
}
```

## 4. テスト戦略

```pseudo
// Core層テスト
describe('履歴管理関数') {
  test('新規アイテム追加') {
    初期履歴 = []
    新アイテム = { text: "テスト", speakerId: 3 }
    結果 = addToHistory(初期履歴, 新アイテム, 10)

    assert(結果.length === 1)
    assert(結果[0].text === "テスト")
  }

  test('重複アイテムの更新') {
    初期履歴 = [既存アイテム]
    同じアイテム = { text: 既存アイテム.text, speakerId: 既存アイテム.speakerId }
    結果 = addToHistory(初期履歴, 同じアイテム, 10)

    assert(結果.length === 1)
    assert(結果[0].timestamp > 既存アイテム.timestamp)
  }

  test('最大件数制限') {
    満杯履歴 = Array(10).fill(ダミーアイテム)
    新アイテム = { text: "新規", speakerId: 3 }
    結果 = addToHistory(満杯履歴, 新アイテム, 10)

    assert(結果.length === 10)
    assert(結果[0].text === "新規")
  }
}
```

## 5. エラーハンドリング

```pseudo
// localStorage容量超過
try {
  localStorage.setItem('tts-history', JSON.stringify(history))
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // 古いアイテムを削除して再試行
    短縮履歴 = history.slice(0, 5)
    localStorage.setItem('tts-history', JSON.stringify(短縮履歴))
  }
}

// 不正なデータ読み込み
try {
  data = JSON.parse(localStorage.getItem('tts-history'))
  if (!Array.isArray(data)) {
    throw new Error('Invalid history format')
  }
} catch (e) {
  // デフォルト値を使用
  return []
}
```