/**
 * ========== PVBP Universal Character Selector Block ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/character-selector.universal.vertical.tsx
 * Runtime: Universal (SSR + CSR)
 *
 * Purpose: Character selection interface with VOICEVOX characters
 * Features:
 * - Display VOICEVOX characters as interactive cards
 * - Highlight selected character with visual feedback
 * - Character info display (name, color, avatar)
 * - Self-contained implementation with character state management
 * - SSR/CSR compatible rendering with hydration safety
 * - Tailwind CSS styling with dynamic character colors
 * - Implements CharacterContract interface
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Character, CharacterContract, VOICEVOX_CHARACTERS } from '../contracts/character-contract';

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

// ===== Character Avatar Component =====
const CharacterAvatar: React.FC<{
  character: Character;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ character, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl'
  };

  const getInitials = (name: string) => {
    // Get first 2 characters for Japanese names, or first letter for English names
    return name.length > 2 ? name.slice(0, 2) : name.slice(0, 1).toUpperCase();
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg ${className}`}
      style={{ backgroundColor: character.color }}
    >
      {character.avatar ? (
        <img
          src={character.avatar}
          alt={character.displayName}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{getInitials(character.displayName)}</span>
      )}
    </div>
  );
};

// ===== Character Card Component =====
const CharacterCard: React.FC<{
  character: Character;
  isSelected: boolean;
  onSelect: (character: Character) => void;
  isHydrated: boolean;
}> = ({ character, isSelected, onSelect, isHydrated }) => {
  const handleClick = useCallback(() => {
    onSelect(character);
  }, [character, onSelect]);

  const cardStyle: React.CSSProperties = {
    borderColor: isSelected ? character.color : '#e5e7eb',
    ...(isSelected && {
      boxShadow: `0 0 0 4px ${character.color}25, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`
    })
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105
        ${isSelected
          ? 'shadow-xl scale-105'
          : 'hover:shadow-lg'
        }
        ${isHydrated ? 'hover:shadow-lg' : ''}
        bg-white rounded-xl p-3 border-2 select-none
      `}
      style={cardStyle}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
          style={{ backgroundColor: character.color }}
        >
          ✓
        </div>
      )}

      {/* Character content */}
      <div className="flex flex-col items-center space-y-2">
        <CharacterAvatar character={character} size="md" />

        <div className="text-center">
          <h3 className="font-bold text-gray-800 text-sm">{character.displayName}</h3>
        </div>
      </div>

      {/* Hover effect overlay */}
      {isHydrated && (
        <div
          className={`
            absolute inset-0 rounded-xl opacity-0 hover:opacity-10 transition-opacity duration-200
            ${isSelected ? 'opacity-5' : ''}
          `}
          style={{ backgroundColor: character.color }}
        />
      )}
    </div>
  );
};

// ===== Loading Fallback for SSR =====
const LoadingFallback: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="bg-white rounded-xl p-3 border-2 border-gray-200 animate-pulse">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 w-full">
            <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ===== Character Info Display Component =====
const CharacterInfoDisplay: React.FC<{
  selectedCharacter: Character;
  isHydrated: boolean;
}> = ({ selectedCharacter, isHydrated }) => {
  if (!isHydrated) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 transition-all duration-300"
      style={{ borderColor: selectedCharacter.color }}
    >
      <div className="flex items-center space-x-4">
        <CharacterAvatar character={selectedCharacter} size="md" />
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-xl">{selectedCharacter.displayName}</h3>
        </div>
        <div
          className="px-3 py-1 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: selectedCharacter.color }}
        >
          選択中
        </div>
      </div>
    </div>
  );
};

// ===== Main Character Selector Block Implementation =====
class CharacterSelectorImpl implements CharacterContract {
  private _selectedCharacter: Character;
  private _onCharacterChange?: (character: Character) => void;

