import { NextRequest, NextResponse } from 'next/server'
import VoicevoxClient from '@/lib/voicevox-client'
import { ZUNDAMON_SPEAKER_ID } from '@/types/voicevox'

export async function POST(request: NextRequest) {
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

    // Use Zundamon speaker ID (fixed)
    const speaker = ZUNDAMON_SPEAKER_ID

    // Create VOICEVOX client instance
    const client = new VoicevoxClient()

    // Generate audio query
    const audioQuery = await client.getAudioQuery(body.text, speaker)

    return NextResponse.json(audioQuery)
  } catch (error) {
    console.error('Audio query generation error:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Audio query generation failed'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}