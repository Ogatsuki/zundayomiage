/**
 * ========== Voice Synthesis Contract ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 *
 * Purpose: Contract for voice synthesis functionality
 * Runtime: client (browser APIs required)
 */

export interface VoiceSynthesisContract {
  /**
   * Synthesize text to speech
   */
  synthesize(text: string, options?: VoiceSynthesisOptions): Promise<VoiceSynthesisResult>;

  /**
   * Get available voices
   */
  getAvailableVoices(): Promise<VoiceInfo[]>;

  /**
   * Check if synthesis is supported
   */
  isSupported(): boolean;

  /**
   * Stop current synthesis
   */
  stop(): void;
}

export interface VoiceSynthesisOptions {
  speaker_id?: number;
  speed_scale?: number;
  pitch_scale?: number;
  intonation_scale?: number;
  volume_scale?: number;
  pre_phoneme_length?: number;
  post_phoneme_length?: number;
}

export interface VoiceSynthesisResult {
  audio_data: ArrayBuffer;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface VoiceInfo {
  id: number;
  name: string;
  style: string;
  supported_features: string[];
}