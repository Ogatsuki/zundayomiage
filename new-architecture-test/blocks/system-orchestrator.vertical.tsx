'use client';

import { useReducer, useCallback, createContext, useContext, ReactNode } from 'react';

// ========== SYSTEM ORCHESTRATOR VERTICAL BLOCK ==========
// 統合ロジックを1つの垂直ブロックとして分離

// ===== Types =====
type ValidText = string & { __brand: 'ValidText' };
type SpeakerId = 2 | 3;
type AudioBlob = Blob & { __brand: 'AudioBlob' };
type ErrorCode = 'TEXT_TOO_LONG' | 'NETWORK_ERROR' | 'API_ERROR' | 'INVALID_AUDIO' | 'OCR_FAILED' | 'SYNTHESIS_FAILED' | 'PLAYBACK_FAILED' | 'AUDIO_CONTEXT_FAILED';

type SystemFlow = 'IDLE' | 'INPUT_READY' | 'SYNTHESIZING' | 'AUDIO_READY' | 'ERROR';

interface SystemState {
  flow: SystemFlow;
  data: {
    text: ValidText | null;
    audio: AudioBlob | null;
    speaker: SpeakerId;
  };
  meta: {
    progress: number;
    error: ErrorCode | null;
  };
}

// ===== Action Types =====
type SystemAction =
  | { type: 'TEXT_READY'; text: ValidText }
  | { type: 'TEXT_ERROR'; error: ErrorCode }
  | { type: 'START_SYNTHESIS' }
  | { type: 'SYNTHESIS_PROGRESS'; progress: number }
  | { type: 'SYNTHESIS_COMPLETE'; audio: AudioBlob }
  | { type: 'SYNTHESIS_ERROR'; error: ErrorCode }
  | { type: 'CHANGE_SPEAKER'; speaker: SpeakerId }
  | { type: 'RESET' }
  | { type: 'RETRY' };

// ===== Initial State =====
const initialState: SystemState = {
  flow: 'IDLE',
  data: {
    text: null,
    audio: null,
    speaker: 3,
  },
  meta: {
    progress: 0,
    error: null,
  },
};

// ===== Reducer =====
function systemReducer(state: SystemState, action: SystemAction): SystemState {
  switch (action.type) {
    case 'TEXT_READY':
      return {
        ...state,
        flow: 'INPUT_READY',
        data: { ...state.data, text: action.text, audio: null },
        meta: { progress: 0, error: null },
      };

    case 'TEXT_ERROR':
      return {
        ...state,
        flow: 'ERROR',
        data: { ...state.data, text: null, audio: null },
        meta: { ...state.meta, error: action.error },
      };

    case 'START_SYNTHESIS':
      if (!state.data.text) return state;
      return {
        ...state,
        flow: 'SYNTHESIZING',
        meta: { progress: 0, error: null },
      };

    case 'SYNTHESIS_PROGRESS':
      return {
        ...state,
        meta: { ...state.meta, progress: action.progress },
      };

    case 'SYNTHESIS_COMPLETE':
      return {
        ...state,
        flow: 'AUDIO_READY',
        data: { ...state.data, audio: action.audio },
        meta: { progress: 100, error: null },
      };

    case 'SYNTHESIS_ERROR':
      return {
        ...state,
        flow: 'ERROR',
        data: { ...state.data, audio: null },
        meta: { progress: 0, error: action.error },
      };

    case 'CHANGE_SPEAKER':
      return {
        ...state,
        data: { ...state.data, speaker: action.speaker, audio: null },
        flow: state.data.text ? 'INPUT_READY' : 'IDLE',
      };

    case 'RESET':
      return {
        ...initialState,
        data: { ...initialState.data, speaker: state.data.speaker },
      };

    case 'RETRY':
      if (!state.meta.error) return state;
      return {
        ...state,
        flow: state.data.text ? 'INPUT_READY' : 'IDLE',
        meta: { ...state.meta, error: null },
      };

    default:
      return state;
  }
}

