/**
 * FCIS+SMAC Architecture - Core Layer
 * Pure functions for audio processing logic
 * No side effects, 100% testable
 */

export interface AudioChunk {
  index: number;
  text: string;
  totalChunks: number;
}

export interface AudioMetadata {
  fileName: string;
  format: 'mp3';
  speakerName: 'zundamon' | 'metan';
  timestamp: number;
}

export interface AudioCoreContract {
  splitTextIntoChunks: (text: string, maxLength?: number) => AudioChunk[];
  generateFileName: (speakerId: number, timestamp?: number) => string;
  validateAudioFormat: (format: string) => boolean;
  calculateTotalChunks: (textLength: number, chunkSize?: number) => number;
  getSpeakerName: (speakerId: number) => 'zundamon' | 'metan';
}

/**
 * Split text into chunks with consideration for Japanese punctuation
 * Pure function - no side effects
 */
export function splitTextIntoChunks(text: string, maxLength = 500): AudioChunk[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chars = Array.from(text);
  const chunks: AudioChunk[] = [];
  let currentChunkStart = 0;

  while (currentChunkStart < chars.length) {
    let chunkEnd = Math.min(currentChunkStart + maxLength, chars.length);

    // If not at the end and chunk is full size, try to break at punctuation
    if (chunkEnd < chars.length && chunkEnd - currentChunkStart === maxLength) {
      const searchStart = Math.max(currentChunkStart + maxLength - 10, currentChunkStart);
      const searchEnd = chunkEnd;

      // Look for punctuation in the last 10 characters
      for (let i = searchEnd - 1; i >= searchStart; i--) {
        if ('。、！？．，!?'.includes(chars[i])) {
          chunkEnd = i + 1;
          break;
        }
      }
    }

    const chunkText = chars.slice(currentChunkStart, chunkEnd).join('');
    chunks.push({
      index: chunks.length,
      text: chunkText,
      totalChunks: 0, // Will be updated after all chunks are created
    });

    currentChunkStart = chunkEnd;
  }

  // Update totalChunks for all chunks
  const totalChunks = chunks.length;
  return chunks.map(chunk => ({
    ...chunk,
    totalChunks
  }));
}

/**
 * Generate filename for audio download
 * Pure function - timestamp must be passed as parameter
 */
export function generateFileName(speakerId: number, timestamp?: number): string {
  const speakerName = getSpeakerName(speakerId);
  const ts = timestamp ?? Date.now();
  return `${speakerName}_${ts}.mp3`;
}

/**
 * Get speaker name from speaker ID
 * Pure function - deterministic mapping
 */
export function getSpeakerName(speakerId: number): 'zundamon' | 'metan' {
  switch (speakerId) {
    case 2:
      return 'metan';
    case 3:
      return 'zundamon';
    default:
      return 'zundamon'; // Default fallback
  }
}

/**
 * Validate audio format
 * Pure function - currently only mp3 is supported
 */
export function validateAudioFormat(format: string): boolean {
  return format === 'mp3';
}

/**
 * Calculate total number of chunks for given text length
 * Pure function - simple math calculation
 */
export function calculateTotalChunks(textLength: number, chunkSize = 500): number {
  if (textLength <= 0) {
    return 0;
  }
  return Math.ceil(textLength / chunkSize);
}

// Export contract implementation
export const audioCoreContract: AudioCoreContract = {
  splitTextIntoChunks,
  generateFileName,
  validateAudioFormat,
  calculateTotalChunks,
  getSpeakerName,
};