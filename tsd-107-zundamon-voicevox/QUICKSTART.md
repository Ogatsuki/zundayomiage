# TSD-107 クイックスタートガイド

## 最速で起動する方法（3ステップ）

### 1. プロジェクトディレクトリに移動
```bash
cd TSD2amazing/tsd-107-zundamon-voicevox
```

### 2. Dockerコンテナを起動
```bash
docker-compose up -d
```

### 3. ブラウザでアクセス
```
http://localhost:3000
```

約1分で起動完了します。

---

## 使い方

1. **話者を選択**
   - ずんだもん（デフォルト）
   - 四国めたん

2. **テキストを入力**
   - 最大1000文字まで

3. **音声を生成**
   - 「読み上げるのだ！」ボタンをクリック

4. **音声を再生/ダウンロード**
   - 再生ボタンで試聴
   - ダウンロードボタンでWAVファイル保存

---

## よくある質問

### Q: 起動しているか確認したい
```bash
docker ps
```
`tsd107_voicevox`と`tsd107_nextjs`が表示されればOK

### Q: 停止したい
```bash
docker-compose down
```

### Q: エラーが出た
```bash
# 完全リセット
docker-compose down -v
docker-compose up -d
```

### Q: ログを見たい
```bash
docker-compose logs -f
```

---

## Windows/Mac/Linux対応

全OS共通でDockerがインストールされていれば動作します。

**Dockerインストール:**
- Windows: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- Mac: [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
- Linux: `sudo apt install docker.io docker-compose`