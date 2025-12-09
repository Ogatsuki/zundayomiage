/**
 * Standard error codes for VOICEVOX API operations
 */
export enum VoicevoxErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_TEXT_LENGTH = 'INVALID_TEXT_LENGTH',
  INVALID_SPEAKER_ID = 'INVALID_SPEAKER_ID',
  INVALID_CONFIG = 'INVALID_CONFIG',
  CHUNK_VALIDATION_ERROR = 'CHUNK_VALIDATION_ERROR',

  // Connection errors (502)
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CHUNK_CONNECTION_ERROR = 'CHUNK_CONNECTION_ERROR',

  // Timeout errors (504)
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUDIO_QUERY_TIMEOUT = 'AUDIO_QUERY_TIMEOUT',
  SYNTHESIS_TIMEOUT = 'SYNTHESIS_TIMEOUT',
  CHUNK_TIMEOUT_ERROR = 'CHUNK_TIMEOUT_ERROR',

  // VOICEVOX server errors (503)
  VOICEVOX_ERROR = 'VOICEVOX_ERROR',
  VOICEVOX_AUDIO_QUERY_ERROR = 'VOICEVOX_AUDIO_QUERY_ERROR',
  VOICEVOX_SYNTHESIS_ERROR = 'VOICEVOX_SYNTHESIS_ERROR',
  VOICEVOX_CHUNK_AUDIO_QUERY_ERROR = 'VOICEVOX_CHUNK_AUDIO_QUERY_ERROR',
  VOICEVOX_CHUNK_SYNTHESIS_ERROR = 'VOICEVOX_CHUNK_SYNTHESIS_ERROR',
  VOICEVOX_SERVER_ERROR = 'VOICEVOX_SERVER_ERROR',

  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CHUNK_INTERNAL_ERROR = 'CHUNK_INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CHUNK_UNKNOWN_ERROR = 'CHUNK_UNKNOWN_ERROR',

  // Processing errors
  CHUNK_PROCESSING_ERROR = 'CHUNK_PROCESSING_ERROR',
  MERGE_ERROR = 'MERGE_ERROR',
  ENCODING_ERROR = 'ENCODING_ERROR',
}

/**
 * Standard error response structure
 */
export interface VoicevoxErrorResponse {
  error: {
    code: VoicevoxErrorCode | string;
    message: string;
    isRetryable: boolean;
    details?: any;
  };
}

/**
 * Error factory for creating standardized errors
 */
export class VoicevoxErrorFactory {
  static createValidationError(message: string, details?: any): VoicevoxErrorResponse {
    return {
      error: {
        code: VoicevoxErrorCode.VALIDATION_ERROR,
        message,
        isRetryable: false,
        details,
      },
    };
  }

  static createConnectionError(message: string, details?: any): VoicevoxErrorResponse {
    return {
      error: {
        code: VoicevoxErrorCode.CONNECTION_ERROR,
        message,
        isRetryable: true,
        details,
      },
    };
  }

  static createTimeoutError(message: string, details?: any): VoicevoxErrorResponse {
    return {
      error: {
        code: VoicevoxErrorCode.TIMEOUT_ERROR,
        message,
        isRetryable: true,
        details,
      },
    };
  }

  static createVoicevoxError(message: string, isRetryable = false, details?: any): VoicevoxErrorResponse {
    return {
      error: {
        code: VoicevoxErrorCode.VOICEVOX_ERROR,
        message,
        isRetryable,
        details,
      },
    };
  }

  static createInternalError(message: string, details?: any): VoicevoxErrorResponse {
    return {
      error: {
        code: VoicevoxErrorCode.INTERNAL_ERROR,
        message,
        isRetryable: false,
        details,
      },
    };
  }

  static fromError(error: unknown): VoicevoxErrorResponse {
    if (error instanceof Error) {
      // Timeout errors
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return this.createTimeoutError(
          'Request timed out while communicating with VOICEVOX server',
          { originalError: error.message }
        );
      }

      // Connection errors
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('fetch')
      ) {
        return this.createConnectionError(
          'Unable to connect to VOICEVOX server',
          { originalError: error.message }
        );
      }

      // Default error
      return this.createInternalError(
        'An unexpected error occurred',
        { originalError: error.message }
      );
    }

    // Unknown error type
    return this.createInternalError(
      'An unknown error occurred',
      { originalError: String(error) }
    );
  }
}

/**
 * Get HTTP status code for error code
 */
export function getStatusCodeForError(code: VoicevoxErrorCode | string): number {
  switch (code) {
    case VoicevoxErrorCode.VALIDATION_ERROR:
    case VoicevoxErrorCode.INVALID_TEXT_LENGTH:
    case VoicevoxErrorCode.INVALID_SPEAKER_ID:
    case VoicevoxErrorCode.INVALID_CONFIG:
    case VoicevoxErrorCode.CHUNK_VALIDATION_ERROR:
      return 400;

    case VoicevoxErrorCode.CONNECTION_ERROR:
    case VoicevoxErrorCode.CONNECTION_REFUSED:
    case VoicevoxErrorCode.NETWORK_ERROR:
    case VoicevoxErrorCode.CHUNK_CONNECTION_ERROR:
      return 502;

    case VoicevoxErrorCode.TIMEOUT_ERROR:
    case VoicevoxErrorCode.AUDIO_QUERY_TIMEOUT:
    case VoicevoxErrorCode.SYNTHESIS_TIMEOUT:
    case VoicevoxErrorCode.CHUNK_TIMEOUT_ERROR:
      return 504;

    case VoicevoxErrorCode.VOICEVOX_ERROR:
    case VoicevoxErrorCode.VOICEVOX_AUDIO_QUERY_ERROR:
    case VoicevoxErrorCode.VOICEVOX_SYNTHESIS_ERROR:
    case VoicevoxErrorCode.VOICEVOX_CHUNK_AUDIO_QUERY_ERROR:
    case VoicevoxErrorCode.VOICEVOX_CHUNK_SYNTHESIS_ERROR:
    case VoicevoxErrorCode.VOICEVOX_SERVER_ERROR:
      return 503;

    case VoicevoxErrorCode.INTERNAL_ERROR:
    case VoicevoxErrorCode.CHUNK_INTERNAL_ERROR:
    case VoicevoxErrorCode.UNKNOWN_ERROR:
    case VoicevoxErrorCode.CHUNK_UNKNOWN_ERROR:
    case VoicevoxErrorCode.CHUNK_PROCESSING_ERROR:
    case VoicevoxErrorCode.MERGE_ERROR:
    case VoicevoxErrorCode.ENCODING_ERROR:
    default:
      return 500;
  }
}