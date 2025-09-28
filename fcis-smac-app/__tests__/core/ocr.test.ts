import { describe, expect, test } from '@jest/globals';
import { validateOCRFile, normalizeOCRText } from '../../core/ocr.core';

describe('OCR Core Functions', () => {
  describe('validateOCRFile', () => {
    test('should validate correct file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject oversized file', () => {
      const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ファイルサイズが5MBを超えています');
    });

    test('should reject non-image file', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateOCRFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('画像ファイルを選択してください');
    });
  });

  describe('normalizeOCRText', () => {
    test('should normalize full-width numbers', () => {
      const input = 'テスト１２３';
      const expected = 'テスト123';
      expect(normalizeOCRText(input)).toBe(expected);
    });

    test('should remove extra spaces', () => {
      const input = 'テスト  です   。';
      const expected = 'テスト です。';
      expect(normalizeOCRText(input)).toBe(expected);
    });

    test('should fix punctuation spacing', () => {
      const input = 'テスト 。 次の文 、 続き';
      const expected = 'テスト。次の文、続き';
      expect(normalizeOCRText(input)).toBe(expected);
    });
  });
});