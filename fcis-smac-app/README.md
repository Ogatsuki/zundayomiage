# ずんだもん音声生成アプリ

## 起動方法（Docker Composeのみ）

### 前提条件
- Docker Desktop for Windows がインストールされていること

### 起動
```bash
cd fcis-smac-app
npm run docker:up
```

### 停止
```bash
npm run docker:down
```

### ログ確認
```bash
npm run docker:logs
```

## アクセスURL
- アプリケーション: http://localhost:3000
- VoiceVox API: http://localhost:50021

## 重要事項
- **ローカル環境での`npm run dev`は使用しません**
- すべてDockerコンテナ内で実行されます
- Windowsのプロセス管理問題を完全に回避する設計です