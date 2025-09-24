'use client'

// ============================================
// voice-synthesis ブロック
// 完全に自己完結 - 他のファイルを参照しない
// ============================================

import { useState, useRef, useCallback } from 'react'
import type { VoiceSystem } from '../../contracts/voice-system.contract'

// === ローカル定数（このブロック専用）===
const VOICEVOX_BASE_URL = 'http://localhost:50021'
const DEFAULT_SPEAKER_ID = 3 // ずんだもん
const REQUEST_TIMEOUT = 60000 // 60秒
const LONG_TEXT_THRESHOLD = 1000
const LONG_REQUEST_TIMEOUT = 300000 // 5分
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1秒

// === ローカル型定義（このブロック専用）===
type SpeakerMap = {
  zundamon: 3
  metan: 2
}

const SPEAKER_IDS: SpeakerMap = {
  zundamon: 3,
  metan: 2
}

interface VoicevoxQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string
      consonant?: string
      consonant_length?: number
      vowel: string
      vowel_length: number
      pitch: number
    }>
    accent: number
    pause_mora?: any
  }>
  speedScale: number
  pitchScale: number
  intonationScale: number
  volumeScale: number
  prePhonemeLength: number
  postPhonemeLength: number
}

// === WAVからMP3への変換（インライン実装）===
const convertWavToMp3 = async (wavArrayBuffer: ArrayBuffer): Promise<Blob> => {
  // 簡易的な実装（実際のプロジェクトではffmpegを使用）
  // ここでは仮実装としてそのままBlobを返す
  return new Blob([wavArrayBuffer], { type: 'audio/wav' })
}

// === VOICEVOX API通信（インライン実装）===
const callVoicevoxAPI = async (
  text: string,
  speakerId: number,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> => {
  const timeout = text.length > LONG_TEXT_THRESHOLD ? LONG_REQUEST_TIMEOUT : REQUEST_TIMEOUT

  // Step 1: audio_query
  if (onProgress) onProgress(10)

  const queryResponse = await fetch(`${VOICEVOX_BASE_URL}/audio_query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      text: text,
      speaker: speakerId.toString()
    }),
    signal: AbortSignal.timeout(timeout)
  })

  if (!queryResponse.ok) {
    throw new Error(`Audio query failed: ${queryResponse.status}`)
  }

  const query: VoicevoxQuery = await queryResponse.json()

  if (onProgress) onProgress(50)

  // Step 2: synthesis
  const synthesisResponse = await fetch(`${VOICEVOX_BASE_URL}/synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'audio/wav'
    },
    body: JSON.stringify(query) + `&speaker=${speakerId}`,
    signal: AbortSignal.timeout(timeout)
  })

  if (!synthesisResponse.ok) {
    throw new Error(`Synthesis failed: ${synthesisResponse.status}`)
  }

  if (onProgress) onProgress(90)

  const audioData = await synthesisResponse.arrayBuffer()

  if (onProgress) onProgress(100)

  return audioData
}

// === リトライ処理（インライン実装）===
const retryableRequest = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)))
      }
    }
  }

  throw lastError
}

// === メインブロック実装 ===
export class VoiceSynthesisBlock implements VoiceSystem.BLOCK_VoiceSynthesis {
  private abortController: AbortController | null = null
  private status: VoiceSystem.STATE_ProcessingStatus = {
    processing: false,
    progress: 0,
    error: null
  }

