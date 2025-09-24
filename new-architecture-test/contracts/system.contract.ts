import type {
  ValidText,
  SpeakerId,
  AudioBlob,
  ErrorCode,
  SystemState,
  TextInputContract,
  VoiceSynthesisContract,
  AudioPlayerContract,
  TextLimit
} from './types.contract';

export const validateText = (input: string): ValidText | never => {
  if (input.length > (100_000 as TextLimit)) {
    throw new Error('TEXT_TOO_LONG' as ErrorCode);
  }
  return input as ValidText;
};

export const createTextInputBlock = (): TextInputContract => ({
  getText: async () => validateText(''),
  getState: () => 'IDLE',
  onTextReady: () => {},
  onError: () => {}
});

export const createVoiceSynthesisBlock = (): VoiceSynthesisContract => ({
  synthesize: async () => new Blob() as AudioBlob,
  getState: () => 'IDLE',
  onSynthesisComplete: () => {},
  onError: () => {}
});

export const createAudioPlayerBlock = (): AudioPlayerContract => ({
  play: async () => {},
  pause: () => {},
  stop: () => {},
  download: () => {},
  getState: () => 'IDLE',
  onPlaybackComplete: () => {},
  onError: () => {}
});

export const SPEAKERS: Record<'ZUNDAMON' | 'SHIKOKU_METAN', SpeakerId> = {
  ZUNDAMON: 3,
  SHIKOKU_METAN: 2
};

export type BlockFactory<T> = () => T;
export type StateTransition<S> = (current: S) => S;
export type Pipeline = TextInputContract & VoiceSynthesisContract & AudioPlayerContract;