# TSD-107 実装計画書

## Phase 0: 緊急修正実装 (35分)

### 実装対象問題
- ✅ **問題7**: プログレス表示追加 (15分)
- ✅ **問題8&11**: ffmpeg Docker修正 (15分)
- ✅ **問題9**: 英語表示削除 (5分)

### 実装順序
1. **問題9** → 最も簡単、混乱要因排除
2. **問題8&11** → 機能ブロッカー解決
3. **問題7** → UX改善

---

## Phase 1: CPU最適化実装 (2時間)

### 実装内容
- ✅ **タイムアウト延長**: 10秒 → 30秒
- ✅ **長文分割処理**: 800文字超時の自動分割
- ✅ **エラーハンドリング強化**: OCR・API統合
- ✅ **パフォーマンス監視**: 処理時間・リクエスト数計測

---

## 現在の状況確認

### Git状態
```
ブランチ: tsd-107 (originより5コミット先行)
未ステージ変更:
- app/api/voicevox/generate/route.ts (修正済み)
- components/AudioPlayer.tsx (修正済み)
- package.json/package-lock.json (依存関係追加済み)
- lib/audio-converter.ts (新規作成済み)

実装準備完了状態
```

### Docker環境
```
✅ tsd107_voicevox: voicevox_engine:cpu 稼働中
✅ tsd107_nextjs: Next.js 稼働中
準備: Dockerfile修正 → ffmpeg追加
```

### 実装準備状況
- [x] ffmpeg-static, fluent-ffmpeg インストール済み
- [x] audio-converter.ts 実装済み
- [x] MP3変換ロジック組み込み済み
- [x] speaker ID修正済み
- [x] 状態管理修正済み
- [ ] ffmpeg Docker環境対応
- [ ] プログレス表示
- [ ] 英語UI削除
- [ ] タイムアウト延長

---

## 次回実装タスク

### 即時実装可能
1. ✅ **Dockerfile修正** (ffmpeg追加)
2. ✅ **プログレス表示コンポーネント**
3. ✅ **英語表示削除**
4. ✅ **fetch timeout延長**

### 実装後テスト
- [ ] 800文字テキスト生成 (< 30秒)
- [ ] OCR → 音声生成 (エラーなし)
- [ ] MP3ダウンロード (動作確認)
- [ ] プログレス表示 (視覚確認)

**実装準備完了 - 開始可能**