import { NextRequest, NextResponse } from 'next/server';

const VOICEVOX_API_URL = process.env.VOICEVOX_API_URL || 'http://localhost:50021';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speaker = searchParams.get('speaker');

    if (!speaker) {
      return NextResponse.json(
        { error: 'Speaker parameter is required' },
        { status: 400 }
      );
    }

    const audioQuery = await request.json();
    if (!audioQuery) {
      return NextResponse.json(
        { error: 'Audio query data is required in request body' },
        { status: 400 }
      );
    }

    console.log(`[VOICEVOX API] Synthesizing audio - Speaker: ${speaker}`);

    const voicevoxResponse = await fetch(
      `${VOICEVOX_API_URL}/synthesis?speaker=${speaker}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery),
        signal: AbortSignal.timeout(60000), // 60秒タイムアウト（音声合成は時間がかかる可能性がある）
      }
    );

    if (!voicevoxResponse.ok) {
      console.error(`[VOICEVOX API] Audio synthesis failed: ${voicevoxResponse.status} ${voicevoxResponse.statusText}`);
      return NextResponse.json(
        {
          error: 'VOICEVOX API synthesis request failed',
          status: voicevoxResponse.status,
          statusText: voicevoxResponse.statusText
        },
        { status: voicevoxResponse.status }
      );
    }

    const audioBuffer = await voicevoxResponse.arrayBuffer();
    console.log(`[VOICEVOX API] Audio synthesis completed - Size: ${audioBuffer.byteLength} bytes`);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[VOICEVOX API] Audio synthesis error:', error);

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Request timeout - Audio synthesis taking too long' },
          { status: 408 }
        );
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return NextResponse.json(
          { error: 'Cannot connect to VOICEVOX engine' },
          { status: 503 }
        );
      }

      if (error.message.includes('JSON')) {
        return NextResponse.json(
          { error: 'Invalid audio query format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}