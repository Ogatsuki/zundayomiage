# ===== Builder Stage =====
FROM node:20-alpine AS builder

# Install necessary dependencies for Next.js build and ffmpeg
RUN apk add --no-cache libc6-compat ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build process)
RUN npm install --frozen-lockfile

# Copy source code (excluding files in .dockerignore)
COPY . .

# Build the Next.js application
RUN npm run build

# ===== Runner Stage =====
FROM node:20-alpine AS runner

# Install necessary dependencies for runtime and ffmpeg
RUN apk add --no-cache libc6-compat ffmpeg

# Set working directory
WORKDIR /app

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --frozen-lockfile && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the production server
CMD ["npm", "start"]