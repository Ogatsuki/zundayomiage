import axios, { AxiosInstance, AxiosError } from 'axios'
import http from 'http'
import { AudioQuery, DEFAULT_SPEAKER_ID, VoicevoxError } from '@/types/voicevox'
import { getVoicevoxUrl, getFallbackUrls, logEnvironmentInfo } from './environment-detector'

class VoicevoxClient {
  private client: AxiosInstance
  private maxRetries = 3
  private retryDelay = 1000 // 1 second
  private fallbackUrls: string[] = []
  private currentUrlIndex = 0

  constructor() {
    // Log environment information for debugging
    logEnvironmentInfo()

    // Get primary URL and fallback URLs using environment detection
    const baseURL = getVoicevoxUrl()
    this.fallbackUrls = getFallbackUrls()

    console.log(`[VoicevoxClient] Initializing with primary URL: ${baseURL}`)
    console.log(`[VoicevoxClient] Available fallback URLs: ${this.fallbackUrls.join(', ')}`)

    // Create an HTTP agent that forces IPv4
    const httpAgent = new http.Agent({
      family: 4, // Force IPv4
      keepAlive: true,
    })

    this.client = axios.create({
      baseURL,
      // No timeout - allow unlimited processing time
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: baseURL.startsWith('http://') ? httpAgent : undefined,
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          const errorMessage = `VOICEVOXエンジンに接続できません。以下をご確認ください：
1. Dockerが起動していることを確認してください
2. docker-compose up -d でサービスを起動してください
3. VOICEVOXコンテナが正常に動作しているか確認してください
接続先: ` + baseURL + `
利用可能なフォールバックURL: ` + this.fallbackUrls.join(', ')
          console.error(errorMessage)
          return Promise.reject(new Error(errorMessage))
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Switch to next available fallback URL
   */
  private switchToFallbackUrl(): boolean {
    if (this.currentUrlIndex < this.fallbackUrls.length - 1) {
      this.currentUrlIndex++
      const newBaseURL = this.fallbackUrls[this.currentUrlIndex]

      console.log(`[VoicevoxClient] Switching to fallback URL: ${newBaseURL} (${this.currentUrlIndex + 1}/${this.fallbackUrls.length})`)

      // Create new HTTP agent for the new URL
      const httpAgent = new http.Agent({
        family: 4, // Force IPv4
        keepAlive: true,
      })

      // Update the client with new base URL
      this.client = axios.create({
        baseURL: newBaseURL,
        // No timeout - allow unlimited processing time
        headers: {
          'Content-Type': 'application/json',
        },
        httpAgent: newBaseURL.startsWith('http://') ? httpAgent : undefined,
      })

      return true
    }
    return false
  }

  /**
   * Retry mechanism for failed requests with URL fallback
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries,
    allowUrlFallback: boolean = true
  ): Promise<T> {
    try {
      return await requestFn()
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`[VoicevoxClient] Retrying request... (` + (this.maxRetries - retries + 1) + `/` + this.maxRetries + `)`)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        return this.retryRequest(requestFn, retries - 1, allowUrlFallback)
      }

      // If all retries failed and we can fallback to another URL
      if (allowUrlFallback && this.isConnectionError(error) && this.switchToFallbackUrl()) {
        console.log(`[VoicevoxClient] Attempting request with fallback URL...`)
        // Reset retries for the new URL
        return this.retryRequest(requestFn, this.maxRetries, true)
      }

      throw error
    }
  }

  /**
   * Check if error is a connection error that might benefit from URL fallback
   */
  private isConnectionError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      return !!(
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        !error.response
      )
    }
    return false
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on connection errors or 5xx errors
      return !error.response || error.response.status >= 500
    }
    return false
  }

