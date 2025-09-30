'use client';

import { useEffect } from 'react';
import { HistoryItem } from '../contracts/types';
import * as historyCore from '../core/history.core';

const STORAGE_KEY = 'tts-history';

interface UseHistoryPersistenceProps {
  history: HistoryItem[];
  onLoad: (history: HistoryItem[]) => void;
}

/**
 * 履歴のlocalStorage永続化を管理するカスタムフック
 */
export function useHistoryPersistence({ history, onLoad }: UseHistoryPersistenceProps) {
  // 初回読み込み
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed)) {
          // 有効なアイテムのみフィルタリング
          const validated = historyCore.filterValidHistory(parsed);
          if (validated.length > 0) {
            onLoad(validated);
          }
        }
      }
    } catch (error) {
      console.warn('履歴の読み込みに失敗しました:', error);
      // エラーが発生した場合は無視して空の履歴で開始
    }
  }, [onLoad]);

  // 履歴が変更されたら保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('履歴の保存に失敗しました:', error);

      // QuotaExceededError の場合は古い履歴を削除して再試行
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          const reducedHistory = history.slice(0, 5); // 最新5件のみ保持
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedHistory));
        } catch (retryError) {
          console.error('履歴の保存に再試行も失敗しました:', retryError);
        }
      }
    }
  }, [history]);
}