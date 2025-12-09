// ============================================================
// core.ts - TSD-107 ずんだ読み上げ Core層
// ============================================================
// 責務: 純粋関数によるビジネスロジック
// - 副作用なし（async/await禁止、throw禁止、IO禁止）
// - 決定的な計算のみ（同じ入力→同じ出力）
// - テスト100%可能（モックなし）
// - 契約ファイル(types.ts)のみimport可能
// ============================================================

import type {
  SpeakerId,
  SpeakerConfig,
  Result,
  ValidationError,
  ValidationErrorType,
} from './types';
import {
  SPEAKERS,
  MAX_TEXT_LENGTH,
  CHUNK_SIZE,
  OCR_MAX_FILE_SIZE,
  OCR_ALLOWED_TYPES,
  ok,
  err,
} from './types';

// ------------------------------------------------------------
// テキストバリデーション
// ------------------------------------------------------------

/**
 * テキストのバリデーションを行う
 * @param text - 検証するテキスト
 * @returns Result<void, ValidationError>
 */
export function validateText(text: string): Result<void, ValidationError> {
  // 空文字チェック
  if (text.length === 0) {
    return err({
      type: 'empty' as ValidationErrorType,
      message: 'テキストを入力してください',
    });
  }

  // 空白のみチェック
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return err({
      type: 'whitespace_only' as ValidationErrorType,
      message: 'テキストを入力してください（空白のみは不可）',
    });
  }

  // 文字数制限チェック
  if (text.length > MAX_TEXT_LENGTH) {
    return err({
      type: 'too_long' as ValidationErrorType,
      message: `テキストは${MAX_TEXT_LENGTH.toLocaleString()}文字以内で入力してください（現在: ${text.length.toLocaleString()}文字）`,
    });
  }

  return ok(undefined);
}

// ------------------------------------------------------------
// チャンク分割
// ------------------------------------------------------------

/**
 * テキストを指定サイズのチャンクに分割する
 * @param text - 分割するテキスト
 * @param size - チャンクサイズ（デフォルト: 500文字）
 * @returns 分割されたテキスト配列
 */
export function splitIntoChunks(text: string, size: number = CHUNK_SIZE): string[] {
  if (text.length === 0) {
    return [];
  }

  if (text.length <= size) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size;
  }

  return chunks;
}

/**
 * チャンク数を計算する
 * @param textLength - テキストの長さ
 * @param size - チャンクサイズ（デフォルト: 500文字）
 * @returns チャンク数
 */
export function calculateChunkCount(textLength: number, size: number = CHUNK_SIZE): number {
  if (textLength === 0) {
    return 0;
  }
  return Math.ceil(textLength / size);
}

// ------------------------------------------------------------
// OCRテキスト正規化
// ------------------------------------------------------------

/**
 * OCRで抽出したテキストを正規化する
 * - 日本語文字間の不要スペース除去
 * - 括弧内スペース正規化
 * - 句読点前後スペース除去
 * - 数字間・数字と日本語間スペース除去
 * - 連続スペースを単一スペースに統一
 * @param text - 正規化するテキスト
 * @returns 正規化されたテキスト
 */
export function normalizeOcrText(text: string): string {
  // Unicode範囲
  // ひらがな: \u3040-\u309F
  // カタカナ: \u30A0-\u30FF
  // 漢字: \u4E00-\u9FAF
  const japanesePattern = '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]';

  let result = text;

  // 1. 日本語文字間の不要スペース除去（繰り返し適用）
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(
      new RegExp(`(${japanesePattern})\\s+(${japanesePattern})`, 'g'),
      '$1$2'
    );
  }

  // 2. 括弧内スペース正規化
  result = result
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/「\s+/g, '「')
    .replace(/\s+」/g, '」')
    .replace(/『\s+/g, '『')
    .replace(/\s+』/g, '』')
    .replace(/【\s+/g, '【')
    .replace(/\s+】/g, '】');

  // 3. 句読点前後スペース除去
  result = result
    .replace(/\s+([、。，．,.!?！？])/g, '$1')
    .replace(/([、。，．])\s+/g, '$1');

  // 4. 数字間スペース除去
  prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/(\d)\s+(\d)/g, '$1$2');
  }

  // 5. 数字と日本語間スペース除去
  result = result
    .replace(new RegExp(`(\\d)\\s+(${japanesePattern})`, 'g'), '$1$2')
    .replace(new RegExp(`(${japanesePattern})\\s+(\\d)`, 'g'), '$1$2');

  // 6. 連続スペースを単一に
  result = result.replace(/\s+/g, ' ');

  // 7. 前後の空白を除去
  result = result.trim();

  return result;
}

// ------------------------------------------------------------
// 話者設定
// ------------------------------------------------------------

/**
 * 話者IDから設定を取得する
 * @param speakerId - 話者ID
 * @returns 話者設定
 */
export function getSpeakerConfig(speakerId: SpeakerId): SpeakerConfig {
  return SPEAKERS[speakerId];
}

/**
 * 全話者のリストを取得する
 * @returns 話者設定の配列
 */
export function getAllSpeakers(): SpeakerConfig[] {
  return Object.values(SPEAKERS);
}

// ------------------------------------------------------------
// ファイル名生成
// ------------------------------------------------------------

/**
 * ダウンロード用ファイル名を生成する
 * @param speakerId - 話者ID
 * @param timestamp - タイムスタンプ（テスト用にオプション化）
 * @returns ファイル名（例: zundamon_2025-01-01T12-00-00.mp3）
 */
export function generateFilename(speakerId: SpeakerId, timestamp?: Date): string {
  const config = getSpeakerConfig(speakerId);
  const date = timestamp ?? new Date();
  const isoString = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${config.filenamePrefix}_${isoString}.mp3`;
}

// ------------------------------------------------------------
// OCRファイルバリデーション
// ------------------------------------------------------------

/**
 * OCR用ファイルのバリデーションを行う
 * @param file - 検証するファイル（typeとsizeプロパティを持つ）
 * @returns Result<void, string>
 */
export function validateOcrFile(file: { type: string; size: number }): Result<void, string> {
  // 形式チェック
  if (!OCR_ALLOWED_TYPES.includes(file.type as typeof OCR_ALLOWED_TYPES[number])) {
    return err(`対応形式: JPEG, PNG, WEBP（現在: ${file.type || '不明'}）`);
  }

  // サイズチェック
  if (file.size > OCR_MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return err(`ファイルサイズは5MB以下にしてください（現在: ${sizeMB}MB）`);
  }

  return ok(undefined);
}

// ------------------------------------------------------------
// 文字数関連ユーティリティ
// ------------------------------------------------------------

/**
 * 文字数カウント表示用文字列を生成する
 * @param currentLength - 現在の文字数
 * @param maxLength - 最大文字数
 * @returns 表示用文字列（例: "1,234 / 30,000 文字"）
 */
export function formatCharacterCount(
  currentLength: number,
  maxLength: number = MAX_TEXT_LENGTH
): string {
  return `${currentLength.toLocaleString()} / ${maxLength.toLocaleString()} 文字`;
}

/**
 * 文字数が制限を超過しているかチェックする
 * @param currentLength - 現在の文字数
 * @param maxLength - 最大文字数
 * @returns 超過している場合true
 */
export function isOverCharacterLimit(
  currentLength: number,
  maxLength: number = MAX_TEXT_LENGTH
): boolean {
  return currentLength > maxLength;
}

// ------------------------------------------------------------
// End of core.ts
// ------------------------------------------------------------
