/**
 * FCIS+SMAC アーキテクチャ Core層
 * VOICEVOXの音声合成における純粋関数群
 *
 * 制約:
 * - すべて純粋関数（副作用なし）
 * - async/awaitなし
 * - console.logなし
 * - throw文なし（Result型使用）
 */

// ===== 型定義 =====

/**
 * Result型 - エラーハンドリングに使用
 */
export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * 成功結果を生成するヘルパー
 */
export const success = <T>(value: T): Result<T, never> => ({
  success: true,
  value
});

/**
 * 失敗結果を生成するヘルパー
 */
export const failure = <E>(error: E): Result<never, E> => ({
  success: false,
  error
});

/**
 * ブランド型ヘルパー
 */
type Brand<T, B> = T & { __brand: B };

/**
 * 検証済みテキスト型
 */
export type ValidText = Brand<string, 'ValidText'>;

/**
 * テキストチャンク型
 */
export type TextChunk = {
  index: number;
  text: string;
  size: number;
};

/**
 * 進捗パーセンテージ型
 */
export type ProgressPercentage = Brand<number, 'Progress'>;

/**
 * エラー種別
 */
export type ErrorCategory = 'NETWORK' | 'VALIDATION' | 'SYNTHESIS' | 'UNKNOWN';

/**
 * バリデーションエラー
 */
export type ValidationError =
  | { type: 'EMPTY_TEXT'; message: string }
  | { type: 'TEXT_TOO_LONG'; message: string; maxLength: number };

/**
 * クエリエラー
 */
export type QueryError =
  | { type: 'INVALID_SPEAKER_ID'; message: string; speakerId: number }
  | { type: 'INVALID_PARAMETERS'; message: string; parameters: Record<string, unknown> };

/**
 * 音声クエリリクエスト型
 */
export type AudioQueryRequest = {
  text: string;
  speaker: number;
};

/**
 * 音声クエリ型（VOICEVOXレスポンス構造）
 */
export type AudioQuery = {
  accent_phrases: AccentPhrase[];
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
};

/**
 * アクセント句型
 */
export type AccentPhrase = {
  moras: Mora[];
  accent: number;
  pause_mora?: Mora;
  is_interrogative?: boolean;
};

/**
 * モーラ型
 */
export type Mora = {
  text: string;
  consonant?: string;
  consonant_length?: number;
  vowel: string;
  vowel_length: number;
  pitch: number;
};

/**
 * 検証済みクエリ型
 */
export type ValidatedQuery = Brand<AudioQuery, 'ValidatedQuery'>;

/**
 * 音声バッファ型
 */
export type AudioBuffer = {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  duration: number;
};

/**
 * 結合済み音声バッファ型
 */
export type MergedAudioBuffer = Brand<AudioBuffer, 'MergedAudioBuffer'>;

// ===== 定数 =====

const MAX_TEXT_LENGTH = 100_000;
const DEFAULT_CHUNK_SIZE = 200;
const VALID_SPEAKER_IDS = [2, 3];
const SENTENCE_DELIMITERS = ['。', '！', '？', '!', '?', '.'];
const PROGRESS_MIN = 0;
const PROGRESS_MAX = 100;

// ===== Core関数群 =====

/**
 * 1. テキスト検証関数
 * テキストの長さと内容を検証し、ValidTextを返す
 */
export const validateText = (text: string): Result<ValidText, ValidationError> => {
  // 空文字チェック
  if (text.trim().length === 0) {
    return failure({
      type: 'EMPTY_TEXT',
      message: 'テキストが空です'
    });
  }

  // 文字数制限チェック
  if (text.length > MAX_TEXT_LENGTH) {
    return failure({
      type: 'TEXT_TOO_LONG',
      message: `テキストが長すぎます。最大${MAX_TEXT_LENGTH}文字まで`,
      maxLength: MAX_TEXT_LENGTH
    });
  }

  // 検証済みテキストとして返す
  return success(text as ValidText);
};

/**
 * 2. テキスト分割関数
 * ValidTextを指定サイズのチャンクに分割
 * 句読点を考慮して自然な区切りで分割
 */
