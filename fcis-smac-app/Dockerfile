# FCIS+SMAC Architecture Next.js Application Docker Image
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies installation
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck and ffmpeg for audio processing
RUN apk add --no-cache curl ffmpeg

# Tesseract.js configuration
ENV TESSDATA_PREFIX=/usr/share/tessdata

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy FCIS+SMAC architecture layers
COPY --from=builder /app/core ./core
COPY --from=builder /app/state ./state
COPY --from=builder /app/shell ./shell
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/app ./app

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# FCIS+SMAC runtime declaration: client-server hybrid
CMD ["npm", "run", "start"]