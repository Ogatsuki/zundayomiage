/**
 * ========== PVBP Contracts Index ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 *
 * Purpose: Central export point for all contract interfaces
 * Usage: Import contract types for vertical block interfaces
 *
 * Contract Philosophy:
 * - Minimal external contracts maintain block self-containment
 * - Zero-context contracts reduce cognitive load
 * - Type safety enforces protocol compliance
 */

// Re-export all contract types
export type { PVBPBlockContract } from './pvbp-block-contract';
export type { VoiceSynthesisContract } from './voice-synthesis-contract';
export type { TextProcessingContract } from './text-processing-contract';
export type { AudioPlayerContract, AudioState } from './audio-player-contract';
export type { CharacterContract, Character, CharacterId } from './character-contract';
export { VOICEVOX_CHARACTERS } from './character-contract';
export type { VoiceParametersContract, VoicevoxParameters } from './voice-parameters-contract';
export { DEFAULT_VOICE_PARAMETERS } from './voice-parameters-contract';

// Runtime type definitions for PVBP compliance
export type RuntimeType = 'client' | 'server' | 'universal';

// Base PVBP block interface
export interface BasePVBPBlock {
  readonly RUNTIME: RuntimeType;
}