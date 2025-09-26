'use client';

/**
 * ========== PVBP Voice Synthesis App ==========
 * PVBP Protocol v1.0.0 - Full Implementation
 *
 * ずんだもん音声読み上げアプリケーション
 * All vertical blocks integrated
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import contracts
import type { Character } from '@/contracts/character-contract';
import { VOICEVOX_CHARACTERS } from '@/contracts/character-contract';
import type { VoicevoxParameters } from '@/contracts/voice-parameters-contract';
import { DEFAULT_VOICE_PARAMETERS } from '@/contracts/voice-parameters-contract';

// Dynamic imports for client blocks with SSR disabled
const TextInput = dynamic(() => import('@/blocks/text-input.universal.vertical'), {
  ssr: true,
});

const CharacterSelector = dynamic(() => import('@/blocks/character-selector.universal.vertical'), {
  ssr: true,
});

const VoiceParameters = dynamic(() => import('@/blocks/voice-parameters.universal.vertical'), {
  ssr: true,
});

const AudioPlayer = dynamic(() => import('@/blocks/audio-player.client.vertical'), {
  ssr: false,
  loading: () => (
    <div className="p-8 bg-gray-100 rounded-lg animate-pulse">
      <div className="h-20 bg-gray-300 rounded"></div>
    </div>
  ),
});

const VoicevoxApiWrapper = dynamic(() => import('@/blocks/voicevox-api-wrapper.client.vertical'), {
  ssr: false,
  loading: () => (
    <div className="p-4 bg-yellow-50 rounded-lg">
      <div className="text-yellow-700">VOICEVOXサーバーに接続中...</div>
    </div>
  ),
});

export default function VoiceSynthesisPage() {
  // State management
  const [text, setText] = useState('');
  const [isTextValid, setIsTextValid] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(VOICEVOX_CHARACTERS[0]);
  const [voiceParams, setVoiceParams] = useState<VoicevoxParameters>(DEFAULT_VOICE_PARAMETERS);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Refs for block instances
  const textInputRef = useRef<any>(null);
  const voicevoxApiRef = useRef<any>(null);
  const audioPlayerRef = useRef<any>(null);

  // Check VOICEVOX connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      console.log('Starting VOICEVOX connection check...');

      // refが準備できるまで待つ
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        console.log(`Connection check attempt ${attempts + 1}/${maxAttempts}`);

        if (voicevoxApiRef.current?.checkConnection) {
          console.log('VoicevoxApi ref is available, checking connection...');
          try {
            const connected = await voicevoxApiRef.current.checkConnection();
            console.log('Connection check result:', connected);
            setIsConnected(connected);
            break;
          } catch (error) {
            console.error('Connection check failed:', error);
            setIsConnected(false);
            break;
          }
        }

        console.log('VoicevoxApi ref not ready yet, waiting...');
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (attempts === maxAttempts) {
        console.error('VoicevoxApi ref not available after 5 seconds');
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  // Handle text change
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    // Fix: Check trimmed text length properly
    const trimmedText = newText.trim();
    setIsTextValid(trimmedText.length > 0 && newText.length <= 100000);
    setError(null);
  }, []);

  // Handle character selection
  const handleCharacterChange = useCallback((character: Character) => {
    setSelectedCharacter(character);
  }, []);

  // Handle parameter change
  const handleParameterChange = useCallback((params: any) => {
    setVoiceParams(params.getApiParameters());
  }, []);

  // Synthesize voice
  const handleSynthesize = useCallback(async () => {
    if (!isTextValid || !text.trim() || isSynthesizing) return;

    // Check VOICEVOX connection before synthesis
    if (!isConnected) {
      setError('VOICEVOXサーバーに接続できません。localhost:50021でVOICEVOXが起動していることを確認してください。');
      return;
    }

    setIsSynthesizing(true);
    setError(null);

    try {
      if (!voicevoxApiRef.current) {
        throw new Error('VOICEVOX APIが初期化されていません');
      }

      const blob = await voicevoxApiRef.current.synthesize(
        text,
        selectedCharacter.id,
        voiceParams
      );

      setAudioBlob(blob);

      // Auto-play the synthesized audio
      if (audioPlayerRef.current && blob) {
        await audioPlayerRef.current.play(blob);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '音声合成に失敗しました';
      if (errorMessage.includes('connect') || errorMessage.includes('Connection') || errorMessage.includes('接続')) {
        setError('VOICEVOXサーバーとの接続が切断されました。サーバーが起動していることを確認してください。');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSynthesizing(false);
    }
  }, [text, isTextValid, selectedCharacter, voiceParams, isSynthesizing, isConnected]);

  // Cancel synthesis
  const handleCancelSynthesis = useCallback(() => {
    if (voicevoxApiRef.current?.cancelSynthesis) {
      voicevoxApiRef.current.cancelSynthesis();
      setIsSynthesizing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-emerald-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🎙️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ずんだ読み上げ
                </h1>
                <p className="text-sm text-gray-600">VOICEVOX音声合成システム</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConnected === null ? 'bg-gray-100 text-gray-600' :
                isConnected ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {isConnected === null ? 'チェック中...' :
                 isConnected ? 'VOICEVOX接続済み' :
                 'VOICEVOX未接続'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Text Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Text Input Block */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📝 テキスト入力
              </h2>
              <TextInput
                onTextChange={handleTextChange}
                onValidationError={setError}
              />
            </div>

            {/* Audio Player Block */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🔊 音声プレイヤー
              </h2>
              <AudioPlayer
                onError={(err: Error) => setError(err.message)}
              />
            </div>

            {/* Synthesis Button */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  🎵 音声合成
                </h2>
                {isSynthesizing && (
                  <span className="text-sm text-blue-600 animate-pulse">
                    合成中...
                  </span>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleSynthesize}
                  disabled={!isTextValid || isSynthesizing}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                    !isTextValid || isSynthesizing
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {isSynthesizing ? '合成中...' : '音声を生成'}
                </button>

                {isSynthesizing && (
                  <button
                    onClick={handleCancelSynthesis}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    キャンセル
                  </button>
                )}
              </div>

              {!isConnected && isConnected !== null && (
                <p className="mt-3 text-sm text-red-600">
                  VOICEVOXサーバーに接続できません。localhost:50021でVOICEVOXが起動していることを確認してください。
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Character Selector Block */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                👤 キャラクター選択
              </h2>
              <CharacterSelector
                onCharacterChange={handleCharacterChange}
                initialCharacterId={selectedCharacter.id}
              />
            </div>

            {/* Voice Parameters Block */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🎛️ 音声パラメータ
              </h2>
              <VoiceParameters
                onParameterChange={handleParameterChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* VOICEVOX API Component (Hidden) */}
      <div style={{ display: 'none' }}>
        <VoicevoxApiWrapper
          ref={voicevoxApiRef}
          onError={(err) => setError(err.message)}
        />
      </div>
    </div>
  );
}