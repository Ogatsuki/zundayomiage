# Sub Agent実践ワークフロー：音声生成システムの例

## 前提：3つの専門Agent

```yaml
# .claude/agent-config.yaml
agents:
  architect:
    role: "システム全体の契約設計"
    access: "contracts/*.ts のみ"

  block-worker:
    role: "単一ブロックの実装"
    access: "自分のブロックフォルダのみ"

  integrator:
    role: "ブロック間の接続確認"
    access: "TypeScriptコンパイラ出力のみ"
```

## 実践例：音声生成機能の開発

### Phase 1: Architect Agentが契約を設計

```typescript
// contracts/voice-system.contract.ts
// Architect Agentが生成（10秒で完了）

export namespace VoiceSystem {
  // 入力ブロックの契約
  export interface TextInputBlock {
    readonly text: string & { __limit: 10000 }
    validate(): this is { text: string }
  }

  // 生成ブロックの契約
  export interface VoiceGenBlock {
    generate(input: TextInputBlock): Promise<AudioData>
  }

  // 出力ブロックの契約
  export interface AudioOutputBlock {
    play(data: AudioData): Promise<void>
  }

  // データ型（共通語彙）
  export type AudioData = {
    readonly blob: Blob
    readonly duration: number
    readonly format: 'mp3' | 'wav'
  }
}
```

### Phase 2: Block-Worker Agentが並列実装

**3つのAgentを同時起動**：

```bash
# Terminal 1
claude --agent block-worker \
  --contract VoiceSystem.TextInputBlock \
  --output blocks/text-input/ \
  "Implement text input block"

# Terminal 2
claude --agent block-worker \
  --contract VoiceSystem.VoiceGenBlock \
  --output blocks/voice-gen/ \
  "Implement voice generation"

# Terminal 3
claude --agent block-worker \
  --contract VoiceSystem.AudioOutputBlock \
  --output blocks/audio-output/ \
  "Implement audio player"
```

**各Agentの出力例**：

```typescript
// blocks/text-input/index.ts
// Agent1が生成（契約だけ見て実装）
import type { VoiceSystem } from '../../contracts/voice-system.contract'

export class TextInput implements VoiceSystem.TextInputBlock {
  constructor(private _text: string) {}

  get text() {
    return this._text as string & { __limit: 10000 }
  }

  validate(): this is { text: string } {
    return this._text.length > 0 && this._text.length <= 10000
  }
}
```

### Phase 3: Integrator Agentが接続

```typescript
// integration/voice-pipeline.ts
// Integrator Agentが生成

import { TextInput } from '../blocks/text-input'
import { VoiceGenerator } from '../blocks/voice-gen'
import { AudioOutput } from '../blocks/audio-output'

export class VoicePipeline {
  // 型システムが契約履行を保証
  async process(text: string) {
    const input = new TextInput(text)

    if (!input.validate()) {
      throw new Error('Invalid input')
    }

    const audio = await new VoiceGenerator().generate(input)
    await new AudioOutput().play(audio)
  }
}
```

## 革命的な点

### 1. 完全並列開発
- 3人のAIが同時に別々のブロックを開発
- お互いの実装を一切見ない
- 契約（型）だけで協調

### 2. ゼロコンフリクト
- TypeScriptコンパイラが統合を保証
- マージコンフリクトなし
- 実行時エラーほぼゼロ

### 3. 超高速開発
- 全体の開発時間: 最も遅いブロックの時間
- 従来: 30分（逐次）
- Sub Agent: 10分（並列）

## 実装提案：専用ディレクティブ

```typescript
// .claude/directives.md

## @contract-only
このディレクティブが指定されたら、contracts/*.tsだけを参照

## @block-isolated <blockname>
指定されたブロックフォルダ内だけで作業

## @type-check-only
TypeScriptのコンパイル結果だけを確認
```

## 使用例

```bash
# ユーザーのコマンド
claude "音声生成システムを作って @contract-only でまず設計、
       その後 @block-isolated で各ブロック実装"

# Claudeの動作
1. 契約設計モードに入る（contracts/のみアクセス）
2. 契約完成後、3つのSub Agentを起動
3. 各Agentが独立してブロック実装
4. 最後に統合確認
```

## まとめ

Sub Agentの真の価値は「**認知的分離**」にあります：
- 各Agentは最小限の情報だけで動作
- 契約が唯一の共通言語
- TypeScriptが調停者

これにより、AIの認知負荷を劇的に削減しつつ、開発速度を3倍以上に向上できます。