  /**
   * Generate audio query for text synthesis with retry
   */
  async getAudioQuery(text: string, speaker: number = DEFAULT_SPEAKER_ID): Promise<AudioQuery> {
    try {
      return await this.retryRequest(async () => {
        // VOICEVOX API requires both text and speaker as query parameters
        // This is a limitation of the API specification
        // For very long texts (>8KB URLs), this will fail
        const response = await this.client.post<AudioQuery>(
          '/audio_query',
          null,
          {
            params: {
              text,
              speaker,
            },
          }
        )
        return response.data
      })
    } catch (error) {
      // Add more context for URL size errors
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const errorData = error.response.data
        if (typeof errorData === 'string' && errorData.includes('Invalid HTTP request')) {
          console.error(`URL size limit exceeded. Text length: ${text.length} characters`)
          console.error('VOICEVOX API limitation: Text must be sent as URL parameter, which limits text to approximately 8000 characters')
        }
      }
      console.error('Failed to get audio query:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Synthesize speech from audio query with retry
   */
  async synthesis(
    audioQuery: AudioQuery,
    speaker: number = DEFAULT_SPEAKER_ID
  ): Promise<ArrayBuffer> {
    try {
      return await this.retryRequest(async () => {
        const response = await this.client.post<ArrayBuffer>(
          '/synthesis',
          audioQuery,
          {
            params: {
              speaker,
            },
            responseType: 'arraybuffer',
          }
        )
        return response.data
      })
    } catch (error) {
      console.error('Failed to synthesize speech:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Generate speech directly from text (combines audio_query and synthesis)
   */
  async generateSpeech(text: string, speaker: number = DEFAULT_SPEAKER_ID): Promise<ArrayBuffer> {
    const audioQuery = await this.getAudioQuery(text, speaker)
    return await this.synthesis(audioQuery, speaker)
  }

  /**
   * Check if VOICEVOX engine is available with retry
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.retryRequest(async () => {
        await this.client.get('/version')
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Wait for VOICEVOX engine to be ready
   */
  async waitForReady(maxAttempts: number = 10, delay: number = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Checking VOICEVOX engine status... (attempt ` + attempt + `/` + maxAttempts + `)`)
      const isHealthy = await this.checkHealth()

      if (isHealthy) {
        console.log('VOICEVOX engine is ready!')
        return
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`VOICEVOX engine failed to start after ` + maxAttempts + ` attempts`)
  }

  /**
   * Handle errors uniformly with better messages including environment info
   */
  private handleError(error: unknown): Error {
    const currentUrl = this.fallbackUrls[this.currentUrlIndex] || 'unknown'
    const attemptedUrls = this.fallbackUrls.slice(0, this.currentUrlIndex + 1)

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return new Error(`VOICEVOXエンジンに接続できません。
接続試行URL: ${attemptedUrls.join(', ')}
以下をご確認ください：
1. Dockerが起動していることを確認してください
2. docker-compose up -d でサービスを起動してください
3. VOICEVOXコンテナが正常に動作しているか確認してください`)
      }
      if (error.code === 'ETIMEDOUT') {
        return new Error(`VOICEVOXエンジンへの接続が中断されました。
接続試行URL: ${attemptedUrls.join(', ')}
ネットワーク設定を確認してください。`)
      }
      // Handle request size errors
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'string' && errorData.includes('Invalid HTTP request')) {
          return new Error(`URLサイズ制限エラー: テキストが長すぎます（約8,000文字以上）。
VOICEVOX APIの仕様上、テキストはURLパラメータとして送信する必要があるため、長文には対応できません。
テキストを分割して処理してください。
詳細: ${errorData}
接続先: ${currentUrl}`)
        }
      }
      if (error.response?.status === 413) {
        return new Error(`リクエストサイズが大きすぎます。テキストを短くしてください。
接続先: ${currentUrl}`)
      }
      if (error.response?.data) {
        const voicevoxError = error.response.data as VoicevoxError
        return new Error(`VOICEVOX APIエラー (接続先: ${currentUrl}): ${voicevoxError.message || voicevoxError.error || 'APIエラーが発生しました'}`)
      }
      if (error.message) {
        return new Error(`接続エラー (接続先: ${currentUrl}): ${error.message}`)
      }
    }
    return new Error(`予期しないエラーが発生しました (接続先: ${currentUrl})。しばらく時間をおいてから再試行してください。`)
  }
}

// Export singleton instance
export const voicevoxClient = new VoicevoxClient()

// Export class for testing or custom instances
export default VoicevoxClient
