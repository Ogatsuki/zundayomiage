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
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy production files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app ./app
COPY --from=builder /app/core ./core
COPY --from=builder /app/state ./state
COPY --from=builder /app/shell ./shell

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]