// ===== Context =====
interface SystemContextValue {
  state: SystemState;
  dispatch: React.Dispatch<SystemAction>;
  actions: {
    handleTextReady: (text: ValidText) => void;
    handleTextError: (error: ErrorCode) => void;
    startSynthesis: () => Promise<void>;
    handleSynthesisProgress: (progress: number) => void;
    handleSynthesisComplete: (audio: AudioBlob) => void;
    handleSynthesisError: (error: ErrorCode) => void;
    changeSpeaker: (speaker: SpeakerId) => void;
    reset: () => void;
    retry: () => void;
  };
}

const SystemContext = createContext<SystemContextValue | null>(null);

// ===== Hook =====
export function useSystemOrchestrator() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystemOrchestrator must be used within SystemOrchestratorProvider');
  }
  return context;
}

// ===== Provider Component =====
interface SystemOrchestratorProviderProps {
  children: ReactNode;
}

export function SystemOrchestratorProvider({ children }: SystemOrchestratorProviderProps) {
  const [state, dispatch] = useReducer(systemReducer, initialState);

  const handleTextReady = useCallback((text: ValidText) => {
    dispatch({ type: 'TEXT_READY', text });
  }, []);

  const handleTextError = useCallback((error: ErrorCode) => {
    dispatch({ type: 'TEXT_ERROR', error });
  }, []);

  const startSynthesis = useCallback(async () => {
    if (!state.data.text) return;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const testResponse = await fetch(`${baseUrl}/api/voicevox/audio-query?text=test&speaker=3`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });

      if (!testResponse.ok) {
        dispatch({ type: 'SYNTHESIS_ERROR', error: 'NETWORK_ERROR' });
        return;
      }

      dispatch({ type: 'START_SYNTHESIS' });
    } catch (error) {
      dispatch({ type: 'SYNTHESIS_ERROR', error: 'NETWORK_ERROR' });
    }
  }, [state.data.text]);

  const handleSynthesisProgress = useCallback((progress: number) => {
    dispatch({ type: 'SYNTHESIS_PROGRESS', progress });
  }, []);

  const handleSynthesisComplete = useCallback((audio: AudioBlob) => {
    dispatch({ type: 'SYNTHESIS_COMPLETE', audio });
  }, []);

  const handleSynthesisError = useCallback((error: ErrorCode) => {
    dispatch({ type: 'SYNTHESIS_ERROR', error });
  }, []);

  const changeSpeaker = useCallback((speaker: SpeakerId) => {
    dispatch({ type: 'CHANGE_SPEAKER', speaker });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' });
  }, []);

  const value: SystemContextValue = {
    state,
    dispatch,
    actions: {
      handleTextReady,
      handleTextError,
      startSynthesis,
      handleSynthesisProgress,
      handleSynthesisComplete,
      handleSynthesisError,
      changeSpeaker,
      reset,
      retry,
    },
  };

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

// ===== Status Display Component =====
export function SystemStatusDisplay() {
  const { state } = useSystemOrchestrator();

  const getStatusColor = () => {
    switch (state.flow) {
      case 'IDLE': return 'text-gray-500';
      case 'INPUT_READY': return 'text-blue-600';
      case 'SYNTHESIZING': return 'text-orange-600';
      case 'AUDIO_READY': return 'text-green-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (state.flow) {
      case 'IDLE': return 'テキスト入力待ち';
      case 'INPUT_READY': return '音声合成準備完了';
      case 'SYNTHESIZING': return `音声合成中 (${state.meta.progress}%)`;
      case 'AUDIO_READY': return '再生準備完了';
      case 'ERROR': return `エラー発生`;
      default: return '';
    }
  };

  return (
    <div className={`text-lg font-semibold ${getStatusColor()}`}>
      {getStatusText()}
    </div>
  );
}