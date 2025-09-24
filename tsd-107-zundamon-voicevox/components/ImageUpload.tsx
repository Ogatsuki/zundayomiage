'use client';

import React, { useState, useCallback } from 'react';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  isProcessing: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File): boolean => {
    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('画像サイズは5MB以下にしてください');
      return false;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('JPEG, PNG, WEBPのみサポートしています');
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    setError('');

    if (!validateFile(file)) {
      return;
    }

    // プレビューURL生成
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageUpload(file);
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClear = () => {
    setPreviewUrl(null);
    setError('');
  };

  return (
    <div className="w-full">
      {!previewUrl ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="imageInput"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            disabled={isProcessing}
          />

          <div className="flex flex-col items-center space-y-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <div>
              <p className="text-lg font-medium text-gray-700">
                画像をドラッグ&ドロップ
              </p>
              <p className="text-sm text-gray-500 mt-1">
                または クリックしてファイルを選択
              </p>
            </div>

            <p className="text-xs text-gray-400">
              JPEG, PNG, WEBP（最大5MB）
            </p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-gray-50 p-4">
          <div className="flex items-center space-x-4">
            <img
              src={previewUrl}
              alt="アップロード画像プレビュー"
              className="w-24 h-24 object-cover rounded"
            />

            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">画像がアップロードされました</p>
              <p className="text-xs text-gray-500 mt-1">OCR処理を開始してください</p>
            </div>

            {!isProcessing && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="画像をクリア"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;