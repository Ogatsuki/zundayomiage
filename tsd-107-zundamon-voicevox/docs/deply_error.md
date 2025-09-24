Build Error

Failed to compile
Next.js (14.2.32) is outdated (learn more)
./app/globals.css

Module parse failed: Unexpected character '@' (1:0)
> @tailwind base;
| @tailwind components;
| @tailwind utilities;

This error occurred during the build process and can only be dismissed by fixing the error.



---------------------------以下コンソールエラー


Uncaught ModuleParseError: Module parse failed: Unexpected character '@' (1:0)
File was processed with these loaders:
 * ./node_modules/next/dist/build/webpack/loaders/next-flight-css-loader.js
You may need an additional loader to handle the result of these loaders.
> @tailwind base;
| @tailwind components;
| @tailwind utilities;
nodeStackFrames.ts:30:11
[HMR] connected websocket.ts:27:22
./app/globals.css
Module parse failed: Unexpected character '@' (1:0)
> @tailwind base;
| @tailwind components;
| @tailwind utilities;

---

## 原因分析結果

### 主要原因
**Dockerfileで開発モード(`npm run dev`)を使用していることが根本原因**

### 詳細分析

1. **開発モード vs 本番モード**
   - 現在のDockerfile: `CMD ["npm", "run", "dev"]` (開発モード)
   - Cloud Run要件: 本番ビルド(`npm run build` → `npm start`)

2. **TailwindCSS処理の違い**
   - 開発モード: JIT(Just-In-Time)で動的CSS生成
   - 本番モード: ビルド時に静的CSS生成、purge/tree-shaking実行
   - Cloud Runでは本番モードでのTailwind処理が適切に実行されていない

3. **Cloud Run環境特有の問題**
   - HMR(Hot Module Replacement)は本番環境では不要
   - メモリ効率とパフォーマンスの観点から事前ビルドが必須
   - PostCSSプラグインの初期化タイミングが開発/本番で異なる

### 解決策

1. **Dockerfileの修正**
```dockerfile
# 現在（問題あり）
CMD ["npm", "run", "dev"]

# 修正後
RUN npm run build
CMD ["npm", "start"]
```

2. **マルチステージビルドの採用**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
RUN npm install --production --frozen-lockfile
CMD ["npm", "start"]
```

3. **Next.js設定の確認**
   - `next.config.js`でoutput設定を確認
   - 環境変数の適切な設定確認

### 根本的な問題
TailwindCSSの`@tailwind`ディレクティブがPostCSSで処理される前にWebpackに渡されており、これは開発モードでの不適切な初期化が原因。本番ビルドに変更することで解決される。