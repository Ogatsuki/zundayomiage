// 最小限の契約定義のみ - 説明文一切なし

export namespace VoiceSystem {

  // === データ型 ===

  export interface IN_RawText {
    content: string
    source: 'manual' | 'ocr'
  }

  export interface IN_ValidatedText {
    content: string & { __validated: true, __max: 10000 }
    source: 'manual' | 'ocr'
  }

  export interface OUT_AudioData {
    blob: Blob
    format: 'mp3' | 'wav'
    duration: number
    speaker: 'zundamon' | 'metan'
  }

  export interface STATE_ProcessingStatus {
    processing: boolean
    progress: number // 0-100
    error: string | null
  }

  // === ブロック契約 ===

  export interface BLOCK_TextAcquisition {
    acquireFromManual(text: string): IN_RawText
    acquireFromOCR(imageFile: File): Promise<IN_RawText>
    validate(raw: IN_RawText): IN_ValidatedText | null
    reset(): void
  }

  export interface BLOCK_VoiceSynthesis {
    synthesize(
      text: IN_ValidatedText,
      speaker: 'zundamon' | 'metan'
    ): Promise<OUT_AudioData>
    cancel(): void
    getStatus(): STATE_ProcessingStatus
  }
}

// 型制約のヘルパー
export type MaxLength<T extends string, Max extends number> = T & { __max: Max }
export type Validated<T> = T & { __validated: true }