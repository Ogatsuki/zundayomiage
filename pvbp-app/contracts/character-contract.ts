/**
 * ========== Character Contract ==========
 * PVBP Protocol v1.0.0 Compliant
 * Runtime: universal
 */

export interface Character {
  readonly id: number;
  readonly name: string;
  readonly displayName: string;
  readonly color: string;
  readonly avatar?: string;
}

export interface CharacterContract {
  // Available characters
  readonly characters: readonly Character[];

  // Current selection
  readonly selectedCharacter: Character;

  // Actions
  selectCharacter(characterId: number): void;
  getCharacterById(id: number): Character | undefined;

  // Events
  onCharacterChange?: (character: Character) => void;
}

// Pre-defined VOICEVOX characters
export const VOICEVOX_CHARACTERS: readonly Character[] = [
  { id: 3, name: 'zundamon', displayName: 'ずんだもん', color: '#8BC34A' },
  { id: 2, name: 'shikoku_metan', displayName: '四国めたん', color: '#FF5722' },
  { id: 1, name: 'tsukuyomi_chan', displayName: 'つくよみちゃん', color: '#9C27B0' },
  { id: 8, name: 'kasukabe_tsumugi', displayName: '春日部つむぎ', color: '#FFC107' }
] as const;

export type CharacterId = typeof VOICEVOX_CHARACTERS[number]['id'];