export const splitTextIntoChunks = (
  validText: ValidText,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): TextChunk[] => {
  const text = validText as string;
  const chunks: TextChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + chunkSize, text.length);

    // 末尾が文字の途中でない場合、句読点で区切る
    if (endPos < text.length) {
      // 理想的な分割点を後方検索
      let idealBreakPos = endPos;
      for (let i = endPos - 1; i > currentPos + chunkSize * 0.5; i--) {
        if (SENTENCE_DELIMITERS.includes(text[i])) {
          idealBreakPos = i + 1;
          break;
        }
      }
      endPos = idealBreakPos;
    }

    const chunkText = text.slice(currentPos, endPos);
    chunks.push({
      index: chunkIndex,
      text: chunkText,
      size: chunkText.length
    });

    currentPos = endPos;
    chunkIndex++;
  }

  return chunks;
};

/**
 * 3. 音声クエリ構築関数
 * テキストとスピーカーIDから音声クエリリクエストを構築
 */
export const buildAudioQuery = (
  text: string,
  speakerId: number
): AudioQueryRequest => {
  return {
    text: text.trim(),
    speaker: speakerId
  };
};

/**
 * 4. 音声クエリ検証関数
 * AudioQueryの妥当性を検証
 */
export const validateAudioQuery = (
  query: AudioQuery
): Result<ValidatedQuery, QueryError> => {
  // 必須フィールドの存在確認
  if (!query.accent_phrases || !Array.isArray(query.accent_phrases)) {
    return failure({
      type: 'INVALID_PARAMETERS',
      message: 'accent_phrasesが不正です',
      parameters: { accent_phrases: query.accent_phrases }
    });
  }

  // 数値パラメータの検証
  const numericParams = [
    'speedScale', 'pitchScale', 'intonationScale', 'volumeScale',
    'prePhonemeLength', 'postPhonemeLength', 'outputSamplingRate'
  ];

  for (const param of numericParams) {
    const value = (query as any)[param];
    if (typeof value !== 'number' || !isFinite(value)) {
      return failure({
        type: 'INVALID_PARAMETERS',
        message: `${param}が不正な数値です`,
        parameters: { [param]: value }
      });
    }
  }

  // スケールパラメータの範囲チェック
  const scaleParams = ['speedScale', 'pitchScale', 'intonationScale', 'volumeScale'];
  for (const param of scaleParams) {
    const value = (query as any)[param];
    if (value < 0.1 || value > 2.0) {
      return failure({
        type: 'INVALID_PARAMETERS',
        message: `${param}が範囲外です（0.1-2.0）`,
        parameters: { [param]: value }
      });
    }
  }

  return success(query as ValidatedQuery);
};

/**
 * 5. 音声バッファ結合関数
 * 複数の音声バッファを一つに結合
 * WAVフォーマットを維持
 */
export const mergeAudioBuffers = (buffers: AudioBuffer[]): MergedAudioBuffer => {
  if (buffers.length === 0) {
    // 空のバッファを返す
    const emptyBuffer: AudioBuffer = {
      data: new ArrayBuffer(0),
      sampleRate: 24000,
      channels: 1,
      duration: 0
    };
    return emptyBuffer as MergedAudioBuffer;
  }

  if (buffers.length === 1) {
    return buffers[0] as MergedAudioBuffer;
  }

  // 最初のバッファの設定を基準とする
  const referenceBuffer = buffers[0];
  const { sampleRate, channels } = referenceBuffer;

  // 各バッファのデータサイズを計算
  const totalDuration = buffers.reduce((sum, buffer) => sum + buffer.duration, 0);
  const totalSamples = Math.ceil(totalDuration * sampleRate);
  const totalBytes = totalSamples * channels * 2; // 16bit = 2bytes

  // 結合用のバッファを作成
  const mergedData = new ArrayBuffer(totalBytes);
  const mergedView = new Uint8Array(mergedData);

  let offset = 0;
  for (const buffer of buffers) {
    const bufferView = new Uint8Array(buffer.data);
    mergedView.set(bufferView, offset);
    offset += bufferView.length;
  }

  const mergedBuffer: AudioBuffer = {
    data: mergedData,
    sampleRate,
    channels,
    duration: totalDuration
  };

  return mergedBuffer as MergedAudioBuffer;
};

