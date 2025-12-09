/**
 * FCIS+SMAC アーキテクチャ Core層
 * 読み上げ履歴管理における純粋関数群
 *
 * 制約:
 * - すべて純粋関数（副作用なし）
 * - async/awaitなし
 * - console.logなし
 * - throw文なし（Result型使用）
 */

// ===== 型定義 =====

/**
 * 履歴アイテム型
 */
export type HistoryItem = {
  id: string;
  text: string;
  speakerId: number;
  timestamp: number;
  displayText: string;
};

/**
 * 履歴追加用データ型
 */
export type HistoryData = {
  text: string;
  speakerId: number;
};

/**
 * バリデーション結果型
 */
export type ValidationResult = {
  valid: boolean;
  error?: string;
};

// ===== ヘルパー関数 =====

/**
 * UUIDを生成する純粋関数
 * （実際にはランダムだが、テスト用にシード可能）
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 表示用テキストを生成
 */
export const createDisplayText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
};

// ===== 履歴管理関数 =====

/**
 * 履歴に新しいアイテムを追加する純粋関数
 *
 * @param currentHistory 現在の履歴配列
 * @param newItem 追加するアイテムのデータ
 * @param maxItems 最大保持件数
 * @returns 新しい履歴配列
 */
export const addToHistory = (
  currentHistory: HistoryItem[],
  newItem: HistoryData,
  maxItems: number = 10
): HistoryItem[] => {
  // 入力検証
  if (!newItem.text || newItem.text.trim() === '') {
    return currentHistory;
  }

  // 重複チェック（同じテキスト＋話者の組み合わせ）
  const existingItem = currentHistory.find(
    item => item.text === newItem.text && item.speakerId === newItem.speakerId
  );

  if (existingItem) {
    // 既存アイテムを最新にする（削除して再追加）
    const filtered = currentHistory.filter(item => item.id !== existingItem.id);
    const updatedItem: HistoryItem = {
      ...existingItem,
      timestamp: Date.now()
    };
    return [updatedItem, ...filtered].slice(0, maxItems);
  } else {
    // 新規アイテムとして追加
    const newHistoryItem: HistoryItem = {
      id: generateId(),
      text: newItem.text,
      speakerId: newItem.speakerId,
      timestamp: Date.now(),
      displayText: createDisplayText(newItem.text)
    };
    return [newHistoryItem, ...currentHistory].slice(0, maxItems);
  }
};

/**
 * 履歴から特定のアイテムを削除する純粋関数
 *
 * @param currentHistory 現在の履歴配列
 * @param itemId 削除するアイテムのID
 * @returns 新しい履歴配列
 */
export const removeFromHistory = (
  currentHistory: HistoryItem[],
  itemId: string
): HistoryItem[] => {
  if (!itemId) {
    return currentHistory;
  }
  return currentHistory.filter(item => item.id !== itemId);
};

/**
 * 履歴を全てクリアする純粋関数
 *
 * @param currentHistory 現在の履歴配列（引数として受け取るが使用しない）
 * @returns 空の配列
 */
export const clearHistory = (_currentHistory: HistoryItem[]): HistoryItem[] => {
  return [];
};

/**
 * 履歴アイテムの妥当性を検証する純粋関数
 *
 * @param item 検証するアイテム
 * @returns バリデーション結果
 */
export const validateHistoryItem = (item: unknown): ValidationResult => {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: '履歴アイテムが不正です' };
  }

  const historyItem = item as Record<string, unknown>;

  if (!historyItem.id || !historyItem.text || typeof historyItem.speakerId !== 'number') {
    return { valid: false, error: '必須フィールドが不足しています' };
  }

  if (typeof historyItem.text !== 'string') {
    return { valid: false, error: 'テキストが不正です' };
  }

  if (historyItem.text.length > 30000) {
    return { valid: false, error: 'テキストが長すぎます（最大30,000文字）' };
  }

  return { valid: true };
};

/**
 * 履歴配列全体を検証してフィルタリングする純粋関数
 *
 * @param items 検証する履歴配列
 * @returns 有効なアイテムのみの配列
 */
export const filterValidHistory = (items: unknown[]): HistoryItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(item => validateHistoryItem(item).valid) as HistoryItem[];
};

/**
 * タイムスタンプをフォーマットする純粋関数
 *
 * @param timestamp Unixタイムスタンプ
 * @returns フォーマットされた時刻文字列
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'たった今';
  } else if (diffMins < 60) {
    return `${diffMins}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};