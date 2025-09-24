export type TextLimit = 100_000;
type Brand<T, B> = T & { __brand: B };

export type ValidText = Brand<string, 'ValidText'> & {
  readonly length: number & { __constraint: 'MaxLength100000' };
};

export type SpeakerId = 2 | 3;
export type AudioBlob = Brand<Blob, 'AudioBlob'>;
export type ErrorCode = 'TEXT_TOO_LONG' | 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_AUDIO';

export type TextInputState = 'IDLE' | 'PROCESSING' | 'READY' | 'ERROR';
export type VoiceSynthesisState = 'IDLE' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
export type AudioPlayerState = 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ERROR';

export interface TextInputContract {
  getText(): Promise<ValidText>;
  getState(): TextInputState;
  onTextReady: (text: ValidText) => void;
  onError: (error: ErrorCode) => void;
}

export interface VoiceSynthesisContract {
  synthesize(text: ValidText, speakerId: SpeakerId): Promise<AudioBlob>;
  getState(): VoiceSynthesisState;
  onSynthesisComplete: (audio: AudioBlob) => void;
  onError: (error: ErrorCode) => void;
}

export interface AudioPlayerContract {
  play(audio: AudioBlob): Promise<void>;
  pause(): void;
  stop(): void;
  download(audio: AudioBlob, filename: string): void;
  getState(): AudioPlayerState;
  onPlaybackComplete: () => void;
  onError: (error: ErrorCode) => void;
}

export type SystemState = {
  text: TextInputState;
  synthesis: VoiceSynthesisState;
  player: AudioPlayerState;
  currentSpeaker: SpeakerId;
};