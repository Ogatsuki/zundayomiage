'use client'

// ============================================
// text-acquisition ブロック
// 完全に自己完結 - 他のファイルを参照しない
// ============================================

import { useState, useRef, useCallback } from 'react'
import type { VoiceSystem } from '../../contracts/voice-system.contract'

// === ローカル定数（このブロック専用）===
const MAX_TEXT_LENGTH = 10000
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// === ローカル型定義（このブロック専用）===
type OCRStatus = 'idle' | 'processing' | 'completed' | 'error'

interface OCRProgress {
  status: OCRStatus
  percent: number
  message: string
}

// === テキスト正規化ユーティリティ（インライン）===
const normalizeJapaneseText = (text: string): string => {
  return text
    .replace(/([ぁ-んァ-ヶー一-龠])\s+([ぁ-んァ-ヶー一-龠])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

// === OCR処理（インライン実装）===
const performOCR = async (
  imageFile: File,
  onProgress: (progress: OCRProgress) => void
): Promise<string> => {
  // Tesseract.jsを動的インポート（依存を最小化）
  const Tesseract = await import('tesseract.js')

  return new Promise((resolve, reject) => {
    onProgress({ status: 'processing', percent: 0, message: '初期化中...' })

    Tesseract.recognize(imageFile, 'jpn', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          const percent = Math.round((info.progress || 0) * 100)
          onProgress({
            status: 'processing',
            percent,
            message: `認識中... ${percent}%`
          })
        }
      }
    })
    .then(({ data: { text } }) => {
      const normalized = normalizeJapaneseText(text)
      onProgress({ status: 'completed', percent: 100, message: '完了' })
      resolve(normalized)
    })
    .catch((error) => {
      onProgress({ status: 'error', percent: 0, message: error.message })
      reject(error)
    })
  })
}

// === メインブロック実装 ===
export class TextAcquisitionBlock implements VoiceSystem.BLOCK_TextAcquisition {
  private manualText: string = ''
  private ocrText: string = ''
  private currentSource: 'manual' | 'ocr' = 'manual'

  acquireFromManual(text: string): VoiceSystem.IN_RawText {
    this.manualText = text
    this.currentSource = 'manual'
    return {
      content: text,
      source: 'manual'
    }
  }

  async acquireFromOCR(imageFile: File): Promise<VoiceSystem.IN_RawText> {
    const text = await performOCR(imageFile, () => {})
    this.ocrText = text
    this.currentSource = 'ocr'
    return {
      content: text,
      source: 'ocr'
    }
  }

  validate(raw: VoiceSystem.IN_RawText): VoiceSystem.IN_ValidatedText | null {
    if (!raw.content || raw.content.length === 0) {
      return null
    }
    if (raw.content.length > MAX_TEXT_LENGTH) {
      return null
    }

    return {
      content: raw.content as string & { __validated: true, __max: 10000 },
      source: raw.source
    }
  }

  reset(): void {
    this.manualText = ''
    this.ocrText = ''
    this.currentSource = 'manual'
  }
}

// === UIコンポーネント（このブロック専用）===
interface TextAcquisitionUIProps {
  onTextReady: (text: VoiceSystem.IN_ValidatedText) => void
}

export const TextAcquisitionUI: React.FC<TextAcquisitionUIProps> = ({ onTextReady }) => {
  const [inputMode, setInputMode] = useState<'manual' | 'ocr'>('manual')
  const [manualText, setManualText] = useState('')
  const [ocrResult, setOcrResult] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress>({
    status: 'idle',
    percent: 0,
    message: ''
  })
  const [error, setError] = useState<string | null>(null)

  const blockRef = useRef(new TextAcquisitionBlock())

  const handleManualInput = (text: string) => {
    setManualText(text)
    setError(null)
  }

  const handleManualSubmit = () => {
    const raw = blockRef.current.acquireFromManual(manualText)
    const validated = blockRef.current.validate(raw)

    if (validated) {
      onTextReady(validated)
    } else {
      setError(`テキストは1文字以上${MAX_TEXT_LENGTH}文字以内で入力してください`)
    }
  }

  const handleImageUpload = async (file: File) => {
    // ファイル検証
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setError('JPEG、PNG、WEBP形式の画像を選択してください')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('ファイルサイズは5MB以内にしてください')
      return
    }

    setError(null)

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // OCR実行
    try {
      setOcrProgress({ status: 'processing', percent: 0, message: '処理開始...' })
      const text = await performOCR(file, setOcrProgress)
      setOcrResult(text)

      // 自動的に検証と送信
      const raw = { content: text, source: 'ocr' as const }
      const validated = blockRef.current.validate(raw)

      if (validated) {
        onTextReady(validated)
      } else {
        setError('OCRで取得したテキストが検証に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR処理に失敗しました')
      setOcrProgress({ status: 'error', percent: 0, message: 'エラー' })
    }
  }

  const handleReset = () => {
    blockRef.current.reset()
    setManualText('')
    setOcrResult('')
    setImagePreview(null)
    setOcrProgress({ status: 'idle', percent: 0, message: '' })
    setError(null)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-6 bg-white rounded-lg shadow">

      {/* モード選択タブ */}
      <div className="flex border-b">
        <button
          onClick={() => setInputMode('manual')}
          className={`flex-1 py-2 px-4 font-medium ${
            inputMode === 'manual'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          テキスト入力
        </button>
        <button
          onClick={() => setInputMode('ocr')}
          className={`flex-1 py-2 px-4 font-medium ${
            inputMode === 'ocr'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          画像からテキスト抽出
        </button>
      </div>

      {/* 入力エリア */}
      <div className="space-y-4">
        {inputMode === 'manual' ? (
          <>
            <textarea
              value={manualText}
              onChange={(e) => handleManualInput(e.target.value)}
              placeholder="ここにテキストを入力してください"
              className="w-full h-48 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={MAX_TEXT_LENGTH}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{manualText.length} / {MAX_TEXT_LENGTH} 文字</span>
              <button
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
              >
                テキストを確定
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                accept={SUPPORTED_IMAGE_TYPES.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="プレビュー"
                      className="mx-auto max-h-64 rounded"
                    />
                  ) : (
                    <div>
                      <p className="text-gray-600">画像をドロップまたはクリック</p>
                      <p className="text-sm text-gray-400 mt-1">
                        JPEG, PNG, WEBP (最大5MB)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {ocrProgress.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{ocrProgress.message}</span>
                  <span>{ocrProgress.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${ocrProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {ocrResult && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">抽出されたテキスト:</p>
                <p className="text-sm whitespace-pre-wrap">{ocrResult}</p>
              </div>
            )}
          </>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* リセットボタン */}
        <button
          onClick={handleReset}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          リセット
        </button>
      </div>
    </div>
  )
}

// === エクスポート ===
export default TextAcquisitionBlock