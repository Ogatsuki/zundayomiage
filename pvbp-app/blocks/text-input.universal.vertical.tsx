/**
 * ========== PVBP Universal Text Input Block ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/text-input.universal.vertical.tsx
 * Runtime: Universal (SSR + CSR)
 *
 * Purpose: Text input with validation and character limit
 * Features:
 * - 100,000 character limit with real-time counter
 * - Input validation with error messages
 * - Clear button functionality
 * - Green Tailwind theme
 * - SSR/CSR compatible rendering
 * - Self-contained with no external dependencies
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

// ===== PVBP Runtime Declaration =====
export const RUNTIME = 'universal' as const;

// ===== PVBP Lifecycle Patterns (Self-Contained) =====
const useEffectOnce = (effect: () => void | (() => void)) => {
  const hasRun = React.useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return effect();
    }
  }, []);
};

const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
};

// ===== Contract Interface (Self-Contained) =====
export interface TextProcessingContract {
  text: string;
  isValid: boolean;
  characterCount: number;
  maxCharacters: number;
  setText: (text: string) => void;
  clearText: () => void;
  validateText: (text: string) => boolean;
  onTextChange?: (text: string) => void;
  onValidationError?: (error: string) => void;
}

// ===== Type Definitions (Self-Contained) =====
interface ValidationError {
  type: 'CHARACTER_LIMIT' | 'EMPTY_TEXT' | 'INVALID_CHARACTERS';
  message: string;
}

// ===== Constants (Self-Contained) =====
const MAX_CHARACTERS = 100000;
const VALIDATION_MESSAGES = {
  CHARACTER_LIMIT: `文字数制限を超えています（${MAX_CHARACTERS.toLocaleString()}文字以内）`,
  EMPTY_TEXT: 'テキストが入力されていません',
  INVALID_CHARACTERS: '無効な文字が含まれています'
} as const;

// ===== Validation Utilities (Self-Contained) =====
const validateTextInput = (text: string): { isValid: boolean; error?: ValidationError } => {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: {
        type: 'EMPTY_TEXT',
        message: VALIDATION_MESSAGES.EMPTY_TEXT
      }
    };
  }

  if (text.length > MAX_CHARACTERS) {
    return {
      isValid: false,
      error: {
        type: 'CHARACTER_LIMIT',
        message: VALIDATION_MESSAGES.CHARACTER_LIMIT
      }
    };
  }

  // Check for potentially problematic characters (optional validation)
  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text);
  if (hasInvalidChars) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_CHARACTERS',
        message: VALIDATION_MESSAGES.INVALID_CHARACTERS
      }
    };
  }

  return { isValid: true };
};

// ===== Character Counter Component (Self-Contained) =====
const CharacterCounter: React.FC<{
  count: number;
  maxCount: number;
  isOverLimit: boolean;
  hydrated: boolean;
}> = ({ count, maxCount, isOverLimit, hydrated }) => {
  const percentage = (count / maxCount) * 100;

  if (!hydrated) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <span>文字数計算中...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <div className={`font-medium transition-colors ${
        isOverLimit
          ? 'text-red-600'
          : percentage > 90
            ? 'text-amber-600'
            : percentage > 75
              ? 'text-green-600'
              : 'text-gray-600'
      }`}>
        {count.toLocaleString()} / {maxCount.toLocaleString()} 文字
      </div>

      {/* Progress bar */}
      <div className="flex items-center space-x-2">
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverLimit
                ? 'bg-red-500'
                : percentage > 90
                  ? 'bg-amber-500'
                  : percentage > 75
                    ? 'bg-green-500'
                    : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className={`text-xs ${
          isOverLimit ? 'text-red-600' : 'text-gray-500'
        }`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// ===== Error Display Component (Self-Contained) =====
const ErrorDisplay: React.FC<{
  error?: ValidationError;
  hydrated: boolean;
}> = ({ error, hydrated }) => {
  if (!error || !hydrated) return null;

  const getErrorIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'CHARACTER_LIMIT': return '⚠️';
      case 'EMPTY_TEXT': return 'ℹ️';
      case 'INVALID_CHARACTERS': return '❌';
      default: return '⚠️';
    }
  };

  const getErrorColor = (type: ValidationError['type']) => {
    switch (type) {
      case 'CHARACTER_LIMIT': return 'bg-red-50 border-red-200 text-red-700';
      case 'EMPTY_TEXT': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'INVALID_CHARACTERS': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  return (
    <div className={`mt-2 p-3 rounded-lg border ${getErrorColor(error.type)} transition-all duration-200`}>
      <div className="flex items-start space-x-2">
        <span className="text-lg">{getErrorIcon(error.type)}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{error.message}</p>
        </div>
      </div>
    </div>
  );
};

// ===== Main Text Input Component =====
const TextInput: React.FC<{
  onTextChange?: (text: string) => void;
  onValidationError?: (error: string) => void;
  initialText?: string;
  placeholder?: string;
  className?: string;
}> = ({
  onTextChange,
  onValidationError,
  initialText = '',
  placeholder = '読み上げたいテキストを入力してください...（最大100,000文字）',
  className = ''
}) => {
  // Environment detection
  const hydrated = useHydrated();

  // State management
  const [text, setText] = useState(initialText);
  const [currentError, setCurrentError] = useState<ValidationError | undefined>();
  const [isFocused, setIsFocused] = useState(false);

  // Validation and text processing
  const validateAndSetText = useCallback((newText: string) => {
    const validation = validateTextInput(newText);

    setText(newText);
    setCurrentError(validation.error);

    // Trigger callbacks
    if (onTextChange) {
      onTextChange(newText);
    }

    if (!validation.isValid && validation.error && onValidationError) {
      onValidationError(validation.error.message);
    }

    return validation.isValid;
  }, [onTextChange, onValidationError]);

  // Initialize component
  useEffectOnce(() => {
    if (initialText) {
      validateAndSetText(initialText);
    }
  });

  // Event handlers
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    validateAndSetText(newText);
  }, [validateAndSetText]);

  const handleClearText = useCallback(() => {
    validateAndSetText('');
  }, [validateAndSetText]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Contract implementation
  const contractImplementation: TextProcessingContract = {
    text,
    isValid: !currentError,
    characterCount: text.length,
    maxCharacters: MAX_CHARACTERS,
    setText: validateAndSetText,
    clearText: handleClearText,
    validateText: (testText: string) => validateTextInput(testText).isValid,
    onTextChange,
    onValidationError
  };

  // Derived state
  const isOverLimit = text.length > MAX_CHARACTERS;
  const hasText = text.trim().length > 0;

  // SSR fallback rendering
  if (!hydrated) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-green-800 flex items-center">
            <span className="text-green-600 mr-2">📝</span>
            テキスト入力
          </h3>
          <div className="text-sm text-gray-500">
            読み込み中...
          </div>
        </div>

        <div className="relative">
          <div className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">
              テキスト入力エリアを読み込み中...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with title and counter */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-green-800 flex items-center">
          <span className="text-green-600 mr-2">📝</span>
          テキスト入力
        </h3>
        <CharacterCounter
          count={text.length}
          maxCount={MAX_CHARACTERS}
          isOverLimit={isOverLimit}
          hydrated={hydrated}
        />
      </div>

      {/* Main input area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full h-40 p-4 border-2 rounded-xl resize-y transition-all duration-200 ${
            currentError
              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : isFocused
                ? 'border-green-500 bg-green-50 focus:border-green-600 focus:ring-2 focus:ring-green-200'
                : hasText
                  ? 'border-green-300 bg-green-50 hover:border-green-400'
                  : 'border-gray-300 bg-white hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200'
          } focus:outline-none`}
          style={{ minHeight: '160px', maxHeight: '400px' }}
          disabled={false}
        />

        {/* Clear button */}
        {hasText && (
          <button
            onClick={handleClearText}
            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 group"
            title="テキストをクリア"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error display */}
      <ErrorDisplay error={currentError} hydrated={hydrated} />

      {/* Status indicator */}
      {hasText && !currentError && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 text-lg">✅</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              入力完了 - テキストが正常に検証されました
            </p>
            <p className="text-xs text-green-600 mt-1">
              音声合成の準備が整いました
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

// ===== Export Component with Contract Implementation =====
export default TextInput;

// Export the contract implementation for external use
export const useTextInputContract = (
  onTextChange?: (text: string) => void,
  onValidationError?: (error: string) => void,
  initialText?: string
): TextProcessingContract => {
  const [text, setText] = useState(initialText || '');
  const [currentError, setCurrentError] = useState<ValidationError | undefined>();

  const validateAndSetText = useCallback((newText: string) => {
    const validation = validateTextInput(newText);

    setText(newText);
    setCurrentError(validation.error);

    if (onTextChange) {
      onTextChange(newText);
    }

    if (!validation.isValid && validation.error && onValidationError) {
      onValidationError(validation.error.message);
    }

    return validation.isValid;
  }, [onTextChange, onValidationError]);

  const handleClearText = useCallback(() => {
    validateAndSetText('');
  }, [validateAndSetText]);

  return {
    text,
    isValid: !currentError,
    characterCount: text.length,
    maxCharacters: MAX_CHARACTERS,
    setText: validateAndSetText,
    clearText: handleClearText,
    validateText: (testText: string) => validateTextInput(testText).isValid,
    onTextChange,
    onValidationError
  };
};