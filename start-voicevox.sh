#!/bin/bash

echo "🎤 VOICEVOXサービス起動スクリプト"
echo "=================================="

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# VOICEVOXのポート
VOICEVOX_PORT=50021

# ポートの使用状況を確認
check_port() {
    if lsof -Pi :$VOICEVOX_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# VOICEVOXの稼働状況を確認
check_voicevox_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$VOICEVOX_PORT/version 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# 既にVOICEVOXが起動しているか確認
if check_voicevox_health; then
    echo -e "${GREEN}✓${NC} VOICEVOXサービスは既に起動しています (port: $VOICEVOX_PORT)"
    version=$(curl -s http://localhost:$VOICEVOX_PORT/version 2>/dev/null)
    echo -e "  バージョン: $version"
    exit 0
fi

# Dockerがインストールされているか確認
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Dockerがインストールされていません"
    echo ""
    echo "VOICEVOXを使用するには以下のいずれかの方法があります:"
    echo ""
    echo "1. Dockerをインストールする"
    echo "   - macOS: brew install docker"
    echo "   - Ubuntu: sudo apt-get install docker.io"
    echo "   - Windows: Docker Desktopをインストール"
    echo ""
    echo "2. VOICEVOXを直接インストールする"
    echo "   https://voicevox.hiroshiba.jp/ からダウンロード"
    echo ""
    echo "3. モックモードで開発を続ける"
    echo "   .env.localで NEXT_PUBLIC_MOCK_MODE=true を設定"
    echo ""
    exit 1
fi

# Docker Composeがインストールされているか確認
if ! command -v docker-compose &> /dev/null; then
    # docker composeコマンドを試す
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo -e "${YELLOW}⚠${NC} Docker Composeがインストールされていません"
        echo "  インストール: https://docs.docker.com/compose/install/"
        exit 1
    fi
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${YELLOW}🔄${NC} VOICEVOXサービスを起動しています..."

# Docker Composeでvoicevoxサービスのみを起動
$DOCKER_COMPOSE up -d voicevox

# 起動を待つ
echo -e "${YELLOW}⏳${NC} VOICEVOXサービスの起動を待っています..."
for i in {1..30}; do
    if check_voicevox_health; then
        echo -e "${GREEN}✓${NC} VOICEVOXサービスが正常に起動しました！"
        version=$(curl -s http://localhost:$VOICEVOX_PORT/version 2>/dev/null)
        echo -e "  バージョン: $version"
        echo ""
        echo "アプリケーションを起動するには:"
        echo "  npm run dev"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${RED}✗${NC} VOICEVOXサービスの起動に失敗しました"
echo ""
echo "トラブルシューティング:"
echo "1. Dockerが起動していることを確認"
echo "2. ポート$VOICEVOX_PORTが他のプロセスで使用されていないことを確認"
echo "3. docker-compose logs voicevox でログを確認"
echo ""
exit 1