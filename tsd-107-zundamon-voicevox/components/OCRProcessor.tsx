'use client';

import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface OCRProcessorProps {
  imageFile: File | null;
  onOCRComplete: (text: string) => void;
  language: 'jpn';
}

const OCRProcessor: React.FC<OCRProcessorProps> = ({ imageFile, onOCRComplete, language }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<string>('');

  useEffect(() => {
    if (imageFile) {
      processImage();
    }
  }, [imageFile, language]);

  const processImage = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setProgress(0);
    setError('');
    setProcessingStep('初期化中...');

    try {
      const result = await Tesseract.recognize(
        imageFile,
        language,
        {
          logger: (m: any) => {
            // プログレス更新
            if (m.status === 'recognizing text') {
              const progressPercent = Math.round(m.progress * 100);
              setProgress(progressPercent);
              setProcessingStep('テキスト認識中...');
            } else if (m.status === 'loading tesseract core') {
              setProcessingStep('Tesseractコアを読み込み中...');
            } else if (m.status === 'loading language traineddata') {
              setProcessingStep('言語データを読み込み中...');
            } else if (m.status === 'initialized api') {
              setProcessingStep('APIを初期化中...');
            }
          }
        }
      );

      // OCR結果を親コンポーネントに渡す
      if (result.data.text) {
        onOCRComplete(result.data.text);
        setProcessingStep('完了しました');
      } else {
        setError('テキストが検出されませんでした');
      }
    } catch (err) {
      setError('OCR処理中にエラーが発生しました');
      setProcessingStep('');
    } finally {
      setIsProcessing(false);
      // プログレスバーを100%にして完了を示す
      setProgress(100);

      // 3秒後にプログレスバーをリセット
      setTimeout(() => {
        if (!isProcessing) {
          setProgress(0);
          setProcessingStep('');
        }
      }, 3000);
    }
  };

  const handleRetry = () => {
    if (imageFile) {
      processImage();
    }
  };

  if (!imageFile) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">OCR処理</h3>
        <span className="text-xs text-gray-500">
          言語: 日本語
        </span>
      </div>

      {(isProcessing || progress > 0) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{processingStep}</span>
            <span className="text-gray-700 font-medium">{progress}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 opacity-75"></div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {!isProcessing && progress === 100 && !error && (
        <div className="mt-3 flex items-center text-sm text-green-600">
          <svg
            className="w-4 h-4 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          OCR処理が完了しました
        </div>
      )}
    </div>
  );
};

export default OCRProcessor;