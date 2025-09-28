import { describe, expect, test } from 'vitest';
import { validateTTSRequest } from '../../core/tts.core';

describe('TTS Core Functions', () => {
  describe('validateTTSRequest', () => {
    test('should validate correct request', () => {
      const result = validateTTSRequest('テストテキスト', 3);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject empty text', () => {
      const result = validateTTSRequest('', 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('テキストを入力してください');
    });

    test('should reject text over 30000 characters', () => {
      const longText = 'あ'.repeat(30001);
      const result = validateTTSRequest(longText, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('テキストは30,000文字以内で入力してください');
    });

    test('should reject invalid speaker ID', () => {
      const result = validateTTSRequest('テスト', 999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('無効な話者IDです');
    });

    test('should accept valid speaker IDs', () => {
      expect(validateTTSRequest('テスト', 2).isValid).toBe(true);
      expect(validateTTSRequest('テスト', 3).isValid).toBe(true);
    });
  });
});