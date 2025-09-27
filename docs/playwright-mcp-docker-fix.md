# Playwright MCP Docker環境での問題と解決策

## 問題の詳細

### 1. ブラウザの不一致
- **問題**: DockerfileでChromiumをインストールしたが、Playwright MCPはGoogle Chromeを要求
- **エラー**: `Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome`
- **原因**: Playwright MCPはChromeにハードコードされている（Chromium非対応）

### 2. ブラウザインスタンスのロック
- **問題**: `Browser is already in use for /root/.cache/ms-playwright/mcp-chrome-xxx`
- **原因**: MCPサーバーがブラウザプロファイルをロックして再利用不可

## 解決策

### Dockerfile修正（必須）
```dockerfile
FROM node:22-slim

# 基本ツールのインストール
RUN apt-get update && apt-get install -y curl git \
    && npm install -g npm@latest \
    && npm install -g @anthropic-ai/claude-code \
    && rm -rf /var/lib/apt/lists/*

# Playwright用Google Chromeのインストール（MCP要件）
# 重要: chromiumではなくchromeを指定
RUN npx playwright install chrome \
    && npx playwright install-deps chrome

WORKDIR /app
CMD ["/bin/bash"]
```

### コンテナ起動時の追加手順（オプション）

1. **初回起動時のChrome確認**
```bash
# Chromeが正しくインストールされているか確認
google-chrome --version

# Playwrightのブラウザ一覧確認
npx playwright show-browsers
```

2. **ロック問題が発生した場合の対処**
```bash
# MCPキャッシュディレクトリの確認
ls ~/.cache/ms-playwright/

# ロックされたディレクトリの移動（緊急時のみ）
mv ~/.cache/ms-playwright/mcp-chrome-* ~/.cache/ms-playwright/backup/ 2>/dev/null || true
```

3. **環境変数の設定（必要に応じて）**
```bash
# Playwrightのブラウザパス指定
export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

## 重要なポイント

1. **ChromiumとChromeは別物**
   - Playwright本体: Chromium/Firefox/WebKit対応
   - Playwright MCP: Chrome専用実装

2. **MCPサーバーの制限**
   - ブラウザインスタンスの再利用不可
   - 一度ロックされると手動介入が必要

3. **Docker環境特有の考慮事項**
   - ビルド時のインストールと実行時の利用可能性
   - 依存ライブラリの完全性（deps指定が重要）

## テスト手順

```bash
# 1. コンテナビルド
docker build -t claude-app .

# 2. コンテナ起動
docker run -it --rm claude-app

# 3. アプリ起動
cd fcis-smac-app && npm run dev

# 4. Playwright MCP動作確認
# Claude Code内でmcp__playwright__browser_navigateツールを使用
```

## トラブルシューティング

### Q: それでもChromeが見つからない場合
A: 強制的に再インストール
```bash
npx playwright install --force chrome
```

### Q: ブラウザロック解除方法
A: MCPキャッシュクリア
```bash
rm -rf ~/.cache/ms-playwright/mcp-chrome-*
```

### Q: 依存ライブラリ不足エラー
A: 追加ライブラリインストール
```bash
apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2
```