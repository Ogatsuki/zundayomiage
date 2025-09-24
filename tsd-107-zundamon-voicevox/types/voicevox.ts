// VOICEVOX API Types
export interface AudioQuery {
  accent_phrases: AccentPhrase[]
  speedScale: number
  pitchScale: number
  intonationScale: number
  volumeScale: number
  prePhonemeLength: number
  postPhonemeLength: number
  outputSamplingRate: number
  outputStereo: boolean
  kana: string
}

export interface AccentPhrase {
  moras: Mora[]
  accent: number
  pause_mora?: Mora
  is_interrogative: boolean
}

export interface Mora {
  text: string
  consonant?: string
  consonant_length?: number
  vowel: string
  vowel_length: number
  pitch: number
}

export interface SpeakerInfo {
  name: string
  speaker_id: number
  styles: SpeakerStyle[]
}

export interface SpeakerStyle {
  name: string
  id: number
}

export interface VoicevoxError {
  error: string
  message: string
}

// Zundamon specific constants
export const ZUNDAMON_SPEAKER_ID = 3
export const ZUNDAMON_STYLE_ID = 0 // Normal style
// Shikoku Metan speaker constant
export const SHIKOKU_METAN_SPEAKER_ID = 2

// Available speakers configuration
export interface AvailableSpeaker {
  id: number
  name: string
  displayName: string
  placeholder: string
  buttonText: string
  generateText: string
}

export const AVAILABLE_SPEAKERS: AvailableSpeaker[] = [
  {
    id: ZUNDAMON_SPEAKER_ID,
    name: 'zundamon',
    displayName: 'ずんだもん',
    placeholder: 'ここにテキストを入力するのだ！（最大100,000文字）',
    buttonText: 'ずんだもんが読み上げるのだ！',
    generateText: '生成中なのだ...'
  },
  {
    id: SHIKOKU_METAN_SPEAKER_ID,
    name: 'shikoku-metan',
    displayName: '四国めたん',
    placeholder: 'ここにテキストを入力してね！（最大100,000文字）',
    buttonText: '四国めたんが読み上げるよ！',
    generateText: '生成中だよ...'
  }
]

// Default speaker
export const DEFAULT_SPEAKER_ID = ZUNDAMON_SPEAKER_ID
