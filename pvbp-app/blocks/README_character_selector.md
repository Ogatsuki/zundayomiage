# PVBP Character Selector Block

## Overview
A PVBP-compliant universal vertical block for VOICEVOX character selection with SSR/CSR compatibility.

## File Location
```
pvbp-app/blocks/character-selector.universal.vertical.tsx
```

## Features
- ✅ PVBP Protocol v1.0.0 compliant
- ✅ Runtime: Universal (SSR + CSR)
- ✅ CharacterContract interface implementation
- ✅ VOICEVOX_CHARACTERS constant integration
- ✅ Interactive character cards with avatars
- ✅ Dynamic character color theming
- ✅ Hydration-safe rendering
- ✅ Self-contained implementation
- ✅ Tailwind CSS styling

## Usage

### Basic Usage
```tsx
import CharacterSelector from '../blocks/character-selector.universal.vertical';
import { Character } from '../contracts/character-contract';

function MyComponent() {
  const handleCharacterChange = (character: Character) => {
    console.log('Selected:', character);
  };

  return (
    <CharacterSelector
      onCharacterChange={handleCharacterChange}
      initialCharacterId={3}
    />
  );
}
```

### Advanced Usage with Options
```tsx
<CharacterSelector
  onCharacterChange={handleCharacterChange}
  initialCharacterId={3} // ずんだもん
  title="キャラクター選択"
  showInfo={true}
  className="my-custom-class"
/>
```

### Using the Hook
```tsx
import { useCharacterSelector } from '../blocks/character-selector.universal.vertical';

function MyComponent() {
  const {
    characters,
    selectedCharacter,
    selectCharacter,
    getCharacterById
  } = useCharacterSelector(3, (character) => {
    console.log('Character changed:', character);
  });

  return (
    <div>
      <p>Selected: {selectedCharacter.displayName}</p>
      <button onClick={() => selectCharacter(2)}>
        Select 四国めたん
      </button>
    </div>
  );
}
```

## CharacterContract Implementation

The block implements the full `CharacterContract` interface:

```typescript
interface CharacterContract {
  readonly characters: readonly Character[];
  readonly selectedCharacter: Character;
  selectCharacter(characterId: number): void;
  getCharacterById(id: number): Character | undefined;
  onCharacterChange?: (character: Character) => void;
}
```

## Available Characters

| ID | Name | Display Name | Color |
|----|------|--------------|-------|
| 3 | zundamon | ずんだもん | #8BC34A |
| 2 | shikoku_metan | 四国めたん | #FF5722 |
| 1 | tsukuyomi_chan | つくよみちゃん | #9C27B0 |
| 8 | kasukabe_tsumugi | 春日部つむぎ | #FFC107 |

## Component Props

### CharacterSelector Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCharacterChange` | `(character: Character) => void` | undefined | Callback when character is selected |
| `initialCharacterId` | `number` | 3 | Initial character ID to select |
| `title` | `string` | "キャラクター選択" | Title displayed above selector |
| `showInfo` | `boolean` | true | Show selected character info |
| `className` | `string` | "" | Additional CSS classes |

## PVBP Compliance

- ✅ **Runtime Declaration**: `export const RUNTIME = 'universal' as const;`
- ✅ **Self-Contained**: All dependencies included within the block
- ✅ **Lifecycle Patterns**: `useHydrated()` and `useClientOnly()` for SSR/CSR compatibility
- ✅ **Contract Implementation**: Implements `CharacterContract` interface
- ✅ **Environment Adaptive**: Renders appropriate content for server/client

## Architecture

```
character-selector.universal.vertical.tsx
├── PVBP Runtime Declaration
├── Lifecycle Patterns (Self-Contained)
├── CharacterAvatar Component
├── CharacterCard Component
├── LoadingFallback Component
├── CharacterInfoDisplay Component
├── CharacterSelectorImpl Class (Contract Implementation)
├── CharacterSelector React Component
└── useCharacterSelector Hook
```

## Integration Example

See `app/page.tsx` for a complete integration example showing:
- Character selection handling
- State management
- UI feedback
- Contract usage