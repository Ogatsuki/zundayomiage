import { NextRequest, NextResponse } from 'next/server'
import VoicevoxClient from '@/lib/voicevox-client'
import { ZUNDAMON_SPEAKER_ID } from '@/types/voicevox'
import { analyzeTextProcessing, splitTextIntoChunks } from '@/lib/text-splitter'
import { mergeWavToMp3 } from '@/lib/audio-merger'

/**
 * Long text processing endpoint for text-to-speech generation
 * Handles texts longer than 10000 characters by splitting and merging
 */
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

    // Analyze text and determine processing strategy
    const analysis = analyzeTextProcessing(body.text, 10000, 100000)

    if (analysis.strategy === 'invalid') {
      return NextResponse.json(
        { error: analysis.error },
        { status: 400 }
      )
    }

    if (analysis.strategy === 'short') {
      return NextResponse.json(
        { error: '短いテキストは通常のAPIエンドポイントを使用してください' },
        { status: 400 }
      )
    }

    // Use speaker ID from request body, fallback to Zundamon if not provided
    const speaker = body.speaker || ZUNDAMON_SPEAKER_ID

    // Create VOICEVOX client instance
    const client = new VoicevoxClient()

    // Split text into chunks
    const chunks = analysis.chunks!
    console.log(`Processing long text: ${body.text.length} chars, ${chunks.length} chunks`)

    // Generate speech for each chunk
    const wavBuffers: ArrayBuffer[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.length} chars`)

      try {
        const audioData = await client.generateSpeech(chunk, speaker)
        wavBuffers.push(audioData)
      } catch (error) {
        console.error(`Failed to process chunk ${i + 1}:`, error)
        throw new Error(`音声生成中にエラーが発生しました（チャンク ${i + 1}/${chunks.length}）`)
      }
    }

    console.log(`Generated ${wavBuffers.length} audio chunks, merging...`)

    // Merge WAV files and convert to MP3
    const mp3Data = await mergeWavToMp3(wavBuffers)

    // ファイル名を話者に応じて変更
    const fileName = speaker === 3 ? 'zundamon' : 'metan'

    console.log(`Long text processing completed: ${mp3Data.length} bytes MP3`)

    // Return audio data as MP3 file
    return new NextResponse(new Uint8Array(mp3Data), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': mp3Data.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}_long_${Date.now()}.mp3"`,
      },
    })
  } catch (error) {
    console.error('Long voice generation error:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Long voice generation failed'

    // Check for connection errors
    if (errorMessage.includes('VOICEVOX') && errorMessage.includes('接続')) {
      return NextResponse.json(
        { error: 'VOICEVOXエンジンに接続できません。VOICEVOXが起動していることを確認してください。' },
        { status: 503 }
      )
    }

    // Check for processing errors (removed timeout check)
    // Allow unlimited processing time for long texts

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}