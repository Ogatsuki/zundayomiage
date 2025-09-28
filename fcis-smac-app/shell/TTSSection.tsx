import React, { useState, useEffect } from 'react';

interface TTSSectionProps {
  onSynthesize: (text: string, speakerId: number) => void;
  isProcessing: boolean;
  canSubmit: boolean;
  audioUrl?: string;
  audioFileName?: string;
  extractedText?: string;
  progressMessage?: string;
  progressPercentage?: number;
  onDownload?: () => void;
}

export function TTSSection({
  onSynthesize,
  isProcessing,
  canSubmit,
  audioUrl,
  audioFileName,
  extractedText,
  progressMessage,
  progressPercentage,
  onDownload
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

  const handleDownload = () => {
    if (audioUrl && onDownload) {
      onDownload();
    } else if (audioUrl) {
      // フォールバック: 直接ダウンロード
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = audioFileName || `zundamon_${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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

        {/* プログレス表示 */}
        {progressMessage && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <div className="text-sm text-blue-700">{progressMessage}</div>
            {progressPercentage !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* ダウンロードボタン（audioタグの代わり） */}
        {audioUrl && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              {/* アイコン */}
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-green-800 mb-2">音声生成が完了しました</p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  {/* ダウンロードアイコン */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  MP3をダウンロード
                </button>
                {audioFileName && (
                  <p className="text-xs text-gray-500 mt-2">
                    ファイル名: {audioFileName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}