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
export type Brand<T, B> = T & { __brand: B };

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

/**
 * タイムアウト設定型
 */
export type TimeoutConfig = {
  audioQueryTimeout: number; // ミリ秒
  synthesisTimeout: number; // ミリ秒
};

/**
 * ネットワーク設定型
 */
export type NetworkConfig = {
  timeout: TimeoutConfig;
  retryCount: number;
  retryDelay: number; // ミリ秒
};

/**
 * タイムアウトエラー型
 */
export type TimeoutError = {
  type: 'TIMEOUT_ERROR';
  message: string;
  timeoutMs: number;
  operation: 'AUDIO_QUERY' | 'SYNTHESIS';
};

// ===== 定数 =====

const MAX_TEXT_LENGTH = 100_000;
const MAX_EXTENDED_TEXT_LENGTH = 30_000; // 30,000文字対応
const DEFAULT_CHUNK_SIZE = 200;
const DEFAULT_EXTENDED_CHUNK_SIZE = 500; // 500文字チャンク
const VALID_SPEAKER_IDS = [2, 3]; // 四国めたん、ずんだもん
const SENTENCE_DELIMITERS = ['。', '！', '？', '!', '?', '.'];
const PROGRESS_MIN = 0;
const PROGRESS_MAX = 100;

// タイムアウト設定
const DEFAULT_AUDIO_QUERY_TIMEOUT = 30_000; // 30秒
const DEFAULT_SYNTHESIS_TIMEOUT = 60_000; // 60秒
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1秒

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

/**
 * 10. デフォルトネットワーク設定生成関数
 * タイムアウトとリトライの設定を生成
 */
export const createDefaultNetworkConfig = (): NetworkConfig => {
  return {
    timeout: {
      audioQueryTimeout: DEFAULT_AUDIO_QUERY_TIMEOUT,
      synthesisTimeout: DEFAULT_SYNTHESIS_TIMEOUT
    },
    retryCount: DEFAULT_RETRY_COUNT,
    retryDelay: DEFAULT_RETRY_DELAY
  };
};

/**
 * 11. タイムアウトエラー生成関数
 * 指定された操作とタイムアウト時間でタイムアウトエラーを生成
 */
export const createTimeoutError = (
  operation: 'AUDIO_QUERY' | 'SYNTHESIS',
  timeoutMs: number
): TimeoutError => {
  const operationName = operation === 'AUDIO_QUERY' ? '音声クエリ取得' : '音声合成';
  return {
    type: 'TIMEOUT_ERROR',
    message: `${operationName}がタイムアウトしました（${timeoutMs}ms）`,
    timeoutMs,
    operation
  };
};

/**
 * 12. AbortSignalとTimeoutの組み合わせ関数
 * 指定時間後にAbortするAbortControllerを作成
 */
export const createTimeoutAbortController = (timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  cleanup: () => void;
} => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return {
    controller,
    timeoutId,
    cleanup
  };
};

/**
 * 13. タイムアウト判定関数
 * エラーがタイムアウトエラーかどうかを判定
 */
export const isTimeoutError = (error: Error): boolean => {
  return error.name === 'AbortError' ||
         error.message.includes('timeout') ||
         error.message.includes('タイムアウト');
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
  if (!result.success) {
    return (result as { success: false; error: E }).error;
  }
  return null;
};

/**
 * Result型をmapで変換
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (!result.success) {
    return result as Result<U, E>;
  }
  return success(fn((result as { success: true; value: T }).value));
};

/**
 * Result型にflatMapを適用
 */
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (!result.success) {
    return result as Result<U, E>;
  }
  return fn((result as { success: true; value: T }).value);
};

// ===== 拡張Core関数群（30,000文字対応 & OCR処理） =====

/**
 * 拡張テキスト検証済み型
 */
export type ExtendedValidText = Brand<string, 'ExtendedValidText'>;

/**
 * OCR正規化エラー型
 */
