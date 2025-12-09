import { ValidationResult } from '../contracts/types';

/**
 * OCRファイルの検証（純粋関数）
 * @param file アップロードされたファイル
 * @returns 検証結果
 */
export function validateOCRFile(file: File | null): ValidationResult {
  const errors: string[] = [];
  const maxSizeMB = 5;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file) {
    errors.push('ファイルが選択されていません');
    return { isValid: false, errors };
  }

  if (file.size > maxSizeBytes) {
    errors.push(`ファイルサイズが${maxSizeMB}MBを超えています`);
  }

  if (!file.type.startsWith('image/')) {
    errors.push('画像ファイルを選択してください');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * OCRテキストの正規化（純粋関数）
 * @param text OCRで抽出された生テキスト
 * @returns 正規化されたテキスト
 */
export function normalizeOCRText(text: string): string {
  if (!text) {
    return '';
  }

  return text
    // 連続する空白文字を単一スペースに
    .replace(/\s+/g, ' ')
    // 前後の空白を削除
    .trim()
    // 全角数字を半角に変換
    .replace(/[０-９]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0xFEE0)
    )
    // 句読点前の余分なスペースを削除
    .replace(/\s+([。、！？])/g, '$1')
    // 句読点後の余分なスペースを削除（文頭以外）
    .replace(/([。、！？])\s+/g, '$1')
    // 改行の正規化
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 連続する改行を2つまでに制限
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * OCR結果のサニタイズ（純粋関数）
 * @param text OCRテキスト
 * @returns サニタイズされたテキスト
 */
export function sanitizeOCRText(text: string): string {
  if (!text) {
    return '';
  }

  return text
    // 制御文字を削除（改行とタブは除く）
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 不可視文字を削除
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 異常な文字コードを削除
    .replace(/[\uD800-\uDFFF]/g, '');
}

/**
 * OCRテキストの統計情報を計算（純粋関数）
 * @param text OCRテキスト
 * @returns 統計情報
 */
export function calculateOCRStats(text: string): {
  characterCount: number;
  lineCount: number;
  estimatedReadTime: number; // 秒単位
} {
  if (!text) {
    return {
      characterCount: 0,
      lineCount: 0,
      estimatedReadTime: 0
    };
  }

  const characterCount = text.length;
  const lineCount = text.split('\n').length;
  // 日本語の平均読み速度: 400文字/分
  const estimatedReadTime = Math.ceil(characterCount / 400 * 60);

  return {
    characterCount,
    lineCount,
    estimatedReadTime
  };
}