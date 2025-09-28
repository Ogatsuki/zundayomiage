export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  // モックモードの場合
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return NextResponse.json({
      status: 'mock',
      message: 'Running in mock mode'
    });
  }

  const voicevoxUrl = process.env.NEXT_PUBLIC_VOICEVOX_API_URL || 'http://localhost:50021';

  try {
    const response = await fetch(`${voicevoxUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const version = await response.text();
      return NextResponse.json({
        status: 'connected',
        version: version.trim()
      });
    } else {
      return NextResponse.json({
        status: 'disconnected',
        error: `HTTP ${response.status}`
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Connection failed'
    }, { status: 503 });
  }
}