export type OCRNormalizationError =
  | { type: 'INVALID_OCR_FORMAT'; message: string }
  | { type: 'NORMALIZATION_FAILED'; message: string; issues: string[] };

/**
 * 拡張チャンク型
 */
export type ExtendedChunk = {
  index: number;
  text: string;
  size: number;
  startOffset: number;
  endOffset: number;
  estimatedDuration: number;
};

/**
 * 14. 30,000文字バリデーション関数
 * 30,000文字制限でテキストを検証
 */
export const validateExtendedText = (text: string): Result<ExtendedValidText, ValidationError> => {
  // 空文字チェック
  if (text.trim().length === 0) {
    return failure({
      type: 'EMPTY_TEXT',
      message: 'テキストが空です'
    });
  }

  // 30,000文字制限チェック
  if (text.length > MAX_EXTENDED_TEXT_LENGTH) {
    return failure({
      type: 'TEXT_TOO_LONG',
      message: `テキストが長すぎます。最大${MAX_EXTENDED_TEXT_LENGTH}文字まで`,
      maxLength: MAX_EXTENDED_TEXT_LENGTH
    });
  }

  // 検証済みテキストとして返す
  return success(text as ExtendedValidText);
};

/**
 * 15. 500文字チャンク分割関数
 * ExtendedValidTextを500文字のチャンクに分割
 * 句読点を考慮して自然な区切りで分割
 */
export const splitIntoExtendedChunks = (
  validText: ExtendedValidText,
  chunkSize: number = DEFAULT_EXTENDED_CHUNK_SIZE
): ExtendedChunk[] => {
  const text = validText as string;
  const chunks: ExtendedChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + chunkSize, text.length);

    // 末尾が文字の途中でない場合、句読点で区切る
    if (endPos < text.length) {
      // 理想的な分割点を後方検索
      let idealBreakPos = endPos;
      for (let i = endPos - 1; i > currentPos + chunkSize * 0.7; i--) {
        if (SENTENCE_DELIMITERS.includes(text[i])) {
          idealBreakPos = i + 1;
          break;
        }
      }
      endPos = idealBreakPos;
    }

    const chunkText = text.slice(currentPos, endPos);
    const chunk: ExtendedChunk = {
      index: chunkIndex,
      text: chunkText,
      size: chunkText.length,
      startOffset: currentPos,
      endOffset: endPos,
      estimatedDuration: 0  // 一時的な値、後で計算される
    };

    // 推定再生時間を計算
    chunk.estimatedDuration = estimateChunkDuration(chunk);

    chunks.push(chunk);

    currentPos = endPos;
    chunkIndex++;
  }

  return chunks;
};

/**
 * 16. OCRテキスト正規化関数（日本語特化）
 * OCRで誤認識されやすい文字を修正
 */
export const normalizeOCRText = (text: string): Result<string, OCRNormalizationError> => {
  try {
    let normalized = text;

    // 全角・半角の統一
    // 半角カナを全角カナに変換
    const halfToFullKana: { [key: string]: string } = {
      'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
      'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
      'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
      'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
      'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
      'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
      'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
      'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
      'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
      'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
      'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
      'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ', 'ｯ': 'ッ',
      'ｰ': 'ー', 'ﾞ': '゛', 'ﾟ': '゜'
    };

    for (const [half, full] of Object.entries(halfToFullKana)) {
      normalized = normalized.replace(new RegExp(half, 'g'), full);
    }

    // OCR特有の誤認識パターン修正
    const ocrCorrections: { [key: string]: string } = {
      // 類似文字の修正
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
      '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
      'Ｏ': 'O', 'ｏ': 'o', 'О': 'O', // 全角O、小文字o、キリル文字O
      'ｌ': 'l', // 全角小文字L
      'ー': 'ー', '―': 'ー', '‐': 'ー', // 長音記号の統一
      '～': '〜', // 波線の統一
    };

    for (const [wrong, correct] of Object.entries(ocrCorrections)) {
      normalized = normalized.replace(new RegExp(wrong, 'g'), correct);
    }

    // 不要な空白・改行の除去
    normalized = normalized
      .replace(/\r\n/g, '\n') // CRLF -> LF
      .replace(/\r/g, '\n') // CR -> LF
      .replace(/\n{3,}/g, '\n\n') // 3つ以上の改行を2つに
      .replace(/[ 　]{2,}/g, ' ') // 連続する空白を1つに
      .trim();

    // 句読点の修正
    normalized = normalized
      .replace(/､/g, '、') // 読点の統一
      .replace(/｡/g, '。') // 句点の統一
      .replace(/([。！？])\s*([^」』）】〉》〕］｝\n])/g, '$1\n$2'); // 句読点後の改行

    return success(normalized);
  } catch (error) {
    return failure({
      type: 'NORMALIZATION_FAILED',
      message: 'OCRテキストの正規化に失敗しました',
      issues: [error instanceof Error ? error.message : String(error)]
    });
  }
};

