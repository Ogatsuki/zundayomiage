import { NextRequest, NextResponse } from 'next/server';

const VOICEVOX_API_URL = process.env.VOICEVOX_API_URL || 'http://localhost:50021';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const speaker = searchParams.get('speaker');

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    if (!speaker) {
      return NextResponse.json(
        { error: 'Speaker parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[VOICEVOX API] Creating audio query - Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}", Speaker: ${speaker}`);

    const voicevoxResponse = await fetch(
      `${VOICEVOX_API_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30秒タイムアウト
      }
    );

    if (!voicevoxResponse.ok) {
      console.error(`[VOICEVOX API] Audio query failed: ${voicevoxResponse.status} ${voicevoxResponse.statusText}`);
      return NextResponse.json(
        {
          error: 'VOICEVOX API request failed',
          status: voicevoxResponse.status,
          statusText: voicevoxResponse.statusText
        },
        { status: voicevoxResponse.status }
      );
    }

    const audioQuery = await voicevoxResponse.json();
    console.log(`[VOICEVOX API] Audio query created successfully`);

    return NextResponse.json(audioQuery, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[VOICEVOX API] Audio query error:', error);

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Request timeout - VOICEVOX engine may be unavailable' },
          { status: 408 }
        );
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return NextResponse.json(
          { error: 'Cannot connect to VOICEVOX engine' },
          { status: 503 }
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