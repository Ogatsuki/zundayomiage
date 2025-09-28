export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { audioProcessor } from '@/lib/audio-processor';
import { splitTextIntoChunks, generateFileName } from '@/core/audio.core';

// Type definitions based on contract specifications
interface SynthesizeRequest {
  text: string;
  speakerId: number;
  config?: {
    speedScale?: number;
    pitchScale?: number;
    intonationScale?: number;
    volumeScale?: number;
  };
}

interface SynthesizeResponse {
  audio: string;
  format: 'mp3';
  fileName: string;
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
}

interface AudioQueryResponse {
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

// Input validation function (Core layer - pure function)
function validateRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.text || typeof body.text !== 'string') {
    errors.push('text is required and must be a string');
  } else if (body.text.length < 1 || body.text.length > 30000) {
    errors.push('text must be between 1 and 30000 characters');
  }

  if (typeof body.speakerId !== 'number') {
    errors.push('speakerId is required and must be a number');
  } else if (body.speakerId < 0 || body.speakerId > 50) {
    errors.push('speakerId must be between 0 and 50');
  }

  if (body.config) {
    const { speedScale, pitchScale, intonationScale, volumeScale } = body.config;

    if (speedScale !== undefined && (speedScale < 0.5 || speedScale > 2.0)) {
      errors.push('speedScale must be between 0.5 and 2.0');
    }

    if (pitchScale !== undefined && (pitchScale < -0.15 || pitchScale > 0.15)) {
      errors.push('pitchScale must be between -0.15 and 0.15');
    }

    if (intonationScale !== undefined && (intonationScale < 0 || intonationScale > 2.0)) {
      errors.push('intonationScale must be between 0 and 2.0');
    }

    if (volumeScale !== undefined && (volumeScale < 0 || volumeScale > 2.0)) {
      errors.push('volumeScale must be between 0 and 2.0');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Mock response generator (Core layer - pure function)
function generateMockResponse(speakerId: number): SynthesizeResponse {
  // Generate a simple mock audio data (Base64 encoded dummy MP3)
  const mockAudioData = "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DqumEOCFir5eGpWBELTKXh7IFSfX2B";
  const fileName = generateFileName(speakerId);

  return {
    audio: mockAudioData,
    format: 'mp3',
    fileName
  };
}

// Core synthesis processing (Shell layer - IO operations)
async function synthesizeAudio(request: SynthesizeRequest): Promise<SynthesizeResponse> {
  // Dockerコンテナ内では内部URLを使用、開発環境では公開URLを使用
  const voicevoxUrl = process.env.VOICEVOX_API_URL || process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021';

  try {
    // Split text into chunks of 500 characters
    const chunks = splitTextIntoChunks(request.text, 500);
    console.log(`[Audio Processing] Splitting text into ${chunks.length} chunks`);

    const wavBuffers: ArrayBuffer[] = [];
    const PARALLEL_LIMIT = 3; // Process 3 chunks in parallel at a time

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += PARALLEL_LIMIT) {
      const batch = chunks.slice(i, Math.min(i + PARALLEL_LIMIT, chunks.length));
      console.log(`[Audio Processing] Processing batch ${Math.floor(i / PARALLEL_LIMIT) + 1}/${Math.ceil(chunks.length / PARALLEL_LIMIT)}`);

      const batchPromises = batch.map(async (chunk) => {
        // Step 1: Get audio query from VOICEVOX
        const audioQueryParams = new URLSearchParams({
          text: chunk.text,
          speaker: request.speakerId.toString()
        });

        console.log(`[VOICEVOX API] Creating audio query for chunk ${chunk.index + 1}/${chunk.totalChunks}`);

        const audioQueryResponse = await fetch(
          `${voicevoxUrl}/audio_query?${audioQueryParams}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(60000), // 60 second timeout per chunk
          }
        );

        if (!audioQueryResponse.ok) {
          const errorText = await audioQueryResponse.text();
          throw new Error(`Audio query failed for chunk ${chunk.index}: ${audioQueryResponse.status} - ${errorText}`);
        }

        let audioQuery: AudioQueryResponse = await audioQueryResponse.json();

        // Apply config overrides if provided
        if (request.config) {
          if (request.config.speedScale !== undefined) {
            audioQuery.speedScale = request.config.speedScale;
          }
          if (request.config.pitchScale !== undefined) {
            audioQuery.pitchScale = request.config.pitchScale;
          }
          if (request.config.intonationScale !== undefined) {
            audioQuery.intonationScale = request.config.intonationScale;
          }
          if (request.config.volumeScale !== undefined) {
            audioQuery.volumeScale = request.config.volumeScale;
          }
        }

        // Step 2: Synthesize audio using the audio query
        console.log(`[VOICEVOX API] Synthesizing audio for chunk ${chunk.index + 1}/${chunk.totalChunks}`);

        const synthesisResponse = await fetch(
          `${voicevoxUrl}/synthesis?speaker=${request.speakerId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(audioQuery),
            signal: AbortSignal.timeout(120000), // 2 minute timeout per chunk
          }
        );

        if (!synthesisResponse.ok) {
          const errorText = await synthesisResponse.text();
          throw new Error(`Synthesis failed for chunk ${chunk.index}: ${synthesisResponse.status} - ${errorText}`);
        }

        const audioBuffer = await synthesisResponse.arrayBuffer();
        console.log(`[VOICEVOX API] Successfully synthesized chunk ${chunk.index + 1}/${chunk.totalChunks} (${audioBuffer.byteLength} bytes)`);

        return { index: chunk.index, buffer: audioBuffer };
      });

      const batchResults = await Promise.all(batchPromises);

      // Sort by index to maintain order
      batchResults.sort((a, b) => a.index - b.index);
      batchResults.forEach(result => wavBuffers.push(result.buffer));
    }

    console.log(`[Audio Processing] Merging ${wavBuffers.length} WAV files`);

    // Merge all WAV files into one
    const mergedWav = await audioProcessor.mergeWavFiles(wavBuffers);
    console.log(`[Audio Processing] Successfully merged WAV files (${mergedWav.byteLength} bytes)`);

    // Convert to MP3
    console.log(`[Audio Processing] Converting to MP3`);
    const mp3Buffer = await audioProcessor.convertToMp3(mergedWav, {
      bitrate: 128,
      channels: 1,
      frequency: 22050
    });
    console.log(`[Audio Processing] Successfully converted to MP3 (${mp3Buffer.byteLength} bytes)`);

    // Generate filename and prepare response
    const fileName = generateFileName(request.speakerId);
    const audioBase64 = Buffer.from(mp3Buffer).toString('base64');

    return {
      audio: audioBase64,
      format: 'mp3',
      fileName
    };

  } catch (error) {
    console.error('[Audio Processing] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
          audio: '',
          format: 'mp3',
          fileName: '',
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'Request timed out while processing audio',
            isRetryable: true,
          }
        };
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        return {
          audio: '',
          format: 'mp3',
          fileName: '',
          error: {
            code: 'CONNECTION_ERROR',
            message: 'Unable to connect to VOICEVOX server',
            isRetryable: true,
          }
        };
      }

      if (error.message.includes('ffmpeg') || error.message.includes('FFmpeg')) {
        return {
          audio: '',
          format: 'mp3',
          fileName: '',
          error: {
            code: 'AUDIO_PROCESSING_ERROR',
            message: 'Failed to process audio files',
            isRetryable: false,
          }
        };
      }
    }

    return {
      audio: '',
      format: 'mp3',
      fileName: '',
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        isRetryable: false,
      }
    };
  }
}

// POST handler for /api/synthesize
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] POST /api/synthesize - Request received');

  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateRequest(body);
    if (!validation.isValid) {
      console.error('[API] Validation error:', validation.errors);
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${validation.errors.join(', ')}`,
            isRetryable: false,
          }
        },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const synthesizeRequest: SynthesizeRequest = body;

    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    let result: SynthesizeResponse;

    if (isMockMode) {
      console.log('[API] Mock mode enabled - returning dummy data');
      result = generateMockResponse(synthesizeRequest.speakerId);
    } else {
      result = await synthesizeAudio(synthesizeRequest);
    }

    // Handle success or error responses
    if (result.error) {
      const statusCode = result.error.code === 'VALIDATION_ERROR' ? 400 :
                        result.error.code.includes('CONNECTION') ? 502 : 503;

      return NextResponse.json(result, {
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          isRetryable: false,
        }
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}