  constructor(initialCharacterId?: number, onCharacterChange?: (character: Character) => void) {
    this._selectedCharacter = this.getCharacterById(initialCharacterId || VOICEVOX_CHARACTERS[0].id) || VOICEVOX_CHARACTERS[0];
    this._onCharacterChange = onCharacterChange;
  }

  get characters(): readonly Character[] {
    return VOICEVOX_CHARACTERS;
  }

  get selectedCharacter(): Character {
    return this._selectedCharacter;
  }

  selectCharacter(characterId: number): void {
    const character = this.getCharacterById(characterId);
    if (character && character.id !== this._selectedCharacter.id) {
      this._selectedCharacter = character;
      this._onCharacterChange?.(character);
    }
  }

  getCharacterById(id: number): Character | undefined {
    return VOICEVOX_CHARACTERS.find(char => char.id === id);
  }

  set onCharacterChange(callback: ((character: Character) => void) | undefined) {
    this._onCharacterChange = callback;
  }
}

// ===== Character Selector React Component =====
const CharacterSelector: React.FC<{
  onCharacterChange?: (character: Character) => void;
  initialCharacterId?: number;
  title?: string;
  showInfo?: boolean;
  className?: string;
}> = ({
  onCharacterChange,
  initialCharacterId,
  title = "キャラクター選択",
  showInfo = true,
  className = ""
}) => {
  // Environment detection
  const isHydrated = useHydrated();
  const isClient = useClientOnly();

  // Character selector implementation
  const [selector] = useState(() =>
    new CharacterSelectorImpl(initialCharacterId, onCharacterChange)
  );

  // Local state for UI updates
  const [selectedCharacter, setSelectedCharacter] = useState(selector.selectedCharacter);

  // Update callback when prop changes
  useEffect(() => {
    selector.onCharacterChange = onCharacterChange;
  }, [onCharacterChange, selector]);

  // Handle character selection
  const handleCharacterSelect = useCallback((character: Character) => {
    selector.selectCharacter(character.id);
    setSelectedCharacter(character);
  }, [selector]);

  // Render loading state for SSR
  if (!isClient) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600">サーバーサイドレンダリング中...</p>
        </div>

        {showInfo && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}

        <LoadingFallback count={VOICEVOX_CHARACTERS.length} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
          <span className="mr-3">🎭</span>
          {title}
        </h2>
        <p className="text-gray-600">
          {isHydrated ? '好きなキャラクターを選択してください' : 'ハイドレーション中...'}
        </p>
      </div>

      {/* Selected Character Info */}
      {showInfo && (
        <CharacterInfoDisplay
          selectedCharacter={selectedCharacter}
          isHydrated={isHydrated}
        />
      )}

      {/* Character Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {VOICEVOX_CHARACTERS.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            isSelected={character.id === selectedCharacter.id}
            onSelect={handleCharacterSelect}
            isHydrated={isHydrated}
          />
        ))}
      </div>

    </div>
  );
};

// ===== Export Character Selector Implementation =====
export default CharacterSelector;

// Export the contract implementation for direct usage
export { CharacterSelectorImpl };

// Export hook for using character selector in other components
export const useCharacterSelector = (
  initialCharacterId?: number,
  onCharacterChange?: (character: Character) => void
) => {
  const [selector] = useState(() =>
    new CharacterSelectorImpl(initialCharacterId, onCharacterChange)
  );

  const [selectedCharacter, setSelectedCharacter] = useState(selector.selectedCharacter);

  const selectCharacter = useCallback((characterId: number) => {
    selector.selectCharacter(characterId);
    setSelectedCharacter(selector.selectedCharacter);
  }, [selector]);

  useEffect(() => {
    selector.onCharacterChange = onCharacterChange;
  }, [onCharacterChange, selector]);

  return {
    characters: selector.characters,
    selectedCharacter,
    selectCharacter,
    getCharacterById: selector.getCharacterById.bind(selector)
  };
};