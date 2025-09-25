/**
 * ========== Voice Parameters Contract ==========
 * PVBP Protocol v1.0.0 Compliant
 * Runtime: universal
 */

export interface VoiceParametersContract {
  // Speed (0.5 to 2.0)
  speed: number;

  // Pitch (-0.15 to 0.15)
  pitch: number;

  // Intonation (0.0 to 2.0)
  intonation: number;

  // Volume (0.0 to 1.0)
  volume: number;

  // Actions
  setSpeed(value: number): void;
  setPitch(value: number): void;
  setIntonation(value: number): void;
  setVolume(value: number): void;
  resetToDefaults(): void;

  // Get formatted for VOICEVOX API
  getApiParameters(): VoicevoxParameters;

  // Events
  onParameterChange?: (params: VoiceParametersContract) => void;
}

// VOICEVOX API parameter format
export interface VoicevoxParameters {
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
}

// Default values
export const DEFAULT_VOICE_PARAMETERS: VoicevoxParameters = {
  speedScale: 1.0,
  pitchScale: 0.0,
  intonationScale: 1.0,
  volumeScale: 1.0
};