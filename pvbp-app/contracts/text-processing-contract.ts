/**
 * ========== Text Processing Contract ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 *
 * Purpose: Contract for text processing functionality
 * Runtime: universal (works on both server and client)
 */

export interface TextProcessingContract {
  /**
   * Clean and normalize text for voice synthesis
   */
  normalizeText(text: string): TextProcessingResult;

  /**
   * Split text into manageable chunks
   */
  chunkText(text: string, maxLength?: number): string[];

  /**
   * Validate text for synthesis compatibility
   */
  validateText(text: string): TextValidationResult;

  /**
   * Extract metadata from text
   */
  extractMetadata(text: string): TextMetadata;
}

export interface TextProcessingResult {
  processed_text: string;
  original_length: number;
  processed_length: number;
  modifications: TextModification[];
  success: boolean;
  error?: string;
}

export interface TextValidationResult {
  is_valid: boolean;
  warnings: string[];
  errors: string[];
  estimated_duration_seconds?: number;
}

export interface TextMetadata {
  character_count: number;
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  language_detected?: string;
  estimated_reading_time_minutes: number;
}

export interface TextModification {
  type: 'normalization' | 'removal' | 'replacement' | 'formatting';
  original: string;
  modified: string;
  position: number;
  reason: string;
}