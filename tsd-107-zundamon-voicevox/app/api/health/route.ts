import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Cloud Run
 * Returns 200 OK when the service is healthy
 */
export async function GET() {
  try {
    // VOICEVOXエンジンの接続性チェック
    const voicevoxUrl = process.env.VOICEVOX_URL || 'http://localhost:50021';

    // VOICEVOXの状態を確認 (タイムアウトなし)
    try {
      const response = await fetch(`${voicevoxUrl}/version`);

      const isVoicevoxHealthy = response.ok;

      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          nextjs: 'healthy',
          voicevox: isVoicevoxHealthy ? 'healthy' : 'degraded',
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
        },
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      // VOICEVOXに接続できない場合でも、Next.js自体は健全なので200を返す
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          nextjs: 'healthy',
          voicevox: 'unavailable',
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
        },
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (error) {
    // Next.js自体に問題がある場合
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}