import { ValidationResult } from '../contracts/types';

/**
 * TTS要求の検証（純粋関数）
 * @param text 読み上げテキスト
 * @param speakerId 話者ID
 * @returns 検証結果
 */
export function validateTTSRequest(text: string, speakerId: number): ValidationResult {
  const errors: string[] = [];

  // テキスト検証
  if (!text || text.trim().length === 0) {
    errors.push('テキストを入力してください');
  } else if (text.length > 30000) {
    errors.push('テキストは30,000文字以内で入力してください');
  }

  // 話者ID検証（ずんだもん: 2=ノーマル, 3=あまあま）
  if (![2, 3].includes(speakerId)) {
    errors.push('無効な話者IDです');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * TTSリクエストパラメータの構築（純粋関数）
 * @param text 読み上げテキスト
 * @param speakerId 話者ID
 * @returns VOICEVOXのAPI用パラメータ
 */
export function buildTTSRequest(text: string, speakerId: number) {
  return {
    text: text.trim(),
    speaker: speakerId,
    speedScale: 1.0,       // 話速（0.5〜2.0）
    volumeScale: 1.0,      // 音量（0.0〜2.0）
    intonationScale: 1.0,  // 抑揚（0.0〜2.0）
    prePhonemeLength: 0.1, // 開始無音時間（秒）
    postPhonemeLength: 0.1 // 終了無音時間（秒）
  };
}

/**
 * 高度なTTSリクエストパラメータの構築（純粋関数）
 * @param text 読み上げテキスト
 * @param speakerId 話者ID
 * @param options 詳細オプション
 * @returns カスタマイズされたVOICEVOX APIパラメータ
 */
export function buildAdvancedTTSRequest(
  text: string,
  speakerId: number,
  options: {
    speedScale?: number;
    volumeScale?: number;
    intonationScale?: number;
    prePhonemeLength?: number;
    postPhonemeLength?: number;
  } = {}
) {
  // デフォルト値と境界値チェック
  const speedScale = Math.max(0.5, Math.min(2.0, options.speedScale ?? 1.0));
  const volumeScale = Math.max(0.0, Math.min(2.0, options.volumeScale ?? 1.0));
  const intonationScale = Math.max(0.0, Math.min(2.0, options.intonationScale ?? 1.0));
  const prePhonemeLength = Math.max(0, Math.min(1.5, options.prePhonemeLength ?? 0.1));
  const postPhonemeLength = Math.max(0, Math.min(1.5, options.postPhonemeLength ?? 0.1));

  return {
    text: text.trim(),
    speaker: speakerId,
    speedScale,
    volumeScale,
    intonationScale,
    prePhonemeLength,
    postPhonemeLength
  };
}

/**
 * テキストを読み上げ可能なチャンクに分割（純粋関数）
 * @param text 長いテキスト
 * @param maxChunkSize 最大チャンクサイズ（デフォルト: 5000文字）
 * @returns 分割されたテキストの配列
 */
export function splitTextForTTS(text: string, maxChunkSize: number = 5000): string[] {
  if (!text || text.length <= maxChunkSize) {
    return text ? [text] : [];
  }

  const chunks: string[] = [];
  const sentences = text.split(/([。！？\n])/);
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // 単一文が最大サイズを超える場合は強制分割
      if (sentence.length > maxChunkSize) {
        const forceSplit = sentence.match(new RegExp(`.{1,${maxChunkSize}}`, 'g')) || [];
        chunks.push(...forceSplit);
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 話者情報の取得（純粋関数）
 * @param speakerId 話者ID
 * @returns 話者の情報
 */
export function getSpeakerInfo(speakerId: number): {
  name: string;
  style: string;
  description: string;
} | null {
  const speakers: Record<number, { name: string; style: string; description: string }> = {
    2: {
      name: 'ずんだもん',
      style: 'ノーマル',
      description: 'ずんだもんの標準的な声'
    },
    3: {
      name: 'ずんだもん',
      style: 'あまあま',
      description: 'ずんだもんの甘い声'
    }
  };

  return speakers[speakerId] || null;
}

/**
 * 音声合成の推定時間を計算（純粋関数）
 * @param text テキスト
 * @param speedScale 話速
 * @returns 推定秒数
 */
export function estimateTTSDuration(text: string, speedScale: number = 1.0): number {
  if (!text) {
    return 0;
  }

  // 日本語の平均発話速度: 300文字/分
  const baseRate = 300 / 60; // 文字/秒
  const adjustedRate = baseRate * speedScale;

  return Math.ceil(text.length / adjustedRate);
}