/**
 * 17. 話者情報管理関数
 * 話者IDから話者情報を取得
 */
export type SpeakerInfo = {
  id: number;
  name: string;
  styles: Array<{ id: number; name: string }>;
};

const SPEAKER_DATABASE: Map<number, SpeakerInfo> = new Map([
  [3, {
    id: 3,
    name: 'ずんだもん',
    styles: [
      { id: 3, name: 'ノーマル' },
      { id: 7, name: 'ささやき' },
      { id: 22, name: 'ひそひそ' }
    ]
  }],
  [2, {
    id: 2,
    name: '四国めたん',
    styles: [
      { id: 2, name: 'ノーマル' },
      { id: 0, name: 'あまあま' },
      { id: 6, name: 'ツンツン' }
    ]
  }]
]);

export const getSpeakerInfo = (speakerId: number): SpeakerInfo | null => {
  return SPEAKER_DATABASE.get(speakerId) || null;
};

/**
 * 18. 話者ID検証関数（四国めたん対応）
 */
export const validateSpeakerId = (speakerId: number): boolean => {
  return VALID_SPEAKER_IDS.includes(speakerId);
};

/**
 * 19. チャンク推定再生時間計算関数
 * テキストの長さから推定再生時間を計算
 */
export const estimateChunkDuration = (chunk: ExtendedChunk): number => {
  // 日本語の平均読み上げ速度: 約300-400文字/分
  // 保守的に350文字/分で計算
  const charactersPerMinute = 350;
  const charactersPerSecond = charactersPerMinute / 60;

  // 句読点による追加の間
  const pauseCount = (chunk.text.match(/[。、！？]/g) || []).length;
  const pauseDuration = pauseCount * 0.2; // 句読点ごとに0.2秒の間

  const baseDuration = chunk.size / charactersPerSecond;
  return baseDuration + pauseDuration;
};

/**
 * 20. WAVヘッダー検証関数
 * WAVフォーマットのヘッダーを検証
 */
export const validateWAVHeader = (buffer: ArrayBuffer): boolean => {
  if (buffer.byteLength < 44) {
    return false; // WAVヘッダーの最小サイズ
  }

  const view = new DataView(buffer);

  // "RIFF"チェック
  const riff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );

  if (riff !== 'RIFF') {
    return false;
  }

  // "WAVE"チェック
  const wave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11)
  );

  return wave === 'WAVE';
};

/**
 * 21. エラーリトライ判定関数
 * エラーの種類と試行回数からリトライ可否を判定
 */
export const shouldRetryError = (error: Error, attemptCount: number, maxAttempts: number = 3): boolean => {
  if (attemptCount >= maxAttempts) {
    return false;
  }

  const errorType = detectErrorType(error);

  // ネットワークエラーと音声合成エラーはリトライ可能
  return errorType === 'NETWORK' || errorType === 'SYNTHESIS';
};

/**
 * 22. リトライ遅延計算関数
 * エクスポネンシャルバックオフでリトライ遅延を計算
 */
export const calculateRetryDelay = (
  attemptCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
  // ジッターを追加（±20%）
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
};