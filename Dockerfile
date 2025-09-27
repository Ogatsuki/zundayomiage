FROM node:22-slim

# Node.js LTSのインストール
RUN apt-get update && apt-get install -y curl git \
    && npm install -g npm@latest \
    && npm install -g @anthropic-ai/claude-code \
    && npm install -g @google/gemini-cli \
    && rm -rf /var/lib/apt/lists/*

# Playwright Chromiumのインストール（最軽量ブラウザ）
RUN npx playwright install chromium \
    && npx playwright install-deps chromium

WORKDIR /app

CMD ["/bin/bash"]