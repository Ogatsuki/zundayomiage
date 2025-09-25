# PVBP-compliant Next.js Application Docker Image
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

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/blocks ./blocks
COPY --from=builder /app/contracts ./contracts

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# PVBP runtime declaration: universal (server-side rendering)
CMD ["npm", "run", "start"]