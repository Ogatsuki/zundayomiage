'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createWorker, Worker } from 'tesseract.js';

const TEXT_LIMIT = 100_000;

type TextInputState = 'IDLE' | 'PROCESSING' | 'READY' | 'ERROR';
type ErrorCode = 'TEXT_TOO_LONG' | 'VOICEVOX_NOT_RUNNING' | 'NETWORK_CONNECTION' | 'TIMEOUT_ERROR' | 'SYNTHESIS_ERROR' | 'INVALID_AUDIO' | 'OCR_FAILED' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';
type ValidText = string & { __brand: 'ValidText' };
type RetryableError = 'VOICEVOX_NOT_RUNNING' | 'NETWORK_CONNECTION' | 'OCR_FAILED';

interface TextInputProps {
  onTextReady?: (text: ValidText) => void;
  onError?: (error: ErrorCode) => void;
  initialText?: string;
  onRetry?: () => void;
}

interface ErrorState {
  code: ErrorCode;
  message: string;
  isRetryable: boolean;
  retryCount: number;
}

const validateText = (input: string): ValidText | never => {
  if (input.length > TEXT_LIMIT) {
    throw new Error('TEXT_TOO_LONG');
  }
  return input as ValidText;
};

const TextInputVertical: React.FC<TextInputProps> = ({
  onTextReady,
  onError,
  initialText = '',
  onRetry
}) => {
  const [text, setText] = useState<string>(initialText);
  const [state, setState] = useState<TextInputState>('IDLE');
  const [isProcessingOCR, setIsProcessingOCR] = useState<boolean>(false);
  const [ocrProgress, setOCRProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [characterCount, setCharacterCount] = useState<number>(initialText.length);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const initializeOCR = async () => {
      try {
        const worker = await createWorker('eng+jpn', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOCRProgress(Math.round(m.progress * 100));
            }
          }
        });
        ocrWorkerRef.current = worker;
      } catch (error) {
        console.error('OCR initialization failed:', error);
        const errorState: ErrorState = {
          code: 'OCR_FAILED',
          message: 'OCR機能の初期化に失敗しました。ページを再読み込みしてください。',
          isRetryable: true,
          retryCount: 0
        };
        setErrorState(errorState);
        setState('ERROR');
        onError?.('OCR_FAILED' as ErrorCode);
      }
    };

    initializeOCR();

    return () => {
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate();
      }
    };
  }, [onError]);

  const handleTextChange = useCallback((value: string) => {
    setCharacterCount(value.length);
    setText(value);

    if (value.length === 0) {
      setState('IDLE');
    } else if (value.length > TEXT_LIMIT) {
      const errorState: ErrorState = {
        code: 'TEXT_TOO_LONG',
        message: `文字数が制限を超えています（${TEXT_LIMIT.toLocaleString()}文字以内）`,
        isRetryable: false,
        retryCount: 0
      };
      setErrorState(errorState);
      setState('ERROR');
      onError?.('TEXT_TOO_LONG' as ErrorCode);
    } else {
      setErrorState(null);
      setState('READY');
      try {
        const validText = validateText(value);
        onTextReady?.(validText);
      } catch (error) {
        const errorState: ErrorState = {
          code: 'TEXT_TOO_LONG',
          message: `文字数が制限を超えています（${TEXT_LIMIT.toLocaleString()}文字以内）`,
          isRetryable: false,
          retryCount: 0
        };
        setErrorState(errorState);
        setState('ERROR');
        onError?.((error as Error).message as ErrorCode);
      }
    }
  }, [onTextReady, onError]);

  const processImageOCR = useCallback(async (file: File, retryCount: number = 0) => {
    if (!ocrWorkerRef.current) {
      const errorState: ErrorState = {
        code: 'OCR_FAILED',
        message: 'OCR機能が利用できません。ページを再読み込みしてください。',
        isRetryable: true,
        retryCount
      };
      setErrorState(errorState);
      setState('ERROR');
      onError?.('OCR_FAILED' as ErrorCode);
      return;
    }

    setIsProcessingOCR(true);
    setState('PROCESSING');
    setOCRProgress(0);

    try {
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);

      const { data: { text: ocrText } } = await ocrWorkerRef.current.recognize(file);

      const cleanText = ocrText.trim().replace(/\s+/g, ' ');

      if (cleanText.length === 0) {
        const errorState: ErrorState = {
          code: 'OCR_FAILED',
          message: '画像からテキストを認識できませんでした。より鮮明な画像をお試しください。',
          isRetryable: true,
          retryCount
        };
        setErrorState(errorState);
        setLastFailedFile(file);
        setState('ERROR');
        onError?.('OCR_FAILED' as ErrorCode);
        return;
      }

      setErrorState(null);
      setLastFailedFile(null);

      const newText = text ? `${text}\n${cleanText}` : cleanText;
      handleTextChange(newText);

      URL.revokeObjectURL(imageUrl);
      setPreview(null);
    } catch (error) {
      console.error('OCR processing failed:', error);
      const errorState: ErrorState = {
        code: 'OCR_FAILED',
        message: 'OCR処理中にエラーが発生しました。ネットワーク接続を確認してください。',
        isRetryable: true,
        retryCount
      };
      setErrorState(errorState);
      setLastFailedFile(file);
      setState('ERROR');
      onError?.('OCR_FAILED' as ErrorCode);
    } finally {
      setIsProcessingOCR(false);
      setOCRProgress(0);
    }
  }, [text, handleTextChange, onError]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      const errorState: ErrorState = {
        code: 'INVALID_AUDIO',
        message: '対応していないファイル形式です。JPG、PNG、GIFファイルをお選びください。',
        isRetryable: false,
        retryCount: 0
      };
      setErrorState(errorState);
      setState('ERROR');
      onError?.('INVALID_AUDIO' as ErrorCode);
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorState: ErrorState = {
        code: 'INVALID_AUDIO',
        message: 'ファイルサイズが大きすぎます（10MB以内）。',
        isRetryable: false,
        retryCount: 0
      };
      setErrorState(errorState);
      setState('ERROR');
      onError?.('INVALID_AUDIO' as ErrorCode);
      return;
    }

    setErrorState(null);
    processImageOCR(file);
  }, [processImageOCR, onError]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const clearText = useCallback(() => {
    setText('');
    setCharacterCount(0);
    setState('IDLE');
    setErrorState(null);
    setLastFailedFile(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const retryLastOperation = useCallback(() => {
    if (errorState && errorState.isRetryable) {
      if (lastFailedFile) {
        setErrorState(null);
        processImageOCR(lastFailedFile, errorState.retryCount + 1);
      } else {
        // OCR初期化のリトライ
        window.location.reload();
      }
    }
    onRetry?.();
  }, [errorState, lastFailedFile, processImageOCR, onRetry]);

  const getDetailedErrorMessage = useCallback(() => {
    if (!errorState) return '';

    let message = errorState.message;

    if (errorState.isRetryable) {
      if (errorState.retryCount > 0) {
        message += ` (再試行回数: ${errorState.retryCount}回)`;
      }
      message += ' 「再試行」ボタンをクリックして再度お試しください。';
    }

    return message;
  }, [errorState]);

  const focusTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const selectAllText = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [text]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const newText = text ? `${text}\n${clipboardText}` : clipboardText;
      handleTextChange(newText);
    } catch (error) {
      console.error('Failed to paste text:', error);
    }
  }, [text, handleTextChange]);

  const getStatusColor = useCallback(() => {
    switch (state) {
      case 'IDLE': return 'text-gray-500';
      case 'PROCESSING': return 'text-blue-500';
      case 'READY': return 'text-green-500';
      case 'ERROR': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }, [state]);

  const getStatusText = useCallback(() => {
    switch (state) {
      case 'IDLE': return 'テキストを入力してください';
      case 'PROCESSING': return isProcessingOCR ? `OCR処理中... ${ocrProgress}%` : '処理中...';
      case 'READY': return 'テキストの準備完了';
      case 'ERROR': return errorState?.message || 'エラーが発生しました';
      default: return '';
    }
  }, [state, isProcessingOCR, ocrProgress, characterCount]);

  const getBorderColor = useCallback(() => {
    if (dragActive) return 'border-blue-400';
    switch (state) {
      case 'READY': return 'border-green-400';
      case 'ERROR': return 'border-red-400';
      case 'PROCESSING': return 'border-blue-400';
      default: return 'border-gray-300';
    }
  }, [dragActive, state]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">テキスト入力</h2>
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>文字数: {characterCount.toLocaleString()} / {TEXT_LIMIT.toLocaleString()}</span>
          <div className="flex space-x-2">
            <button
              onClick={focusTextarea}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              disabled={isProcessingOCR}
            >
              フォーカス
            </button>
            <button
              onClick={selectAllText}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              disabled={!text || isProcessingOCR}
            >
              全選択
            </button>
            <button
              onClick={copyToClipboard}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              disabled={!text || isProcessingOCR}
            >
              コピー
            </button>
            <button
              onClick={pasteFromClipboard}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              disabled={isProcessingOCR}
            >
              貼り付け
            </button>
            <button
              onClick={clearText}
              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              disabled={!text || isProcessingOCR}
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed ${getBorderColor()} rounded-lg transition-colors duration-200`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`w-full h-64 p-4 border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg ${
            isProcessingOCR ? 'bg-gray-50' : 'bg-white'
          }`}
          placeholder="ここにテキストを入力するか、画像ファイルをドラッグ&ドロップしてください..."
          disabled={isProcessingOCR}
        />

        {dragActive && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-80 flex items-center justify-center rounded-lg">
            <div className="text-blue-600 font-medium">
              画像ファイルをドロップしてください
            </div>
          </div>
        )}

        {isProcessingOCR && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-blue-600 font-medium">OCR処理中...</div>
              <div className="text-sm text-gray-500">{ocrProgress}%</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isProcessingOCR}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${
              isProcessingOCR ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isProcessingOCR}
          >
            画像ファイルを選択
          </button>
          <span className="text-sm text-gray-500">
            対応形式: JPG, PNG, GIF (最大10MB)
          </span>
        </div>

        {preview && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">プレビュー:</span>
            <img
              src={preview}
              alt="OCR Preview"
              className="h-12 w-12 object-cover rounded border"
            />
          </div>
        )}
      </div>

      {errorState && (
        <div className={`mt-2 p-3 border rounded ${
          errorState.code === 'TEXT_TOO_LONG' || !errorState.isRetryable
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-1">
              {errorState.isRetryable ? '⚠️' : '❌'}
            </div>
            <div className="flex-grow">
              <div className="font-medium mb-1">
                {errorState.isRetryable ? '一時的なエラー' : 'エラー'}
              </div>
              <div className="text-sm">
                {getDetailedErrorMessage()}
              </div>
              {errorState.isRetryable && (
                <div className="mt-2">
                  <button
                    onClick={retryLastOperation}
                    disabled={isProcessingOCR}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                      isProcessingOCR
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isProcessingOCR ? '処理中...' : '再試行'}
                  </button>
                  <button
                    onClick={clearText}
                    className="ml-2 px-3 py-1 text-sm rounded font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    クリア
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {characterCount > TEXT_LIMIT * 0.9 && characterCount <= TEXT_LIMIT && !errorState && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
          警告: 文字数制限の90%を超えています
        </div>
      )}

      {characterCount > TEXT_LIMIT && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          エラー: 文字数制限 ({TEXT_LIMIT.toLocaleString()}文字) を超えています
        </div>
      )}
    </div>
  );
};

export default TextInputVertical;