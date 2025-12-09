export interface AudioQuery {
  accent_phrases: any[];
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana: string;
}

export interface VoicevoxConfig {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
}

export interface VoicevoxError {
  code: string;
  message: string;
  isRetryable: boolean;
}

export class VoicevoxClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = 'http://localhost:50021', timeout = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Check if the VOICEVOX server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      if (!response.ok) {
        console.warn(`[VoicevoxClient] Health check failed with status: ${response.status}`);
        return false;
      }

      const version = await response.text();
      console.log(`[VoicevoxClient] VOICEVOX server is healthy, version: ${version}`);
      return true;
    } catch (error) {
      console.error('[VoicevoxClient] Health check error:', error);
      return false;
    }
  }

  /**
   * Get audio query for text synthesis
   */
  async getAudioQuery(text: string, speakerId: number): Promise<AudioQuery> {
    const params = new URLSearchParams({
      text,
      speaker: speakerId.toString(),
    });

    console.log(`[VoicevoxClient] Getting audio query for text length: ${text.length}, speaker: ${speakerId}`);

    const response = await fetch(`${this.baseUrl}/audio_query?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get audio query: ${response.status} - ${errorText}`);
    }

    const audioQuery = await response.json();
    return audioQuery;
  }

  /**
   * Synthesize audio from audio query
   */
  async synthesize(query: AudioQuery, speakerId: number): Promise<ArrayBuffer> {
    console.log(`[VoicevoxClient] Synthesizing audio for speaker: ${speakerId}`);

    const response = await fetch(`${this.baseUrl}/synthesis?speaker=${speakerId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(this.timeout * 2), // Double timeout for synthesis
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to synthesize audio: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[VoicevoxClient] Successfully synthesized audio (${audioBuffer.byteLength} bytes)`);
    return audioBuffer;
  }

  /**
   * Synthesize audio with retry logic
   */
  async synthesizeWithRetry(
    text: string,
    speakerId: number,
    maxRetries = 3,
    config?: VoicevoxConfig
  ): Promise<ArrayBuffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[VoicevoxClient] Synthesis attempt ${attempt}/${maxRetries}`);

        // Get audio query
        const audioQuery = await this.getAudioQuery(text, speakerId);

        // Apply config if provided
        if (config) {
          if (config.speedScale !== undefined) audioQuery.speedScale = config.speedScale;
          if (config.pitchScale !== undefined) audioQuery.pitchScale = config.pitchScale;
          if (config.intonationScale !== undefined) audioQuery.intonationScale = config.intonationScale;
          if (config.volumeScale !== undefined) audioQuery.volumeScale = config.volumeScale;
        }

        // Synthesize audio
        const audioBuffer = await this.synthesize(audioQuery, speakerId);
        return audioBuffer;

      } catch (error) {
        lastError = error as Error;
        console.error(`[VoicevoxClient] Attempt ${attempt} failed:`, error);

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error as Error);

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[VoicevoxClient] Waiting ${waitTime}ms before retry...`);
        await this.delay(waitTime);
      }
    }

    throw lastError || new Error('Synthesis failed after retries');
  }

  /**
   * Process text in chunks for long content
   */
  async synthesizeInChunks(
    text: string,
    speakerId: number,
    chunkSize = 500,
    config?: VoicevoxConfig
  ): Promise<ArrayBuffer[]> {
    const chunks = this.splitTextIntoChunks(text, chunkSize);
    const results: ArrayBuffer[] = [];

    console.log(`[VoicevoxClient] Processing ${chunks.length} chunks of text`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[VoicevoxClient] Processing chunk ${i + 1}/${chunks.length}`);

      try {
        const audioBuffer = await this.synthesizeWithRetry(
          chunks[i],
          speakerId,
          3,
          config
        );
        results.push(audioBuffer);
      } catch (error) {
        console.error(`[VoicevoxClient] Failed to process chunk ${i + 1}:`, error);
        throw new Error(`Failed to synthesize chunk ${i + 1}/${chunks.length}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Split text into chunks
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/(?<=[。！？\.\!\?])/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If a single sentence is longer than maxLength, split by characters
        if (sentence.length > maxLength) {
          let remaining = sentence;
          while (remaining.length > 0) {
            chunks.push(remaining.substring(0, maxLength));
            remaining = remaining.substring(maxLength);
          }
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'TimeoutError',
      'ENOTFOUND',
      'ECONNRESET',
      'fetch',
    ];

    return retryableMessages.some(msg =>
      error.message.includes(msg) || error.name === msg
    );
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
  }

  /**
   * Merge multiple WAV files
   * Note: This is a simplified implementation that assumes all WAV files have the same format
   */
  static mergeWavFiles(buffers: ArrayBuffer[]): ArrayBuffer {
    if (buffers.length === 0) {
      throw new Error('No audio buffers to merge');
    }

    if (buffers.length === 1) {
      return buffers[0];
    }

    // This is a simplified merge that concatenates the data chunks
    // In production, you would need to properly parse WAV headers and merge them correctly
    const totalDataSize = buffers.reduce((sum, buffer) => {
      // Skip WAV header (44 bytes) and get data size
      return sum + buffer.byteLength - 44;
    }, 0);

    // Create new WAV file with proper header
    const result = new ArrayBuffer(44 + totalDataSize);
    const view = new DataView(result);
    const uint8View = new Uint8Array(result);

    // Copy header from first file
    const firstView = new Uint8Array(buffers[0]);
    for (let i = 0; i < 44; i++) {
      uint8View[i] = firstView[i];
    }

    // Update file size in header
    view.setUint32(4, 36 + totalDataSize, true);
    view.setUint32(40, totalDataSize, true);

    // Copy audio data from all buffers
    let offset = 44;
    for (const buffer of buffers) {
      const dataView = new Uint8Array(buffer);
      const dataStart = 44; // Skip header
      const dataLength = buffer.byteLength - 44;

      for (let i = 0; i < dataLength; i++) {
        uint8View[offset + i] = dataView[dataStart + i];
      }

      offset += dataLength;
    }

    return result;
  }
}