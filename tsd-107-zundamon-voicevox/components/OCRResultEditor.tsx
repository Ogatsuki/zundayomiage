'use client';

import React, { useState, useEffect } from 'react';

// OCRテキストを正規化する関数
function normalizeOCRText(text: string): string {
  if (!text) return '';

  return text
    // 日本語文字（ひらがな、カタカナ、漢字）間のスペースを除去
    .replace(/([ぁ-んァ-ヶー一-龠々]) +([ぁ-んァ-ヶー一-龠々])/g, '$1$2')
    // 日本語文字とひらがなの間のスペースを除去（例：「日 間」→「日間」）
    .replace(/([一-龠々]) +([ぁ-ん])/g, '$1$2')
    .replace(/([ぁ-ん]) +([一-龠々])/g, '$1$2')
    // 括弧内のスペースを除去
    .replace(/【 +/g, '【')
    .replace(/ +】/g, '】')
    .replace(/「 +/g, '「')
    .replace(/ +」/g, '」')
    .replace(/\( +/g, '(')
    .replace(/ +\)/g, ')')
    // 句読点前後の不要なスペースを除去
    .replace(/ +([。、,.])/g, '$1')
    .replace(/([。、,.]) +/g, '$1')
    // 数字と単位の間のスペースを除去（例: "1 0" → "10"）
    .replace(/(\d) +(\d)/g, '$1$2')
    // 数字と日本語の間のスペースを除去（例：「10 日」→「10日」）
    .replace(/(\d) +([ぁ-んァ-ヶー一-龠々])/g, '$1$2')
    // 連続するスペースを1つに
    .replace(/  +/g, ' ')
    .trim();
}

interface OCRResultEditorProps {
  ocrText: string;
  onTextUpdate: (text: string) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const OCRResultEditor: React.FC<OCRResultEditorProps> = ({
  ocrText,
  onTextUpdate,
  onConfirm,
  isLoading = false
}) => {
  const [editedText, setEditedText] = useState(ocrText);
  const [isEditing, setIsEditing] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    // OCRテキストを正規化してから設定
    const normalizedText = normalizeOCRText(ocrText);
    console.log('OCR normalization:', {
      originalLength: ocrText.length,
      normalizedLength: normalizedText.length,
      sample: normalizedText.substring(0, 100)
    });
    setEditedText(normalizedText);
    setCharCount(normalizedText.length);
    // 正規化したテキストを親コンポーネントにも通知
    if (normalizedText !== ocrText) {
      onTextUpdate(normalizedText);
    }
  }, [ocrText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedText(newText);
    setCharCount(newText.length);
    onTextUpdate(newText);
  };

  const handleConfirmClick = () => {
    onConfirm();
    setIsEditing(false);
  };

  const handleClearText = () => {
    setEditedText('');
    setCharCount(0);
    onTextUpdate('');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(editedText);
    // コピー成功のフィードバック（簡易的な実装）
    const button = document.getElementById('copy-button');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'コピーしました';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  };

  if (!ocrText) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">OCR認識結果</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${charCount > 10000 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
              {charCount} / 10,000 文字
            </span>
            <button
              id="copy-button"
              onClick={handleCopyText}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title="クリップボードにコピー"
            >
              コピー
            </button>
            <button
              onClick={handleClearText}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              title="テキストをクリア"
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedText}
              onChange={handleTextChange}
              maxLength={10000}
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="認識されたテキストを編集...（10,000文字以内）"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmClick}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="min-h-[150px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {editedText || 'テキストが認識されませんでした'}
              </pre>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                クリックして編集
              </p>
              <button
                onClick={handleConfirmClick}
                disabled={isLoading || charCount > 10000}
                className="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? '音声生成中...' : charCount > 10000 ? '10,000文字以内にしてください' : 'このテキストで音声生成'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRResultEditor;