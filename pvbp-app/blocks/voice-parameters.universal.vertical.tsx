/**
 * ========== PVBP Voice Parameters Control Block ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/voice-parameters.universal.vertical.tsx
 * Runtime: Universal (SSR + CSR)
 *
 * Purpose: Voice synthesis parameter controls with real-time preview
 * Features:
 * - Speed, pitch, intonation, volume sliders
 * - Real-time value display
 * - Reset to defaults functionality
 * - VOICEVOX API parameter conversion
 * - Self-contained state management
 * - Universal rendering (SSR/CSR compatible)
 * - Tailwind CSS styling
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';

// ===== PVBP Runtime Declaration =====
export const RUNTIME = 'universal' as const;

// ===== PVBP Lifecycle Patterns (Self-Contained) =====
const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
};

const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
};

// ===== Type Definitions (Self-Contained) =====
export interface VoiceParametersContract {
  speed: number; // 0.5 to 2.0
  pitch: number; // -0.15 to 0.15
  intonation: number; // 0.0 to 2.0
  volume: number; // 0.0 to 1.0
  setSpeed(value: number): void;
  setPitch(value: number): void;
  setIntonation(value: number): void;
  setVolume(value: number): void;
  resetToDefaults(): void;
  getApiParameters(): VoicevoxParameters;
  onParameterChange?: (params: VoiceParametersContract) => void;
}

export interface VoicevoxParameters {
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
}

// ===== Constants (Self-Contained) =====
const DEFAULT_PARAMETERS = {
  speed: 1.0,
  pitch: 0.0,
  intonation: 1.0,
  volume: 0.5  // Changed from 1.0 to 0.5 to avoid extreme value warning
};

const PARAMETER_RANGES = {
  speed: { min: 0.5, max: 2.0, step: 0.1 },
  pitch: { min: -0.15, max: 0.15, step: 0.01 },
  intonation: { min: 0.0, max: 2.0, step: 0.1 },
  volume: { min: 0.0, max: 1.0, step: 0.1 }
} as const;

const PARAMETER_LABELS = {
  speed: { name: '話速', icon: '⚡', unit: 'x', description: '話す速度を調整' },
  pitch: { name: '音高', icon: '🎵', unit: '', description: '声の高低を調整' },
  intonation: { name: 'イントネーション', icon: '🎶', unit: 'x', description: '抑揚の強さを調整' },
  volume: { name: '音量', icon: '🔊', unit: '%', description: '音量レベルを調整' }
} as const;

// ===== Utility Functions (Self-Contained) =====
const formatValue = (value: number, param: keyof typeof PARAMETER_RANGES): string => {
  const { unit } = PARAMETER_LABELS[param];
  const precision = param === 'pitch' ? 2 : 1;
  const formattedValue = value.toFixed(precision);

  switch (unit) {
    case '%':
      return `${(value * 100).toFixed(0)}%`;
    case 'x':
      return `${formattedValue}x`;
    default:
      return formattedValue;
  }
};

const getSliderStyle = (value: number, range: { min: number; max: number }): string => {
  const percentage = ((value - range.min) / (range.max - range.min)) * 100;
  return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
};

// ===== Environment-Adaptive Components =====

// Loading/Skeleton fallback for SSR
const LoadingFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse ${className || ''}`}>
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-full"></div>
  </div>
);

// Parameter Slider Component
const ParameterSlider: React.FC<{
  param: keyof typeof PARAMETER_RANGES;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isClient: boolean;
}> = ({ param, value, onChange, disabled = false, isClient }) => {
  const range = PARAMETER_RANGES[param];
  const label = PARAMETER_LABELS[param];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  }, [onChange]);

  if (!isClient) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <LoadingFallback className="w-1/3" />
          <LoadingFallback className="w-1/4" />
        </div>
        <LoadingFallback className="w-full h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Parameter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{label.icon}</span>
          <span className="font-medium text-gray-800">{label.name}</span>
          <span className="text-xs text-gray-500">({label.description})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`font-bold text-lg px-2 py-1 rounded-lg min-w-[4rem] text-center ${
            disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-800'
          }`}>
            {formatValue(value, param)}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            background: disabled ? '#e5e7eb' : getSliderStyle(value, range)
          }}
        />

        {/* Range indicators */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatValue(range.min, param)}</span>
          <span>{formatValue(range.max, param)}</span>
        </div>
      </div>

      {/* Visual feedback for extreme values */}
      {isClient && !disabled && (
        <div className="h-2">
          {((param === 'speed' && (value < 0.7 || value > 1.5)) ||
            (param === 'pitch' && Math.abs(value) > 0.1) ||
            (param === 'intonation' && (value < 0.5 || value > 1.5)) ||
            (param === 'volume' && (value < 0.2 || value >= 1.0))) && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              ⚠️ 極端な値が設定されています
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Reset Button Component
const ResetButton: React.FC<{
  onReset: () => void;
  disabled?: boolean;
  isClient: boolean;
}> = ({ onReset, disabled = false, isClient }) => {
  if (!isClient) {
    return (
      <div className="w-full">
        <LoadingFallback className="h-12" />
      </div>
    );
  }

  return (
    <button
      onClick={onReset}
      disabled={disabled}
      className={`w-full px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-200 ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 transform hover:scale-[1.02] active:scale-[0.98]'
      }`}
    >
      🔄 デフォルトに戻す
    </button>
  );
};

// Parameter Summary Component
const ParameterSummary: React.FC<{
  parameters: {
    speed: number;
    pitch: number;
    intonation: number;
    volume: number;
  };
  isClient: boolean;
}> = ({ parameters, isClient }) => {
  if (!isClient) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <LoadingFallback />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
      <h4 className="font-bold text-gray-800 mb-3 flex items-center">
        <span className="text-lg mr-2">📊</span>
        現在の設定値
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {Object.entries(parameters).map(([key, value]) => {
          const param = key as keyof typeof PARAMETER_RANGES;
          const label = PARAMETER_LABELS[param];
          return (
            <div key={key} className="flex items-center justify-between bg-white/50 px-3 py-2 rounded">
              <div className="flex items-center space-x-2">
                <span>{label.icon}</span>
                <span className="font-medium">{label.name}</span>
              </div>
              <span className="font-bold text-blue-800">{formatValue(value, param)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Main Voice Parameters Block =====
const VoiceParameters: React.FC<{
  onParameterChange?: (params: VoiceParametersContract) => void;
  disabled?: boolean;
  className?: string;
}> = ({ onParameterChange, disabled = false, className = '' }) => {
  // Environment detection hooks
  const hydrated = useHydrated();
  const isClient = useClientOnly();

  // State management (self-contained)
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);

  // Contract implementation
  const contractImplementation: VoiceParametersContract = {
    speed: parameters.speed,
    pitch: parameters.pitch,
    intonation: parameters.intonation,
    volume: parameters.volume,

    setSpeed: useCallback((value: number) => {
      const clampedValue = Math.max(PARAMETER_RANGES.speed.min, Math.min(PARAMETER_RANGES.speed.max, value));
      setParameters(prev => ({ ...prev, speed: clampedValue }));
    }, []),

    setPitch: useCallback((value: number) => {
      const clampedValue = Math.max(PARAMETER_RANGES.pitch.min, Math.min(PARAMETER_RANGES.pitch.max, value));
      setParameters(prev => ({ ...prev, pitch: clampedValue }));
    }, []),

    setIntonation: useCallback((value: number) => {
      const clampedValue = Math.max(PARAMETER_RANGES.intonation.min, Math.min(PARAMETER_RANGES.intonation.max, value));
      setParameters(prev => ({ ...prev, intonation: clampedValue }));
    }, []),

    setVolume: useCallback((value: number) => {
      const clampedValue = Math.max(PARAMETER_RANGES.volume.min, Math.min(PARAMETER_RANGES.volume.max, value));
      setParameters(prev => ({ ...prev, volume: clampedValue }));
    }, []),

    resetToDefaults: useCallback(() => {
      setParameters(DEFAULT_PARAMETERS);
    }, []),

    getApiParameters: useCallback((): VoicevoxParameters => ({
      speedScale: parameters.speed,
      pitchScale: parameters.pitch,
      intonationScale: parameters.intonation,
      volumeScale: parameters.volume
    }), [parameters]),

    onParameterChange
  };

  // Parameter change effect
  useEffect(() => {
    if (onParameterChange && isClient) {
      onParameterChange(contractImplementation);
    }
  }, [parameters, onParameterChange, isClient]);

  // Parameter update handlers
  const handleSpeedChange = useCallback((value: number) => {
    contractImplementation.setSpeed(value);
  }, [contractImplementation]);

  const handlePitchChange = useCallback((value: number) => {
    contractImplementation.setPitch(value);
  }, [contractImplementation]);

  const handleIntonationChange = useCallback((value: number) => {
    contractImplementation.setIntonation(value);
  }, [contractImplementation]);

  const handleVolumeChange = useCallback((value: number) => {
    contractImplementation.setVolume(value);
  }, [contractImplementation]);

  const handleReset = useCallback(() => {
    contractImplementation.resetToDefaults();
  }, [contractImplementation]);

  // UI Rendering with environment adaptation
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-lg space-y-6 ${className}`}>
      {/* Block Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🎚️</span>
          <div>
            <h3 className="text-xl font-bold text-gray-800">音声パラメーター設定</h3>
            <p className="text-sm text-gray-600">
              {hydrated ? 'リアルタイムプレビュー対応' : '読み込み中...'}
            </p>
          </div>
        </div>
      </div>

      {/* Parameter Controls */}
      <div className="space-y-6">
        <ParameterSlider
          param="speed"
          value={parameters.speed}
          onChange={handleSpeedChange}
          disabled={disabled}
          isClient={isClient}
        />

        <ParameterSlider
          param="pitch"
          value={parameters.pitch}
          onChange={handlePitchChange}
          disabled={disabled}
          isClient={isClient}
        />

        <ParameterSlider
          param="intonation"
          value={parameters.intonation}
          onChange={handleIntonationChange}
          disabled={disabled}
          isClient={isClient}
        />

        <ParameterSlider
          param="volume"
          value={parameters.volume}
          onChange={handleVolumeChange}
          disabled={disabled}
          isClient={isClient}
        />
      </div>

      {/* Parameter Summary */}
      <ParameterSummary parameters={parameters} isClient={isClient} />

      {/* Reset Button */}
      <ResetButton onReset={handleReset} disabled={disabled} isClient={isClient} />

    </div>
  );
};

export default VoiceParameters;