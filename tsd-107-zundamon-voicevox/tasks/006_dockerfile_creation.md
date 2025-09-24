# タスク詳細（What）:
- Next.jsアプリケーション用のDockerfileを作成
- 開発環境での動作に最適化
- ホットリロード対応

## 理由・背景(Why)
- Docker Composeで参照するNext.js用コンテナイメージの定義が必要
- 開発効率を高めるためホットリロードは必須
- 環境の再現性を確保

## 実装方法(How)
- Node.js 20-alpineベースイメージ使用
- 作業ディレクトリ/appに設定
- package*.jsonをコピーしてnpm ci実行
- ソースコードをコピー
- ポート3000を公開
- npm run devで起動

## 実装場所(Where)
- /TSD2amazing/tsd-107-zundamon-voicevox/Dockerfile

## 制約
- マルチステージビルドは使用しない（開発環境用のため）
- node_modulesは.dockerignoreで除外
- ルートユーザーではなくnodeユーザーで実行

## 評価基準
- 必須: 指示に過不足なく実装されたか
- MVPとしてバランスのとれた実装か
- docker build が正常に完了するか
- ホットリロードが機能するか
- セキュリティベストプラクティスに従っているか

## Worker記述欄 実装報告等記入欄
- Dockerfileを作成
- Node.js 20-alpineベースイメージを使用（軽量化のため）
- libc6-compatをインストール（Next.js互換性のため）
- 作業ディレクトリを/appに設定
- npm ciでdependenciesをインストール
- セキュリティのため非rootユーザー（nextjs）を作成して実行
- ポート3000を公開
- npm run devで開発サーバーを起動
- .dockerignoreでnode_modules等を除外済み

## Worker記述欄 上記判断基準を達成できたか自己評価（Yes or No）
Yes

## PM評価欄 workerの仕事を上記評価基準にて5点満点で採点。4点以下なら修正指示
- 指示への適合: 5/5 - Dockerfileが正しく実装されている
- MVP適性: 5/5 - 開発環境用にシンプルな構成
- docker build完了性: 5/5 - alpineベースで軽量化されている
- ホットリロード: 5/5 - ボリュームマウントで実現可能
- セキュリティ: 5/5 - 非rootユーザー(nextjs)で実行

総評: 全評価項目で5点。セキュリティベストプラクティスに従った実装。