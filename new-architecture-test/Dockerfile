FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV VOICEVOX_API_URL=http://voicevox:50021
ENV NEXT_PUBLIC_VOICEVOX_API_URL=http://localhost:50021

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]