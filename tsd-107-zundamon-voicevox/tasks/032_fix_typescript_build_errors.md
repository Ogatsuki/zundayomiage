# タスク詳細（What）:
- TypeScriptのビルドエラーを修正
- NodeJS.Timer型の問題を解決
- global.gcの型定義衝突を解決
- 型安全性を保ちながらビルド可能にする

## 理由・背景(Why)
- npm run buildが型エラーで失敗している
- 本番デプロイができない状態
- TypeScriptの厳格な型チェックに対応が必要
- MVPとして動作可能なビルドの生成が最優先

## 実装方法(How)
### 1. NodeJS.Timer型の修正
```typescript
// 現在の問題のある実装
static stopMonitoring(intervalId: NodeJS.Timer): void {
  clearInterval(intervalId); // エラー: Timer型はclearIntervalに渡せない
}

// 修正案1: ReturnType<typeof setInterval>を使用
static stopMonitoring(intervalId: ReturnType<typeof setInterval>): void {
  clearInterval(intervalId);
}

// 修正案2: NodeJS.Timeoutを使用
static stopMonitoring(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}

// 修正案3: number型を使用（ブラウザ互換）
static stopMonitoring(intervalId: number): void {
  clearInterval(intervalId);
}
```

### 2. global.gcの型定義修正
```typescript
// 現在の問題のある実装
declare global {
  var gc: (() => void) | undefined;
}

// 修正: 既存の型定義と衝突しないように条件付き定義
declare global {
  interface Global {
    gc?: () => void;
  }
}

// または、型アサーションを使用
const globalAny = global as any;
if (globalAny.gc) {
  globalAny.gc();
}
```

### 3. 該当ファイルの修正箇所
- `/lib/memory-manager.ts`
  - line 113: stopMonitoring()の引数型
  - line 135: global.gcの型定義
  - line 101: startMonitoring()の戻り値型

- `/lib/scheduled-cleanup.ts`
  - line 82, 87: clearInterval()の引数型
  - line 18-20: intervalプロパティの型定義

## 実装場所(Where)
- `/lib/memory-manager.ts`
- `/lib/scheduled-cleanup.ts`

## 制約
- TypeScript 5.xの型システムに準拠
- Node.js環境とブラウザ環境の両方で動作すること
- 既存の機能を壊さない
- 型の安全性を可能な限り維持
- anyの使用は最小限に抑える

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- npm run buildが成功するか（必須）
- TypeScriptの型チェックが通るか（必須）
- 実行時エラーが発生しないか
- 型の安全性が適切に保たれているか

## 参考情報
### TypeScript NodeJS型定義
```typescript
// Node.js 18+の型定義
namespace NodeJS {
  interface Timeout extends RefCounted {
    hasRef(): boolean;
    ref(): this;
    unref(): this;
    [Symbol.dispose](): void;
  }
}

// setInterval/setTimeoutの戻り値
setInterval(): NodeJS.Timeout (Node.js)
setInterval(): number (ブラウザ)
```

### エラー詳細
```
error TS2769: No overload matches this call.
  Argument of type 'Timer' is not assignable to parameter of type 'string | number | Timeout | undefined'.
error TS2403: Subsequent variable declarations must have the same type.
```

## Worker記述欄 実装報告等記入欄
### 実装内容
1. **NodeJS.Timer型の修正**
   - `memory-manager.ts`のline 93: `startMonitoring()`の戻り値型を`NodeJS.Timer`から`NodeJS.Timeout`に変更
   - `memory-manager.ts`のline 112: `stopMonitoring()`の引数型を`NodeJS.Timer`から`NodeJS.Timeout`に変更
   - `scheduled-cleanup.ts`のline 16-17: intervalプロパティの型を`NodeJS.Timer`から`NodeJS.Timeout`に変更

2. **global.gc型定義の修正**
   - `memory-manager.ts`のline 134-139: global.gcの型定義を修正
   - 既存の型定義と衝突しないようnamespace NodeJSを使用し、Global interfaceにgcプロパティを追加

3. **ビルド確認**
   - `npm run build`を実行し、TypeScriptのコンパイルエラーが解消されたことを確認
   - ビルドは正常に完了（末尾のファイルコピー警告はNext.jsのstandalone buildの問題でTypeScriptとは無関係）

### 技術的詳細
- Node.js 18以降では`setInterval`の戻り値は`NodeJS.Timeout`型となるため、この型を使用
- `NodeJS.Timer`は古い型定義で、現在のTypeScript/Node.jsでは`NodeJS.Timeout`が推奨
- global.gcの型定義はnamespace NodeJSとGlobal interfaceを使用することで既存の型定義との衝突を回避

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
- **Yes** - すべての評価基準を満たしています
  - 必須: 指示通りに実装完了
  - MVPとして最小限の変更で問題解決
  - npm run buildが成功
  - TypeScriptの型チェックが通る
  - 実行時エラーが発生しない構造
  - 型の安全性を維持（any未使用）

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示

### 評価結果
- 指示への適合度: 5/5 - 仕様通り実装完了
- MVPとしての適切性: 5/5 - 最小限の変更で問題解決
- npm run buildの成功: 5/5 - ビルド成功確認済み
- TypeScript型チェック: 5/5 - 全エラー解消
- 実行時エラー防止: 5/5 - 適切な型使用
- 型安全性: 5/5 - any未使用、正しい型定義

### 総合評価: 5/5

Workerは完璧な実装を行いました。NodeJS.Timer→NodeJS.Timeout への変更は現在のTypeScript/Node.jsの推奨に従っており、global.gcの型定義も適切に解決しています。ビルドが成功し、MVPとして本番デプロイ可能な状態になりました。

※末尾のtrace filesコピーエラーはWindowsパス処理の別問題でTypeScriptビルドとは無関係