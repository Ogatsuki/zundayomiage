/**
 * Unit tests for audio.core.ts
 * FCIS+SMAC Core Layer - 100% test coverage for pure functions
 */

import { describe, it, expect } from 'vitest';
import {
  splitTextIntoChunks,
  generateFileName,
  getSpeakerName,
  validateAudioFormat,
  calculateTotalChunks,
  type AudioChunk
} from './audio.core';

describe('splitTextIntoChunks', () => {
  it('should handle empty text', () => {
    const result = splitTextIntoChunks('');
    expect(result).toEqual([]);
  });

  it('should handle text shorter than max length', () => {
    const text = 'Hello, World!';
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      index: 0,
      text: 'Hello, World!',
      totalChunks: 1
    });
  });

  it('should handle text exactly at max length', () => {
    const text = 'a'.repeat(500);
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(1);
    expect(result[0].text).toHaveLength(500);
    expect(result[0].totalChunks).toBe(1);
  });

  it('should split text longer than max length', () => {
    const text = 'a'.repeat(501);
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(2);
    expect(result[0].text).toHaveLength(500);
    expect(result[1].text).toHaveLength(1);
    expect(result[0].totalChunks).toBe(2);
    expect(result[1].totalChunks).toBe(2);
  });

  it('should split at punctuation when possible', () => {
    const text = 'a'.repeat(495) + '。' + 'b'.repeat(10);
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(2);
    expect(result[0].text.endsWith('。')).toBe(true);
    expect(result[0].text).toHaveLength(496);
    expect(result[1].text).toBe('b'.repeat(10));
  });

  it('should handle multiple chunks correctly', () => {
    const text = 'a'.repeat(1500);
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(3);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
    expect(result[2].index).toBe(2);
    result.forEach(chunk => {
      expect(chunk.totalChunks).toBe(3);
    });
  });

  it('should handle Japanese text with punctuation', () => {
    const text = 'こんにちは、世界！' + 'あ'.repeat(490) + '。次の文章です。';
    const result = splitTextIntoChunks(text, 500);
    expect(result.length).toBeGreaterThan(0);
    // First chunk should ideally break at punctuation
    if (result[0].text.includes('。')) {
      expect(result[0].text.endsWith('。')).toBe(true);
    }
  });

  it('should handle emoji and surrogate pairs correctly', () => {
    const text = '😀'.repeat(250);
    const result = splitTextIntoChunks(text, 500);
    // Each emoji is 1 character when using Array.from
    expect(result).toHaveLength(1);
    expect(Array.from(result[0].text)).toHaveLength(250);
  });

  it('should use default max length when not specified', () => {
    const text = 'a'.repeat(501);
    const result = splitTextIntoChunks(text);
    expect(result).toHaveLength(2);
    expect(result[0].text).toHaveLength(500);
  });

  it('should handle very long text (30000 characters)', () => {
    const text = 'a'.repeat(30000);
    const result = splitTextIntoChunks(text, 500);
    expect(result).toHaveLength(60);
    expect(result[0].totalChunks).toBe(60);
    expect(result[59].totalChunks).toBe(60);
  });
});

describe('generateFileName', () => {
  it('should generate filename for zundamon (speaker 3)', () => {
    const result = generateFileName(3, 1234567890);
    expect(result).toBe('zundamon_1234567890.mp3');
  });

  it('should generate filename for metan (speaker 2)', () => {
    const result = generateFileName(2, 1234567890);
    expect(result).toBe('metan_1234567890.mp3');
  });

  it('should use current timestamp when not provided', () => {
    const before = Date.now();
    const result = generateFileName(3);
    const after = Date.now();

    expect(result).toMatch(/^zundamon_\d+\.mp3$/);
    const timestamp = parseInt(result.match(/\d+/)![0]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should handle unknown speaker ID with default', () => {
    const result = generateFileName(999, 1234567890);
    expect(result).toBe('zundamon_1234567890.mp3');
  });
});

describe('getSpeakerName', () => {
  it('should return metan for speaker ID 2', () => {
    expect(getSpeakerName(2)).toBe('metan');
  });

  it('should return zundamon for speaker ID 3', () => {
    expect(getSpeakerName(3)).toBe('zundamon');
  });

  it('should return zundamon as default for unknown ID', () => {
    expect(getSpeakerName(999)).toBe('zundamon');
    expect(getSpeakerName(0)).toBe('zundamon');
    expect(getSpeakerName(-1)).toBe('zundamon');
  });
});

describe('validateAudioFormat', () => {
  it('should return true for mp3', () => {
    expect(validateAudioFormat('mp3')).toBe(true);
  });

  it('should return false for other formats', () => {
    expect(validateAudioFormat('wav')).toBe(false);
    expect(validateAudioFormat('ogg')).toBe(false);
    expect(validateAudioFormat('flac')).toBe(false);
    expect(validateAudioFormat('')).toBe(false);
    expect(validateAudioFormat('MP3')).toBe(false); // case sensitive
  });
});

describe('calculateTotalChunks', () => {
  it('should return 0 for empty text', () => {
    expect(calculateTotalChunks(0)).toBe(0);
    expect(calculateTotalChunks(-1)).toBe(0);
  });

  it('should return 1 for text shorter than chunk size', () => {
    expect(calculateTotalChunks(100, 500)).toBe(1);
    expect(calculateTotalChunks(499, 500)).toBe(1);
  });

  it('should return 1 for text exactly at chunk size', () => {
    expect(calculateTotalChunks(500, 500)).toBe(1);
  });

  it('should return correct count for longer text', () => {
    expect(calculateTotalChunks(501, 500)).toBe(2);
    expect(calculateTotalChunks(1000, 500)).toBe(2);
    expect(calculateTotalChunks(1001, 500)).toBe(3);
    expect(calculateTotalChunks(30000, 500)).toBe(60);
  });

  it('should use default chunk size when not specified', () => {
    expect(calculateTotalChunks(1000)).toBe(2);
    expect(calculateTotalChunks(250)).toBe(1);
  });

  it('should handle custom chunk sizes', () => {
    expect(calculateTotalChunks(100, 10)).toBe(10);
    expect(calculateTotalChunks(105, 10)).toBe(11);
  });
});

describe('AudioCoreContract integration', () => {
  it('should provide consistent results between functions', () => {
    const text = 'a'.repeat(1500);
    const chunks = splitTextIntoChunks(text);
    const expectedChunkCount = calculateTotalChunks(text.length);

    expect(chunks.length).toBe(expectedChunkCount);
    expect(chunks[0].totalChunks).toBe(expectedChunkCount);
  });

  it('should handle real-world scenario', () => {
    const speakerId = 3;
    const timestamp = 1234567890;
    const text = 'これは日本語のテキストです。' + 'あ'.repeat(1000);

    const chunks = splitTextIntoChunks(text);
    const fileName = generateFileName(speakerId, timestamp);
    const speakerName = getSpeakerName(speakerId);
    const isValidFormat = validateAudioFormat('mp3');

    expect(chunks.length).toBeGreaterThan(1);
    expect(fileName).toBe('zundamon_1234567890.mp3');
    expect(speakerName).toBe('zundamon');
    expect(isValidFormat).toBe(true);
  });
});