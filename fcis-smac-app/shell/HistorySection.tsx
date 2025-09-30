'use client';

import React from 'react';
import { HistoryItem } from '../contracts/types';
import * as historyCore from '../core/history.core';

interface HistorySectionProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}

export function HistorySection({ history, onSelect, onRemove, onClear }: HistorySectionProps) {
  if (history.length === 0) {
    return (
      <section className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">📜 読み上げ履歴</h2>
        <div className="text-center py-8 text-gray-500">
          <p>まだ履歴がありません</p>
          <p className="text-sm mt-2">音声を生成すると、ここに履歴が表示されます</p>
        </div>
      </section>
    );
  }

  const handleClearClick = () => {
    if (window.confirm('履歴をすべてクリアしますか？')) {
      onClear();
    }
  };

  return (
    <section className="mt-8 p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">📜 読み上げ履歴</h2>
        <button
          onClick={handleClearClick}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          aria-label="履歴をクリア"
        >
          すべてクリア
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 mb-2 line-clamp-2">{item.displayText}</p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">
                      {item.speakerId === 3 ? '🍡 ずんだもん' : '🌸 四国めたん'}
                    </span>
                  </span>
                  <span>•</span>
                  <span>{historyCore.formatTimestamp(item.timestamp)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => onSelect(item)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  aria-label="この履歴を選択"
                >
                  選択
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  aria-label="この履歴を削除"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}