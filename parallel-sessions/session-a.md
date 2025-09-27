# セッションA用指示書 - 環境クリーンアップとプロセス管理

## 1. プロジェクトコンテキスト

### プロジェクト概要
- **アプリケーション**: ずんだもんテキスト読み上げアプリ
- **アーキテクチャ**: FCIS+SMAC（Functional Core, Imperative Shell + State Machine as Code）
- **技術スタック**: Next.js 14.2.33, React 18, TypeScript, TailwindCSS 3.3.0, VOICEVOX API
- **開発環境**: Windows, Node.js

### 問題背景
- **現象**: 開発サーバーがハング、CSSスタイルが適用されない
- **根本原因**: 複数のNode.jsプロセスの競合、ファイルロックエラー
- **影響範囲**: 開発環境全体、ビルドプロセス
- **解決目標**: クリーンな環境で開発サーバーを正常起動

## 2. あなたの責任範囲

### 担当領域
- **レイヤー**: Shell層（環境・プロセス管理）
- **機能**: プロセスクリーンアップ、環境初期化
- **スコープ**: Node.jsプロセス管理、ビルドキャッシュクリア

### 編集対象ファイル
- `.next/` ディレクトリの削除と再生成
- `node_modules/.cache/` のクリア
- プロセス管理スクリプトの作成（必要に応じて）

## 3. 実行ステップ

### ステップ1: プロセスクリーンアップ
```bash
# Windowsコマンドで全Node.jsプロセスを終了
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
powershell -Command "Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force"
```

### ステップ2: ビルドキャッシュクリア
```bash
cd D:\Users\m_kazuya\quick_access\desktop\TSD2wonderful\zundayomiage\fcis-smac-app

# .nextディレクトリを完全削除
powershell -Command "Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue"

# node_modulesキャッシュクリア
powershell -Command "Remove-Item -Path 'node_modules\.cache' -Recurse -Force -ErrorAction SilentlyContinue"
```

### ステップ3: 検証
```bash
# プロセス確認
powershell -Command "Get-Process node -ErrorAction SilentlyContinue"

# ポート使用状況確認
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002
```

## 4. 完了基準
- [ ] 全Node.jsプロセスが終了
- [ ] .nextディレクトリが削除
- [ ] ポート3000-3002が解放
- [ ] エラーログなし

## 5. 出力仕様
他のセッションに以下を報告：
- プロセスクリーンアップ完了
- 使用可能ポート: 3000
- 環境状態: クリーン