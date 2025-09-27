/**
 * 拡張Core層関数のユニットテスト
 * 30,000文字対応とOCRテキスト処理のテスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateExtendedText,
  splitIntoExtendedChunks,
  normalizeOCRText,
  getSpeakerInfo,
  validateSpeakerId,
  estimateChunkDuration,
  validateWAVHeader,
  shouldRetryError,
  calculateRetryDelay,
  unwrap,
  unwrapError,
  success,
  failure,
  type ExtendedValidText,
  type ExtendedChunk
} from './voicevox.core';

describe('Extended Core Functions', () => {
  describe('validateExtendedText', () => {
    it('空文字を拒否する', () => {
      const result = validateExtendedText('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_TEXT');
      }
    });

    it('空白のみの文字を拒否する', () => {
      const result = validateExtendedText('   ');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EMPTY_TEXT');
      }
    });

    it('30,000文字以内のテキストを受け入れる', () => {
      const text = 'あ'.repeat(30000);
      const result = validateExtendedText(text);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(text);
      }
    });

    it('30,000文字を超えるテキストを拒否する', () => {
      const text = 'あ'.repeat(30001);
      const result = validateExtendedText(text);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TEXT_TOO_LONG');
        if (result.error.type === 'TEXT_TOO_LONG') {
          expect(result.error.maxLength).toBe(30000);
        }
      }
    });

    it('通常のテキストを受け入れる', () => {
      const text = 'これはテストテキストです。';
      const result = validateExtendedText(text);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(text);
      }
    });
  });

  describe('splitIntoExtendedChunks', () => {
    it('500文字以下のテキストを1チャンクにする', () => {
      const text = 'あ'.repeat(400) as ExtendedValidText;
      const chunks = splitIntoExtendedChunks(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].size).toBe(400);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBe(400);
    });

    it('500文字を超えるテキストを複数チャンクに分割する', () => {
      const text = 'あ'.repeat(1200) as ExtendedValidText;
      const chunks = splitIntoExtendedChunks(text);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].size).toBeLessThanOrEqual(500);

      // 全チャンクの合計が元のテキスト長と一致
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(1200);
    });

    it('句読点で自然に分割する', () => {
      // 句読点の位置を考慮したテキストを作成
      // 450文字目付近に句読点を配置
      const part1 = 'これはテストです。';
      const part2 = 'あ'.repeat(430);
      const part3 = '区切りの文。';
      const part4 = 'あ'.repeat(100);
      const part5 = '最後の文章。';
      const text = (part1 + part2 + part3 + part4 + part5) as ExtendedValidText;

      const chunks = splitIntoExtendedChunks(text);

      // 複数チャンクに分割されている
      expect(chunks.length).toBeGreaterThan(1);

      // 少なくとも1つのチャンクが句読点で終わっている
      const hasChunkEndingWithPunctuation = chunks.some(chunk =>
        /[。！？]$/.test(chunk.text)
      );
      expect(hasChunkEndingWithPunctuation).toBe(true);
    });

    it('チャンクのインデックスとオフセットが正しい', () => {
      const text = 'あ'.repeat(1500) as ExtendedValidText;
      const chunks = splitIntoExtendedChunks(text);

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].index).toBe(i);
        if (i > 0) {
          expect(chunks[i].startOffset).toBe(chunks[i - 1].endOffset);
        }
      }
    });

    it('カスタムチャンクサイズで分割する', () => {
      const text = 'あ'.repeat(1000) as ExtendedValidText;
      const chunks = splitIntoExtendedChunks(text, 200);
      expect(chunks[0].size).toBeLessThanOrEqual(200);
    });
  });

  describe('normalizeOCRText', () => {
    it('半角カナを全角カナに変換する', () => {
      const result = normalizeOCRText('ｱｲｳｴｵ ｶｷｸｹｺ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('アイウエオ カキクケコ');
      }
    });

    it('全角数字を半角数字に変換する', () => {
      const result = normalizeOCRText('０１２３４５６７８９');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('0123456789');
      }
    });

    it('長音記号を統一する', () => {
      const result = normalizeOCRText('データー、ユーザ―、コンピュータ‐');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('データー');
        expect(result.value).toContain('ユーザー');
        expect(result.value).toContain('コンピューター');
      }
    });

    it('連続する空白を1つに統一する', () => {
      const result = normalizeOCRText('これは　　　テスト    です');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('これは テスト です');
      }
    });

    it('連続する改行を2つまでに制限する', () => {
      const result = normalizeOCRText('段落1\n\n\n\n段落2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('段落1\n\n段落2');
      }
    });

    it('句読点を統一する', () => {
      const result = normalizeOCRText('これは､テストです｡');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('これは、テストです。');
      }
    });

    it('前後の空白を削除する', () => {
      const result = normalizeOCRText('  テキスト  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('テキスト');
      }
    });
  });

  describe('getSpeakerInfo', () => {
    it('ずんだもん（ID: 3）の情報を取得する', () => {
      const info = getSpeakerInfo(3);
      expect(info).not.toBeNull();
      if (info) {
        expect(info.id).toBe(3);
        expect(info.name).toBe('ずんだもん');
        expect(info.styles).toHaveLength(3);
        expect(info.styles[0].name).toBe('ノーマル');
      }
    });

    it('四国めたん（ID: 2）の情報を取得する', () => {
      const info = getSpeakerInfo(2);
      expect(info).not.toBeNull();
      if (info) {
        expect(info.id).toBe(2);
        expect(info.name).toBe('四国めたん');
        expect(info.styles).toHaveLength(3);
        expect(info.styles[0].name).toBe('ノーマル');
      }
    });

    it('存在しない話者IDでnullを返す', () => {
      const info = getSpeakerInfo(999);
      expect(info).toBeNull();
    });
  });

  describe('validateSpeakerId', () => {
    it('ずんだもん（ID: 3）を有効と判定する', () => {
      expect(validateSpeakerId(3)).toBe(true);
    });

    it('四国めたん（ID: 2）を有効と判定する', () => {
      expect(validateSpeakerId(2)).toBe(true);
    });

    it('存在しない話者IDを無効と判定する', () => {
      expect(validateSpeakerId(999)).toBe(false);
      expect(validateSpeakerId(0)).toBe(false);
      expect(validateSpeakerId(-1)).toBe(false);
    });
  });

  describe('estimateChunkDuration', () => {
    it('チャンクの推定再生時間を計算する', () => {
      const chunk: ExtendedChunk = {
        index: 0,
        text: 'あ'.repeat(350), // 約1分の読み上げ
        size: 350,
        startOffset: 0,
        endOffset: 350,
        estimatedDuration: 0
      };

      const duration = estimateChunkDuration(chunk);
      expect(duration).toBeGreaterThan(55);
      expect(duration).toBeLessThan(65);
    });

    it('句読点による間を考慮する', () => {
      const chunkWithPunctuation: ExtendedChunk = {
        index: 0,
        text: 'これは、テストです。また、別の文章。',
        size: 18,
        startOffset: 0,
        endOffset: 18,
        estimatedDuration: 0
      };

      const chunkWithoutPunctuation: ExtendedChunk = {
        index: 0,
        text: 'これはテストですまた別の文章',
        size: 14,
        startOffset: 0,
        endOffset: 14,
        estimatedDuration: 0
      };

      const durationWith = estimateChunkDuration(chunkWithPunctuation);
      const durationWithout = estimateChunkDuration(chunkWithoutPunctuation);

      expect(durationWith).toBeGreaterThan(durationWithout);
    });
  });

  describe('validateWAVHeader', () => {
    it('有効なWAVヘッダーを検証する', () => {
      // 簡易的なWAVヘッダー（44バイト）
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      // "RIFF"
      view.setUint8(0, 'R'.charCodeAt(0));
      view.setUint8(1, 'I'.charCodeAt(0));
      view.setUint8(2, 'F'.charCodeAt(0));
      view.setUint8(3, 'F'.charCodeAt(0));

      // "WAVE"
      view.setUint8(8, 'W'.charCodeAt(0));
      view.setUint8(9, 'A'.charCodeAt(0));
      view.setUint8(10, 'V'.charCodeAt(0));
      view.setUint8(11, 'E'.charCodeAt(0));

      expect(validateWAVHeader(buffer)).toBe(true);
    });

    it('サイズが小さすぎるバッファを無効とする', () => {
      const buffer = new ArrayBuffer(20);
      expect(validateWAVHeader(buffer)).toBe(false);
    });

    it('RIFFシグネチャがないバッファを無効とする', () => {
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      // 誤ったシグネチャ
      view.setUint8(0, 'X'.charCodeAt(0));
      view.setUint8(1, 'X'.charCodeAt(0));
      view.setUint8(2, 'X'.charCodeAt(0));
      view.setUint8(3, 'X'.charCodeAt(0));

      expect(validateWAVHeader(buffer)).toBe(false);
    });

    it('WAVEシグネチャがないバッファを無効とする', () => {
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      // "RIFF"
      view.setUint8(0, 'R'.charCodeAt(0));
      view.setUint8(1, 'I'.charCodeAt(0));
      view.setUint8(2, 'F'.charCodeAt(0));
      view.setUint8(3, 'F'.charCodeAt(0));

      // 誤ったフォーマット
      view.setUint8(8, 'X'.charCodeAt(0));
      view.setUint8(9, 'X'.charCodeAt(0));
      view.setUint8(10, 'X'.charCodeAt(0));
      view.setUint8(11, 'X'.charCodeAt(0));

      expect(validateWAVHeader(buffer)).toBe(false);
    });
  });

  describe('shouldRetryError', () => {
    it('ネットワークエラーはリトライ可能', () => {
      const error = new Error('Network timeout');
      expect(shouldRetryError(error, 1, 3)).toBe(true);
    });

    it('音声合成エラーはリトライ可能', () => {
      const error = new Error('Audio synthesis failed');
      expect(shouldRetryError(error, 1, 3)).toBe(true);
    });

    it('バリデーションエラーはリトライ不可', () => {
      const error = new Error('Validation failed: invalid parameter');
      expect(shouldRetryError(error, 1, 3)).toBe(false);
    });

    it('最大試行回数を超えたらリトライ不可', () => {
      const error = new Error('Network error');
      expect(shouldRetryError(error, 3, 3)).toBe(false);
      expect(shouldRetryError(error, 4, 3)).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('エクスポネンシャルバックオフで遅延を増加させる', () => {
      const delay1 = calculateRetryDelay(1, 1000, 30000);
      const delay2 = calculateRetryDelay(2, 1000, 30000);
      const delay3 = calculateRetryDelay(3, 1000, 30000);

      // ジッターを考慮した範囲でチェック
      expect(delay1).toBeGreaterThanOrEqual(800);
      expect(delay1).toBeLessThanOrEqual(1200);

      expect(delay2).toBeGreaterThanOrEqual(1600);
      expect(delay2).toBeLessThanOrEqual(2400);

      expect(delay3).toBeGreaterThanOrEqual(3200);
      expect(delay3).toBeLessThanOrEqual(4800);
    });

    it('最大遅延を超えない', () => {
      const delay = calculateRetryDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000 * 1.1); // ジッター込みで10%のマージン
    });

    it('ジッターによるランダム性がある', () => {
      const delays = new Set<number>();
      for (let i = 0; i < 10; i++) {
        delays.add(calculateRetryDelay(1, 1000, 30000));
      }
      // 複数回実行して異なる値が得られる
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('Result型ヘルパー関数', () => {
    it('successで成功結果を作成', () => {
      const result = success('成功');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('成功');
      }
    });

    it('failureで失敗結果を作成', () => {
      const error = { type: 'TEST_ERROR' as const, message: 'エラー' };
      const result = failure(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(error);
      }
    });

    it('unwrapで成功値を取得', () => {
      const successResult = success('値');
      const failureResult = failure('エラー');

      expect(unwrap(successResult)).toBe('値');
      expect(unwrap(failureResult)).toBeNull();
    });

    it('unwrapErrorでエラーを取得', () => {
      const successResult = success('値');
      const failureResult = failure('エラー');

      expect(unwrapError(successResult)).toBeNull();
      expect(unwrapError(failureResult)).toBe('エラー');
    });
  });
});