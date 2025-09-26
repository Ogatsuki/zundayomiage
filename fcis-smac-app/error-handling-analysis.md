# fcis-smac-app エラーハンドリング静的解析レポート

## 調査日時
2025-09-27

## 調査範囲
fcis-smac-app内の以下のファイル:
- `core/voicevox.core.ts`
- `state/voicevox.machine.ts`
- `app/page.tsx`
- `shell/voicevox.shell.client.vertical.tsx`
- `shell/ui-input.shell.client.vertical.tsx`
- `shell/status-display.shell.client.vertical.tsx`
- `contracts/voice-synthesis.contract.ts`

## エラーハンドリング実装の概要

### 良好な実装箇所
1. **Core層**（`voicevox.core.ts`）
   - Result型によるエラーハンドリング（throw文を使用しない）
   - エラー種別判定関数の実装
   - HTTPステータスコードからのエラー分類

2. **State層**（`voicevox.machine.ts`）
   - XStateのエラー状態管理
   - リトライ機能の実装（最大3回）
   - エラー情報の保持と伝播

3. **Shell層の一部**（`voicevox.shell.client.vertical.tsx`）
   - AbortControllerによる通信キャンセル管理
   - エラー情報のマッピングと表示

## エラーハンドリング欠如箇所の特定

### 1. try-catchブロックの欠如箇所

#### `app/page.tsx`
- **行31-34**: `synthesisMachineRef.current.synthesizeVoice()`の呼び出し
  ```typescript
  synthesisMachineRef.current.synthesizeVoice(text, speakerId).catch((error) => {
    // エラーはStatusDisplayで表示される（コメントのみで実装なし）
  });
  ```
  **問題**: catchブロックが空で、実際のエラーハンドリングが欠如

#### `shell/voicevox.shell.client.vertical.tsx`
- **行432-436**: 自動合成開始処理
  ```typescript
  synthesis.synthesizeVoice(text, speakerId).catch(() => {
    // エラーハンドリングはsynthesis.errorで行う（コメントのみ）
  });
  ```
  **問題**: catchブロックが空で、エラーロギングや通知が欠如

### 2. Promise rejectのハンドリング不足

#### `state/voicevox.machine.ts`
- **行96**: `setTimeout`のみのモック実装
  ```typescript
  await new Promise(resolve => setTimeout(resolve, 1000));
  ```
  **問題**: rejectケースの考慮なし、実際の接続失敗時の処理が不明確

- **行123, 149**: 同様のモック実装
  **問題**: エラーシミュレーションやタイムアウト処理がない

#### `shell/voicevox.shell.client.vertical.tsx`
- **行196**: Audio再生のエラーハンドリング
  ```typescript
  audio.play().catch(reject);
  ```
  **問題**: エラーメッセージが汎用的（'PLAYBACK_FAILED'）で詳細情報が失われる

### 3. ネットワークエラーの処理欠如

#### `shell/voicevox.shell.client.vertical.tsx`
- **行139-151**: `fetchAudioQuery`関数
  ```typescript
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  ```
  **問題**:
  - ネットワーク切断時のエラーハンドリングなし
  - タイムアウト設定なし
  - リトライロジックが関数レベルで欠如

- **行164-178**: `synthesizeAudio`関数
  **問題**: 同様のネットワークエラー処理欠如

- **行210-228**: `checkConnection`関数
  ```typescript
  } catch (error) {
    throw new Error(`VOICEVOX server connection failed: ${error}`);
  }
  ```
  **問題**: エラーの詳細情報（ネットワークエラー、DNSエラー等）が失われる

### 4. VOICEVOXサーバー通信エラーの未処理

#### `shell/voicevox.shell.client.vertical.tsx`
- **行147-150, 174-177**: HTTPステータスエラーの処理
  ```typescript
  if (!response.ok) {
    const errorType = VoiceCore.classifyHttpError(response.status);
    throw new Error(errorType);
  }
  ```
  **問題**:
  - レスポンスボディのエラーメッセージを読み取っていない
  - サーバーからの詳細なエラー情報が失われる
  - 429（Rate Limit）や503（Service Unavailable）の特別処理なし

### 5. タイムアウト処理の未実装箇所

#### 全体的な問題
- fetch APIの呼び出しでタイムアウト設定がない
- 長時間応答がない場合の処理が未定義
- AbortControllerはあるが、タイムアウトによる自動中断がない

推奨される実装例:
```typescript
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};
```

### 6. その他の問題点

#### `app/page.tsx`
- **行59-93**: エラー情報の取得関数群
  ```typescript
  const getConnectionStatus = () => {
    if (!synthesisMachineRef.current) return 'disconnected';
    // ...
  };
  ```
  **問題**: `synthesisMachineRef.current`がnullの場合の処理が不統一

#### `shell/ui-input.shell.client.vertical.tsx`
- エラーハンドリングは概ね良好だが、入力検証エラーのユーザー通知が限定的

#### `shell/status-display.shell.client.vertical.tsx`
- 純粋な表示コンポーネントなので、エラーハンドリングは不要（設計通り）

## 推奨される改善策

### 優先度：高
1. **ネットワーク通信のタイムアウト実装**
   - 全fetch呼び出しにタイムアウトを設定
   - デフォルト30秒、音声合成は60秒を推奨

2. **詳細なエラー情報の保持**
   - VOICEVOXサーバーからのエラーレスポンスボディを読み取る
   - ネットワークエラーの種類を区別（DNS、接続拒否、タイムアウト等）

3. **Promise catchブロックの実装**
   - 空のcatchブロックをすべて実装
   - 最低限のエラーロギングを追加

### 優先度：中
1. **リトライロジックの強化**
   - 指数バックオフの実装
   - エラー種別に応じたリトライ戦略

2. **エラー境界（Error Boundary）の追加**
   - Reactコンポーネント全体をラップ
   - 予期しないエラーのキャッチと表示

### 優先度：低
1. **エラーログの集約**
   - コンソール以外のロギング機構
   - エラー追跡サービスとの統合検討

2. **ユーザー向けエラーメッセージの改善**
   - 技術的エラーをユーザーフレンドリーなメッセージに変換
   - 対処法の提示

## まとめ

fcis-smac-appは基本的なエラーハンドリング構造（Result型、XStateエラー状態）は実装されているが、実際の非同期処理やネットワーク通信においてエラーハンドリングが不完全な箇所が複数存在する。特にVOICEVOXサーバーとの通信部分でタイムアウト処理やネットワークエラーの詳細な処理が欠如しており、本番環境での安定性に懸念がある。

早急な対応が必要な箇所：
1. fetch呼び出しのタイムアウト実装
2. 空のcatchブロックの実装
3. VOICEVOXサーバーエラーレスポンスの適切な処理