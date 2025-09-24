'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AVAILABLE_SPEAKERS, DEFAULT_SPEAKER_ID } from '@/types/voicevox'
import AudioPlayer from './AudioPlayer'
import ImageUpload from './ImageUpload'
import OCRProcessor from './OCRProcessor'
import OCRResultEditor from './OCRResultEditor'

type InputMode = 'text' | 'ocr'

export default function VoiceGenerator() {
  const [text, setText] = useState('')
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(DEFAULT_SPEAKER_ID)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Ref to track current audio URL for cleanup
  const audioUrlRef = useRef<string | null>(null)

  // OCR関連の状態
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)

  // Get the current selected speaker
  const currentSpeaker = AVAILABLE_SPEAKERS.find(speaker => speaker.id === selectedSpeakerId) || AVAILABLE_SPEAKERS[0]

  // Function to release previous audio blob and URL
  const releasePreviousAudio = useCallback((blob: Blob | null) => {
    if (!blob) return

    // Revoke the current object URL if it exists
    const currentUrl = audioUrlRef.current
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl)
      audioUrlRef.current = null

      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Released audio blob URL:', currentUrl)
      }
    }
  }, [])

  // Reset audio and error state when speaker changes
  useEffect(() => {
    releasePreviousAudio(audioBlob)
    setAudioBlob(null)
    setError(null)
  }, [selectedSpeakerId, releasePreviousAudio, audioBlob])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      releasePreviousAudio(audioBlob)
    }
  }, [])

  // Cleanup when switching input modes
  useEffect(() => {
    releasePreviousAudio(audioBlob)
    setAudioBlob(null)
  }, [inputMode, releasePreviousAudio])

  const generateVoice = async () => {
    const targetText = inputMode === 'text' ? text : ocrText

    if (!targetText.trim()) {
      setError('テキストを入力してください！')
      return
    }

    // Release previous audio before generating new one
    releasePreviousAudio(audioBlob)

    console.log('Sending to VOICEVOX API:', {
      textLength: targetText.length,
      sample: targetText.substring(0, 100),
      speaker: selectedSpeakerId
    })

    setIsLoading(true)
    setError(null)

    // AbortController for request cancellation (no timeout)
    const controller = new AbortController()

    try {
      // Choose API endpoint based on text length
      const apiEndpoint = targetText.length > 10000 ? '/api/voicevox/generate-long' : '/api/voicevox/generate'

      // Call appropriate API route to generate voice
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: targetText.trim(),
          speaker: selectedSpeakerId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '音声生成に失敗しました...')
      }

      const audioData = await response.blob()

      // Create and store new URL reference
      const newUrl = URL.createObjectURL(audioData)
      audioUrlRef.current = newUrl

      setAudioBlob(audioData)

      // Log memory usage in development
      if (process.env.NODE_ENV === 'development' && (performance as any).memory) {
        console.log('Memory after audio generation:', {
          usedJSHeapSize: ((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
          totalJSHeapSize: ((performance as any).memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
        })
      }
    } catch (err) {
      console.error('Voice generation error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('リクエストがキャンセルされました。')
      } else {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました...')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    releasePreviousAudio(audioBlob)
    setText('')
    setOcrText('')
    setImageFile(null)
    setAudioBlob(null)
    setError(null)
  }

  // Callback for when AudioPlayer requests blob release
  const handleAudioRelease = useCallback(() => {
    releasePreviousAudio(audioBlob)
    setAudioBlob(null)
  }, [audioBlob, releasePreviousAudio])

  const handleImageUpload = (file: File) => {
    setImageFile(file)
    setIsOcrProcessing(true)
    setOcrText('')
    setError(null)
  }

  const handleOCRComplete = (extractedText: string) => {
    setOcrText(extractedText)
    setIsOcrProcessing(false)
  }

  const handleOCRTextUpdate = (updatedText: string) => {
    setOcrText(updatedText)
  }

  const handleOCRConfirm = () => {
    // OCRテキストが確定されたら音声生成を開始
    if (ocrText.trim()) {
      generateVoice()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Character Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-zundamon-dark">
          VOICEVOX音声生成システム
        </h1>
        <p className="text-gray-600">
          好きなキャラクターの声で読み上げます！
        </p>
      </div>

      {/* Speaker Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-lg font-semibold text-gray-700 mb-4">
          話者を選択
        </label>
        <div className="flex gap-4">
          {AVAILABLE_SPEAKERS.map((speaker) => (
            <label
              key={speaker.id}
              className="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                name="speaker"
                value={speaker.id}
                checked={selectedSpeakerId === speaker.id}
                onChange={(e) => setSelectedSpeakerId(Number(e.target.value))}
                className="mr-2 w-4 h-4 text-zundamon-green focus:ring-zundamon-dark"
                disabled={isLoading}
              />
              <span className={`text-lg ${selectedSpeakerId === speaker.id ? 'font-bold' : ''}`}>
                {speaker.displayName}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Input Mode Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-zundamon-green text-white border-b-2 border-zundamon-dark'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            テキスト入力
          </button>
          <button
            onClick={() => setInputMode('ocr')}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
              inputMode === 'ocr'
                ? 'bg-zundamon-green text-white border-b-2 border-zundamon-dark'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            画像から読み取る
          </button>
        </div>

        <div className="p-6 space-y-4">
          {inputMode === 'text' ? (
            <>
              {/* Text Input Area */}
              <label htmlFor="text-input" className="block text-lg font-semibold text-gray-700">
                読み上げたいテキストを入力
              </label>
              <p className="text-sm text-gray-600 mb-2">
                ※ 100,000文字以内で入力してください
              </p>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={100000}
                rows={8}
                placeholder={currentSpeaker.placeholder}
                className="w-full px-4 py-3 border-2 border-zundamon-green rounded-lg focus:outline-none focus:border-zundamon-dark resize-none"
                disabled={isLoading}
              />
              <div className="text-sm text-gray-500 text-right">
                {text.length} / 100,000 文字
              </div>
            </>
          ) : (
            <>
              {/* OCR Input Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-lg font-semibold text-gray-700">
                    画像からテキストを抽出
                  </label>
                  <div className="text-sm text-gray-600">
                    言語: 日本語
                  </div>
                </div>

                <ImageUpload
                  onImageUpload={handleImageUpload}
                  isProcessing={isOcrProcessing}
                />

                <OCRProcessor
                  imageFile={imageFile}
                  onOCRComplete={handleOCRComplete}
                  language="jpn"
                />

                {ocrText && (
                  <OCRResultEditor
                    ocrText={ocrText}
                    onTextUpdate={handleOCRTextUpdate}
                    onConfirm={handleOCRConfirm}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Terms Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">利用規約について</p>
                <p>
                  このサービスを利用することで、
                  <a
                    href="https://voicevox.hiroshiba.jp/term/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    VOICEVOX利用規約
                  </a>
                  および
                  <a
                    href="https://zunko.jp/con_ongen_kiyaku.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    ずんだもん・四国めたん音源利用規約
                  </a>
                  に同意したものとみなします。
                </p>
              </div>
            </div>
          </div>

          {/* Generate Button (only for text mode) */}
          {inputMode === 'text' && !audioBlob && (
            <div>
              <button
                onClick={generateVoice}
                disabled={isLoading || !text.trim()}
                className="w-full py-4 bg-zundamon-green hover:bg-zundamon-dark disabled:bg-gray-300 text-white font-bold text-lg rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? currentSpeaker.generateText : currentSpeaker.buttonText}
              </button>
            </div>
          )}

          {/* Loading Spinner - show for both text and OCR modes */}
          {isLoading && (
            <div className="flex items-center justify-center mt-4 space-x-2">
              <div className="w-6 h-6 border-2 border-zundamon-green border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">
                音声生成中...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {audioBlob && (
        <AudioPlayer
          audioBlob={audioBlob}
          onReset={handleReset}
          autoRelease={true}
          onReleaseRequest={handleAudioRelease}
        />
      )}
    </div>
  )
}