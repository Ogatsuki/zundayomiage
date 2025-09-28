import React, { useRef } from 'react';

interface OCRSectionProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  canSubmit: boolean;
  extractedText?: string;
}

export function OCRSection({ onFileSelect, isProcessing, canSubmit, extractedText }: OCRSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">📷 画像からテキスト抽出（OCR）</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            画像ファイルを選択
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50"
            aria-label="画像ファイルを選択"
          />
          <p className="mt-1 text-sm text-gray-500">
            対応形式: JPEG, PNG, WebP, BMP（最大5MB）
          </p>
        </div>

        {isProcessing && (
          <div className="p-4 bg-blue-50 rounded" role="status" aria-live="polite">
            <p className="text-blue-700">処理中...</p>
          </div>
        )}

        {extractedText && (
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-medium mb-2">抽出されたテキスト:</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{extractedText}</p>
            <p className="mt-2 text-sm text-green-600">
              ✓ テキストの抽出が完了しました。下の音声生成セクションで読み上げできます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}