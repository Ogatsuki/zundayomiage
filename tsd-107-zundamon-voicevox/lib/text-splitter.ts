/**
 * Text splitting utility for long text processing
 * Splits text into chunks suitable for VOICEVOX processing
 */

// Constants for VOICEVOX API limits
export const DEFAULT_CHUNK_SIZE = 2500;  // 2,730文字の制限に対して安全マージン230文字
export const VOICEVOX_MAX_LENGTH = 2730;  // 実測値（タスク027調査結果）

export interface TextChunk {
  text: string;
  index: number;
}

/**
 * Split text into chunks with intelligent sentence boundary detection
 * @param text Input text to split
 * @param maxChars Maximum characters per chunk (default: 2500)
 * @returns Array of text chunks
 */
export function splitTextIntoChunks(text: string, maxChars: number = DEFAULT_CHUNK_SIZE): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split by sentence endings first (Japanese sentence endings)
  const sentences = text.split(/([。！？])/).filter(part => part.length > 0);

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');

    // If adding this sentence would exceed maxChars
    if ((currentChunk + sentence).length > maxChars) {
      // If we have a current chunk, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If the sentence itself is too long, split by comma or space
      if (sentence.length > maxChars) {
        const subChunks = splitLongSentence(sentence, maxChars);
        chunks.push(...subChunks.slice(0, -1)); // Add all but the last chunk
        currentChunk = subChunks[subChunks.length - 1]; // Keep the last chunk as current
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  // Add the final chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Split a long sentence that doesn't fit in a single chunk
 * @param sentence Long sentence to split
 * @param maxChars Maximum characters per chunk
 * @returns Array of sentence parts
 */
function splitLongSentence(sentence: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  // Split by commas first, then by spaces if necessary
  const parts = sentence.split(/([、,])/).filter(part => part.length > 0);

  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i] + (parts[i + 1] || '');

    if ((currentChunk + part).length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If even a single part is too long, split by character boundaries
      if (part.length > maxChars) {
        const subParts = splitByCharacterBoundary(part, maxChars);
        chunks.push(...subParts.slice(0, -1));
        currentChunk = subParts[subParts.length - 1];
      } else {
        currentChunk = part;
      }
    } else {
      currentChunk += part;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Split text by character boundary as last resort
 * @param text Text to split
 * @param maxChars Maximum characters per chunk
 * @returns Array of text parts
 */
function splitByCharacterBoundary(text: string, maxChars: number): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }

  return chunks;
}

/**
 * Create indexed chunks for processing
 * @param chunks Array of text chunks
 * @returns Array of indexed text chunks
 */
export function createIndexedChunks(chunks: string[]): TextChunk[] {
  return chunks.map((text, index) => ({
    text,
    index
  }));
}

/**
 * Validate text length and return appropriate processing strategy
 * @param text Input text
 * @param shortTextLimit Limit for short text processing (default: 2500)
 * @param maxTextLimit Maximum allowed text length (default: 100000)
 * @returns Processing strategy and chunks if needed
 */
export function analyzeTextProcessing(
  text: string,
  shortTextLimit: number = DEFAULT_CHUNK_SIZE,
  maxTextLimit: number = 100000
): {
  strategy: 'short' | 'long' | 'invalid';
  chunks?: string[];
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { strategy: 'invalid', error: 'テキストが入力されていません' };
  }

  if (text.length > maxTextLimit) {
    return {
      strategy: 'invalid',
      error: `テキストは${maxTextLimit.toLocaleString()}文字以内で入力してください`
    };
  }

  if (text.length <= shortTextLimit) {
    return { strategy: 'short' };
  }

  // Long text processing with proper chunk size
  const chunks = splitTextIntoChunks(text, DEFAULT_CHUNK_SIZE);
  return {
    strategy: 'long',
    chunks
  };
}