import { createMachine, assign } from 'xstate';
import { AppMachineContext, AppMachineEvent } from '../contracts/types';

/**
 * FCIS+SMACアーキテクチャに準拠した状態機械
 * Core層の純粋関数と連携して動作
 */
export const appMachine = createMachine({
  id: 'app',
  initial: 'idle',
  types: {} as {
    context: AppMachineContext;
    events: AppMachineEvent;
  },

  context: {
    ocrText: '',
    ttsText: '',
    speakerId: 3, // ずんだもん（あまあま）
    audioUrl: '',
    error: null
  },

  states: {
    // 待機状態
    idle: {
      entry: assign({
        error: null,
        audioUrl: ''
      }),
      on: {
        START_OCR: {
          target: 'ocr_uploading',
          actions: assign({
            error: null
          })
        },
        START_TTS: {
          target: 'tts_synthesizing',
          actions: assign((_, event: any) => ({
            ttsText: event?.text || '',
            speakerId: event?.speakerId || 3,
            error: null
          }))
        }
      }
    },

    // OCRアップロード中
    ocr_uploading: {
      on: {
        OCR_PROCESS: {
          target: 'ocr_processing'
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: (_, event: any) => ({
              message: event?.message || 'Unknown error',
              recoverable: event?.recoverable ?? false
            })
          })
        }
      }
    },

    // OCR処理中
    ocr_processing: {
      on: {
        OCR_SUCCESS: {
          target: 'ocr_complete',
          actions: assign({
            ocrText: (_, event: any) => event?.text || ''
          })
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: (_, event: any) => ({
              message: event?.message || 'Unknown error',
              recoverable: event?.recoverable ?? false
            })
          })
        }
      }
    },

    // OCR完了
    ocr_complete: {
      on: {
        START_TTS: {
          target: 'tts_synthesizing',
          actions: assign((context, event: any) => ({
            ttsText: event?.text || '',
            speakerId: event?.speakerId ?? 3,
            error: null
          }))
        },
        START_OCR: {
          target: 'ocr_uploading',
          actions: assign({
            ocrText: '',
            error: null
          })
        }
      }
    },

    // TTS音声合成中
    tts_synthesizing: {
      on: {
        TTS_SUCCESS: {
          target: 'tts_playing',
          actions: assign({
            audioUrl: (_, event: any) => event?.audioUrl || ''
          })
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: (_, event: any) => ({
              message: event?.message || 'Unknown error',
              recoverable: event?.recoverable ?? false
            })
          })
        }
      }
    },

    // TTS音声再生中
    tts_playing: {
      on: {
        PLAY_COMPLETE: {
          target: 'idle'
        },
        START_TTS: {
          target: 'tts_synthesizing',
          actions: assign((_, event: any) => ({
            ttsText: event?.text || '',
            speakerId: event?.speakerId || 3,
            audioUrl: '',
            error: null
          }))
        }
      }
    },

    // エラー状態
    error: {
      on: {
        RESET: {
          target: 'idle',
          actions: assign({
            error: null
          })
        }
      }
    }
  }
});

/**
 * 状態機械の型定義エクスポート
 */
export type AppMachine = typeof appMachine;

/**
 * 状態の型定義
 */
export type AppStateValue =
  | 'idle'
  | 'ocr_uploading'
  | 'ocr_processing'
  | 'ocr_complete'
  | 'tts_synthesizing'
  | 'tts_playing'
  | 'error';

/**
 * 状態遷移の可視化用メタデータ
 */
export const stateMachineMetadata = {
  states: {
    idle: {
      description: '待機状態',
      color: '#808080'
    },
    ocr_uploading: {
      description: 'ファイルアップロード中',
      color: '#3B82F6'
    },
    ocr_processing: {
      description: 'テキスト抽出処理中',
      color: '#3B82F6'
    },
    ocr_complete: {
      description: 'OCR処理完了',
      color: '#10B981'
    },
    tts_synthesizing: {
      description: '音声生成中',
      color: '#8B5CF6'
    },
    tts_playing: {
      description: '音声再生中',
      color: '#10B981'
    },
    error: {
      description: 'エラー状態',
      color: '#EF4444'
    }
  },
  transitions: [
    { from: 'idle', to: 'ocr_uploading', event: 'START_OCR' },
    { from: 'idle', to: 'tts_synthesizing', event: 'START_TTS' },
    { from: 'ocr_uploading', to: 'ocr_processing', event: 'OCR_PROCESS' },
    { from: 'ocr_uploading', to: 'error', event: 'ERROR' },
    { from: 'ocr_processing', to: 'ocr_complete', event: 'OCR_SUCCESS' },
    { from: 'ocr_processing', to: 'error', event: 'ERROR' },
    { from: 'ocr_complete', to: 'tts_synthesizing', event: 'START_TTS' },
    { from: 'ocr_complete', to: 'ocr_uploading', event: 'START_OCR' },
    { from: 'tts_synthesizing', to: 'tts_playing', event: 'TTS_SUCCESS' },
    { from: 'tts_synthesizing', to: 'error', event: 'ERROR' },
    { from: 'tts_playing', to: 'idle', event: 'PLAY_COMPLETE' },
    { from: 'tts_playing', to: 'tts_synthesizing', event: 'START_TTS' },
    { from: 'error', to: 'idle', event: 'RESET' }
  ]
};