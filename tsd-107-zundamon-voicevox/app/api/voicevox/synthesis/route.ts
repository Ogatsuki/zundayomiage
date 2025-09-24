import { NextRequest, NextResponse } from 'next/server'
import VoicevoxClient from '@/lib/voicevox-client'
import { ZUNDAMON_SPEAKER_ID, AudioQuery } from '@/types/voicevox'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Audio queryが指定されていません' },
        { status: 400 }
      )
    }

    // Validate audio query structure
    if (!body.accent_phrases || !Array.isArray(body.accent_phrases)) {
      return NextResponse.json(
        { error: '無効なAudio queryです' },
        { status: 400 }
      )
    }

    // Use Zundamon speaker ID (fixed)
    const speaker = ZUNDAMON_SPEAKER_ID

    // Create VOICEVOX client instance
    const client = new VoicevoxClient()

    // Synthesize speech
    const audioData = await client.synthesis(body as AudioQuery, speaker)

    // Return audio data as WAV file
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioData.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Speech synthesis error:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Speech synthesis failed'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}