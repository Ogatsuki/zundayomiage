import React, { useState, useEffect } from 'react';

interface TTSSectionProps {
  onSynthesize: (text: string, speakerId: number) => void;
  isProcessing: boolean;
  canSubmit: boolean;
  audioUrl?: string;
  extractedText?: string;
}

export function TTSSection({
  onSynthesize,
  isProcessing,
  canSubmit,
  audioUrl,
  extractedText
}: TTSSectionProps) {
  const [text, setText] = useState('');
  const [speakerId, setSpeakerId] = useState(3);

  useEffect(() => {
    if (extractedText) {
      setText(extractedText);
    }
  }, [extractedText]);

  const handleSubmit = () => {
    onSynthesize(text, speakerId);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">🎙️ テキスト読み上げ</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">話者選択</label>
          <div className="space-x-4" role="radiogroup" aria-label="話者選択">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={3}
                checked={speakerId === 3}
                onChange={(e) => setSpeakerId(Number(e.target.value))}
                className="mr-2"
                aria-label="ずんだもん"
              />
              <span>ずんだもん</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={2}
                checked={speakerId === 2}
                onChange={(e) => setSpeakerId(Number(e.target.value))}
                className="mr-2"
                aria-label="四国めたん"
              />
              <span>四国めたん</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="tts-text">
            テキスト入力（最大30,000文字）
          </label>
          <textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={speakerId === 3 ?
              "ここにテキストを入力するのだ！" :
              "ここにテキストを入力してね！"}
            className="w-full h-40 p-3 border rounded-lg resize-y"
            maxLength={30000}
            disabled={isProcessing}
            aria-describedby="char-count"
          />
          <div id="char-count" className="text-sm text-gray-600 mt-1">
            {text.length} / 30,000 文字
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isProcessing || !text.trim()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          aria-busy={isProcessing}
        >
          {isProcessing ? '生成中...' : '音声を生成'}
        </button>

        {audioUrl && (
          <div className="p-4 bg-gray-100 rounded">
            <audio controls src={audioUrl} className="w-full mb-2" aria-label="生成された音声" />
            <a
              href={audioUrl}
              download={`${speakerId === 3 ? 'zundamon' : 'metan'}_${Date.now()}.wav`}
              className="text-blue-600 hover:underline"
            >
              音声をダウンロード
            </a>
          </div>
        )}
      </div>
    </div>
  );
}