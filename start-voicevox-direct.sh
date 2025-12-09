#!/bin/bash

# VOICEVOXを直接起動するスクリプト（Dockerを使わない場合）
echo "🎤 VOICEVOXエンジンを直接起動"
echo "================================"

# VOICEVOXのインストールディレクトリ（環境に応じて変更）
VOICEVOX_DIR="${VOICEVOX_DIR:-$HOME/voicevox_engine}"

if [ ! -d "$VOICEVOX_DIR" ]; then
    echo "⚠️ VOICEVOXがインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "1. https://github.com/VOICEVOX/voicevox_engine/releases から最新版をダウンロード"
    echo "2. 解凍して $VOICEVOX_DIR に配置"
    echo "3. または環境変数 VOICEVOX_DIR を設定"
    echo ""
    echo "代替案: Dockerを使用する場合は ./start-voicevox.sh を実行"
    exit 1
fi

cd "$VOICEVOX_DIR"

# CPU版を起動（--use_gpuフラグを外す）
echo "VOICEVOXエンジンを起動中..."
./run --host 0.0.0.0 --port 50021 --cors_policy_mode all