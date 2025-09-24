import { NextRequest, NextResponse } from 'next/server'
import VoicevoxClient from '@/lib/voicevox-client'
import { ZUNDAMON_SPEAKER_ID } from '@/types/voicevox'
import { convertWavToMp3 } from '@/lib/audio-converter'
import { ConcurrentLimiter } from '@/lib/concurrent-limiter'

/**
 * Combined endpoint for text-to-speech generation
 * This combines audio_query and synthesis in a single request
 */
export async function POST(request: NextRequest) {
  const endpoint = 'voicevox-generate';

  // 同時処理制限チェック
  const acquired = await ConcurrentLimiter.acquire(endpoint);
  if (!acquired) {
    return NextResponse.json(
      { error: '混雑中です。しばらく待ってからお試しください。' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json()

    // Validate request body
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'テキストが指定されていません' },
        { status: 400 }
      )
    }

    if (body.text.length > 100000) {
      return NextResponse.json(
        { error: 'テキストは100,000文字以内で入力してください' },
        { status: 400 }
      )
    }

    // Use speaker ID from request body, fallback to Zundamon if not provided
    const speaker = body.speaker || ZUNDAMON_SPEAKER_ID

    // 改行を読点に変換して一拍おくようにする
    const processedText = body.text.replace(/\n/g, '、')

    // Create VOICEVOX client instance
    const client = new VoicevoxClient()

    // Generate speech directly from text
    const audioData = await client.generateSpeech(processedText, speaker)

    // WAVからMP3に変換
    const mp3Data = await convertWavToMp3(audioData)

    // ファイル名を話者に応じて変更
    const fileName = speaker === 3 ? 'zundamon' : 'metan'

    // Return audio data as MP3 file
    return new NextResponse(new Uint8Array(mp3Data), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': mp3Data.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}_${Date.now()}.mp3"`,
      },
    })
  } catch (error) {
    console.error('Voice generation error:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Voice generation failed'

    // Check for connection errors
    if (errorMessage.includes('VOICEVOX') && errorMessage.includes('接続')) {
      return NextResponse.json(
        { error: 'VOICEVOXエンジンに接続できません。VOICEVOXが起動していることを確認してください。' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  } finally {
    // 処理権を確実に解放
    ConcurrentLimiter.release(endpoint);
  }
}