  async synthesize(
    text: VoiceSystem.IN_ValidatedText,
    speaker: 'zundamon' | 'metan'
  ): Promise<VoiceSystem.OUT_AudioData> {
    this.status = { processing: true, progress: 0, error: null }

    try {
      const speakerId = SPEAKER_IDS[speaker]

      // APIコール（リトライ付き）
      const wavData = await retryableRequest(() =>
        callVoicevoxAPI(
          text.content,
          speakerId,
          (progress) => {
            this.status.progress = progress * 0.8 // 80%までをAPI処理
          }
        )
      )

      this.status.progress = 80

      // MP3変換
      const mp3Blob = await convertWavToMp3(wavData)

      this.status.progress = 100

      // 音声長を推定（簡易計算）
      const duration = Math.ceil(text.content.length / 10) // 10文字/秒と仮定

      const result: VoiceSystem.OUT_AudioData = {
        blob: mp3Blob,
        format: 'wav', // 実際にはMP3に変換されるべきだが、仮実装
        duration: duration,
        speaker: speaker
      }

      this.status = { processing: false, progress: 100, error: null }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '音声合成に失敗しました'
      this.status = { processing: false, progress: 0, error: errorMessage }
      throw new Error(errorMessage)
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.status = { processing: false, progress: 0, error: 'キャンセルされました' }
  }

  getStatus(): VoiceSystem.STATE_ProcessingStatus {
    return { ...this.status }
  }
}

// === UIコンポーネント（このブロック専用）===
interface VoiceSynthesisUIProps {
  validatedText: VoiceSystem.IN_ValidatedText | null
  onAudioReady: (audio: VoiceSystem.OUT_AudioData) => void
}

export const VoiceSynthesisUI: React.FC<VoiceSynthesisUIProps> = ({
  validatedText,
  onAudioReady
}) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<'zundamon' | 'metan'>('zundamon')
  const [status, setStatus] = useState<VoiceSystem.STATE_ProcessingStatus>({
    processing: false,
    progress: 0,
    error: null
  })
  const [lastAudio, setLastAudio] = useState<VoiceSystem.OUT_AudioData | null>(null)

  const blockRef = useRef(new VoiceSynthesisBlock())

  const handleSynthesize = async () => {
    if (!validatedText) {
      setStatus({
        processing: false,
        progress: 0,
        error: 'テキストが提供されていません'
      })
      return
    }

    setStatus({ processing: true, progress: 0, error: null })

    // プログレス更新のインターバル
    const progressInterval = setInterval(() => {
      const currentStatus = blockRef.current.getStatus()
      setStatus(currentStatus)
    }, 100)

    try {
      const audio = await blockRef.current.synthesize(validatedText, selectedSpeaker)
      setLastAudio(audio)
      onAudioReady(audio)
      setStatus({ processing: false, progress: 100, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '音声生成に失敗しました'
      setStatus({ processing: false, progress: 0, error: errorMessage })
    } finally {
      clearInterval(progressInterval)
    }
  }

  const handleCancel = () => {
    blockRef.current.cancel()
    setStatus({ processing: false, progress: 0, error: 'キャンセルされました' })
  }

  const getSpeakerInfo = (speaker: 'zundamon' | 'metan') => {
    const info = {
      zundamon: {
        name: 'ずんだもん',
        color: 'green',
        emoji: '🌱',
        description: '東北ずん子の妹'
      },
      metan: {
        name: '四国めたん',
        color: 'pink',
        emoji: '🌸',
        description: '四国地方の応援キャラクター'
      }
    }
    return info[speaker]
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-6 bg-white rounded-lg shadow">

      {/* 話者選択 */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">話者を選択</h3>
        <div className="grid grid-cols-2 gap-4">
          {(['zundamon', 'metan'] as const).map(speaker => {
            const info = getSpeakerInfo(speaker)
            return (
              <label
                key={speaker}
                className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                  selectedSpeaker === speaker
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="speaker"
                  value={speaker}
                  checked={selectedSpeaker === speaker}
                  onChange={() => setSelectedSpeaker(speaker)}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-2xl mb-1">{info.emoji}</div>
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{info.description}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* テキスト情報 */}
      {validatedText && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">入力テキスト</span>
            <span className="text-gray-600">
              ソース: {validatedText.source === 'manual' ? '手動入力' : 'OCR'}
            </span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">
            {validatedText.content}
          </p>
          <div className="text-xs text-gray-500 mt-1">
            文字数: {validatedText.content.length}文字
          </div>
        </div>
      )}

      {/* 生成ボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleSynthesize}
          disabled={!validatedText || status.processing}
          className={`flex-1 py-3 px-4 font-medium rounded-lg transition-all ${
            !validatedText || status.processing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {status.processing ? '音声生成中...' : '音声を生成'}
        </button>
        {status.processing && (
          <button
            onClick={handleCancel}
            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            キャンセル
          </button>
        )}
      </div>

      {/* プログレスバー */}
      {status.processing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>処理中...</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {status.error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          エラー: {status.error}
        </div>
      )}

      {/* 最後に生成した音声の情報 */}
      {lastAudio && !status.processing && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm font-medium text-green-800 mb-1">
            ✓ 音声生成完了
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>話者: {getSpeakerInfo(lastAudio.speaker).name}</div>
            <div>長さ: 約{lastAudio.duration}秒</div>
            <div>フォーマット: {lastAudio.format.toUpperCase()}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// === エクスポート ===
export default VoiceSynthesisBlock