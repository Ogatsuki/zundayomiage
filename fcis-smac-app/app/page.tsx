'use client';

import React, { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [speakerId, setSpeakerId] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError('テキストを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speakerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'エラーが発生しました');
      }

      if (data.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">VOICEVOX音声生成</h1>

      {/* 話者選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">話者選択</label>
        <div className="space-x-4">
          <label>
            <input
              type="radio"
              value={3}
              checked={speakerId === 3}
              onChange={(e) => setSpeakerId(Number(e.target.value))}
              className="mr-2"
            />
            ずんだもん
          </label>
          <label>
            <input
              type="radio"
              value={2}
              checked={speakerId === 2}
              onChange={(e) => setSpeakerId(Number(e.target.value))}
              className="mr-2"
            />
            四国めたん
          </label>
        </div>
      </div>

      {/* テキスト入力 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          テキスト入力（最大30,000文字）
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={speakerId === 3 ?
            "ここにテキストを入力するのだ！" :
            "ここにテキストを入力してね！"}
          className="w-full h-40 p-3 border rounded-lg"
          maxLength={30000}
        />
        <div className="text-sm text-gray-600 mt-1">
          {text.length} / 30,000 文字
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 生成ボタン */}
      <button
        onClick={handleSynthesize}
        disabled={isLoading}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? '生成中...' : '音声を生成'}
      </button>

      {/* ダウンロードリンク */}
      {audioUrl && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <a
            href={audioUrl}
            download={`${speakerId === 3 ? 'zundamon' : 'metan'}_${Date.now()}.wav`}
            className="text-blue-600 hover:underline"
          >
            音声をダウンロード
          </a>
        </div>
      )}
    </main>
  );
}