FROM node:22-slim

# Node.js LTSのインストール
RUN apt-get update && apt-get install -y curl git \
    && npm install -g npm@latest \
    && npm install -g @anthropic-ai/claude-code \
    && npm install -g @google/gemini-cli \
    && rm -rf /var/lib/apt/lists/*

# Playwright用Google Chromeのインストール（MCP要件）
# Chromiumではなく、Playwright MCPが要求するChromeを明示的にインストール
RUN npx playwright install chrome \
    && npx playwright install-deps chrome

WORKDIR /app

RUN useradd -m claudeuser
RUN chown -R claudeuser:claudeuser /app
USER claudeuser

CMD ["/bin/bash"]