/**
 * 6. 合成進捗計算関数
 * 完了数と総数から進捗パーセンテージを計算
 */
export const calculateSynthesisProgress = (
  completed: number,
  total: number
): ProgressPercentage => {
  if (total <= 0) {
    return PROGRESS_MAX as ProgressPercentage;
  }

  if (completed <= 0) {
    return PROGRESS_MIN as ProgressPercentage;
  }

  if (completed >= total) {
    return PROGRESS_MAX as ProgressPercentage;
  }

  const progress = Math.round((completed / total) * 100);
  const clampedProgress = Math.max(PROGRESS_MIN, Math.min(PROGRESS_MAX, progress));

  return clampedProgress as ProgressPercentage;
};

/**
 * 7. エラー種別判定関数
 * Errorオブジェクトからエラーカテゴリを判定
 */
export const detectErrorType = (error: Error): ErrorCategory => {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  // ネットワーク関連エラー
  const networkKeywords = [
    'network', 'fetch', 'connection', 'timeout', 'offline',
    'cors', 'http', 'request', 'response'
  ];
  if (networkKeywords.some(keyword =>
    errorMessage.includes(keyword) || errorName.includes(keyword)
  )) {
    return 'NETWORK';
  }

  // バリデーション関連エラー
  const validationKeywords = [
    'validation', 'invalid', 'required', 'format', 'length',
    'range', 'type', 'parameter', 'missing'
  ];
  if (validationKeywords.some(keyword =>
    errorMessage.includes(keyword) || errorName.includes(keyword)
  )) {
    return 'VALIDATION';
  }

  // 音声合成関連エラー
  const synthesisKeywords = [
    'synthesis', 'audio', 'voice', 'speaker', 'voicevox',
    'query', 'phoneme', 'mora', 'accent'
  ];
  if (synthesisKeywords.some(keyword =>
    errorMessage.includes(keyword) || errorName.includes(keyword)
  )) {
    return 'SYNTHESIS';
  }

  // どのカテゴリにも該当しない場合
  return 'UNKNOWN';
};

/**
 * 8. HTTPエラー分類関数
 * HTTPステータスコードからエラータイプを分類
 */
export const classifyHttpError = (status: number): string => {
  if (status >= 500) {
    return 'SYNTHESIS_ERROR';
  } else if (status === 404 || status === 400) {
    return 'SYNTHESIS_ERROR';
  } else {
    return 'VOICEVOX_NOT_RUNNING';
  }
};

/**
 * 9. 設定適用関数
 * AudioQueryに設定パラメータを適用
 */
export const applyConfigToAudioQuery = (
  audioQuery: AudioQuery,
  config: Partial<{
    speedScale: number;
    pitchScale: number;
    intonationScale: number;
    volumeScale: number;
  }>
): AudioQuery => {
  return {
    ...audioQuery,
    speedScale: config.speedScale ?? audioQuery.speedScale,
    pitchScale: config.pitchScale ?? audioQuery.pitchScale,
    intonationScale: config.intonationScale ?? audioQuery.intonationScale,
    volumeScale: config.volumeScale ?? audioQuery.volumeScale,
  };
};

// ===== ユーティリティ関数 =====

/**
 * Result型の値を安全に取得
 */
export const unwrap = <T, E>(result: Result<T, E>): T | null => {
  return result.success ? result.value : null;
};

/**
 * Result型のエラーを安全に取得
 */
export const unwrapError = <T, E>(result: Result<T, E>): E | null => {
  return result.success ? null : result.error;
};

/**
 * Result型をmapで変換
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return result.success ? success(fn(result.value)) : result;
};

/**
 * Result型にflatMapを適用
 */
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return result.success ? fn(result.value) : result;
};