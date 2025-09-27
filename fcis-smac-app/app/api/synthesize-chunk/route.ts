export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

interface ChunkSynthesizeRequest {
  text: string;
  speakerId: number;
  chunkIndex: number;
  totalChunks: number;
  config?: {
    speedScale?: number;
    pitchScale?: number;
    intonationScale?: number;
    volumeScale?: number;
  };
}

interface ChunkSynthesizeResponse {
  audio?: string;
  chunkIndex?: number;
  totalChunks?: number;
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
}

function validateChunkRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.text || typeof body.text !== 'string') {
    errors.push('text is required and must be a string');
  } else if (body.text.length < 1 || body.text.length > 500) {
    errors.push('chunk text must be between 1 and 500 characters');
  }

  if (typeof body.speakerId !== 'number') {
    errors.push('speakerId is required and must be a number');
  } else if (body.speakerId < 0 || body.speakerId > 50) {
    errors.push('speakerId must be between 0 and 50');
  }

  if (typeof body.chunkIndex !== 'number' || body.chunkIndex < 0) {
    errors.push('chunkIndex is required and must be a non-negative number');
  }

  if (typeof body.totalChunks !== 'number' || body.totalChunks < 1) {
    errors.push('totalChunks is required and must be a positive number');
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

async function synthesizeChunk(request: ChunkSynthesizeRequest): Promise<ChunkSynthesizeResponse> {
  const voicevoxUrl = process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021';

  try {
    console.log(`[CHUNK API] Processing chunk ${request.chunkIndex + 1}/${request.totalChunks} for speaker ${request.speakerId}`);

    // Step 1: Get audio query from VOICEVOX
    const audioQueryParams = new URLSearchParams({
      text: request.text,
      speaker: request.speakerId.toString()
    });

    const audioQueryResponse = await fetch(
      `${voicevoxUrl}/audio_query?${audioQueryParams}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout for chunk audio query
      }
    );

    if (!audioQueryResponse.ok) {
      const errorText = await audioQueryResponse.text();
      console.error(`[CHUNK API] Audio query failed: ${audioQueryResponse.status} - ${errorText}`);

      return {
        error: {
          code: 'VOICEVOX_CHUNK_AUDIO_QUERY_ERROR',
          message: `Failed to create audio query for chunk ${request.chunkIndex + 1}: ${audioQueryResponse.status}`,
          isRetryable: audioQueryResponse.status >= 500,
        }
      };
    }

    let audioQuery = await audioQueryResponse.json();

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
    const synthesisResponse = await fetch(
      `${voicevoxUrl}/synthesis?speaker=${request.speakerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery),
        signal: AbortSignal.timeout(60000), // 60 second timeout for chunk synthesis
      }
    );

    if (!synthesisResponse.ok) {
      const errorText = await synthesisResponse.text();
      console.error(`[CHUNK API] Synthesis failed: ${synthesisResponse.status} - ${errorText}`);

      return {
        error: {
          code: 'VOICEVOX_CHUNK_SYNTHESIS_ERROR',
          message: `Failed to synthesize audio for chunk ${request.chunkIndex + 1}: ${synthesisResponse.status}`,
          isRetryable: synthesisResponse.status >= 500,
        }
      };
    }

    // Convert audio data to Base64
    const audioBuffer = await synthesisResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    console.log(`[CHUNK API] Successfully synthesized chunk ${request.chunkIndex + 1}/${request.totalChunks} (${audioBuffer.byteLength} bytes)`);

    return {
      audio: audioBase64,
      chunkIndex: request.chunkIndex,
      totalChunks: request.totalChunks,
    };

  } catch (error) {
    console.error(`[CHUNK API] Connection error for chunk ${request.chunkIndex + 1}:`, error);

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return {
          error: {
            code: 'CHUNK_TIMEOUT_ERROR',
            message: `Request timed out for chunk ${request.chunkIndex + 1}`,
            isRetryable: true,
          }
        };
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        return {
          error: {
            code: 'CHUNK_CONNECTION_ERROR',
            message: 'Unable to connect to VOICEVOX server',
            isRetryable: true,
          }
        };
      }
    }

    return {
      error: {
        code: 'CHUNK_UNKNOWN_ERROR',
        message: `An unexpected error occurred for chunk ${request.chunkIndex + 1}`,
        isRetryable: false,
      }
    };
  }
}

// POST handler for /api/synthesize-chunk
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[CHUNK API] POST /api/synthesize-chunk - Request received');

  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateChunkRequest(body);
    if (!validation.isValid) {
      console.error('[CHUNK API] Validation error:', validation.errors);
      return NextResponse.json(
        {
          error: {
            code: 'CHUNK_VALIDATION_ERROR',
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

    const chunkRequest: ChunkSynthesizeRequest = body;

    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    let result: ChunkSynthesizeResponse;

    if (isMockMode) {
      console.log('[CHUNK API] Mock mode enabled - returning dummy data for chunk');
      // Generate a simple mock audio data (Base64 encoded dummy WAV)
      const mockAudioData = "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DqumEOCFir5eGpWBELTKXh7IFSfX2B";

      result = {
        audio: mockAudioData,
        chunkIndex: chunkRequest.chunkIndex,
        totalChunks: chunkRequest.totalChunks,
      };
    } else {
      result = await synthesizeChunk(chunkRequest);
    }

    // Handle success or error responses
    if (result.error) {
      const statusCode = result.error.code === 'CHUNK_VALIDATION_ERROR' ? 400 :
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
    console.error('[CHUNK API] Unexpected error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'CHUNK_INTERNAL_ERROR',
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