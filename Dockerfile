# Production-only Next.js Application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Set build-time environment variables for Docker environment
# Cloud Run Sidecar環境ではIPv6解決で失敗するため127.0.0.1を使用
ARG VOICEVOX_API_URL=http://127.0.0.1:50021
ARG NEXT_PUBLIC_VOICEVOX_API_URL=http://127.0.0.1:50021
ENV VOICEVOX_API_URL=$VOICEVOX_API_URL
ENV NEXT_PUBLIC_VOICEVOX_API_URL=$NEXT_PUBLIC_VOICEVOX_API_URL
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Install ffmpeg for WAV to MP3 conversion
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app ./app
COPY --from=builder /app/src/core.ts ./src/core.ts
COPY --from=builder /app/src/state.ts ./src/state.ts
COPY --from=builder /app/src/shell.tsx ./src/shell.tsx

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]