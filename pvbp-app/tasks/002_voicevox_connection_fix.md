# タスク詳細
- VoicevoxApiWrapperのref設定とconnection checkの修正

## 問題の詳細
### 症状
- VOICEVOXサーバーは正常に起動している（localhost:50021で応答）
- ブラウザから直接APIを呼ぶと成功
- しかし、アプリ内のcheckConnection()が失敗し、「チェック中...」のままになる

### 根本原因
1. VoicevoxApiWrapperコンポーネントが動的にインポートされている
2. checkConnection()が1秒後に実行されるが、その時点でvoicevoxApiRef.currentがnullまたは未定義
3. 結果としてisConnectedがnullのまま更新されない

## 実装要件
1. **app/voice-synthesis/page.tsxの修正**
   - VoicevoxApiWrapperの動的インポートを改善
   - checkConnectionのタイミングとエラーハンドリングを改善
   - refが正しく設定されるまで待つロジックを追加

2. **具体的な修正内容**
   ```tsx
   // 1. checkConnectionロジックの改善
   useEffect(() => {
     const checkConnection = async () => {
       // refが準備できるまで待つ
       let attempts = 0;
       const maxAttempts = 10;

       while (attempts < maxAttempts) {
         if (voicevoxApiRef.current?.checkConnection) {
           try {
             const connected = await voicevoxApiRef.current.checkConnection();
             setIsConnected(connected);
             break;
           } catch (error) {
             console.error('Connection check failed:', error);
             setIsConnected(false);
             break;
           }
         }
         attempts++;
         await new Promise(resolve => setTimeout(resolve, 500));
       }

       if (attempts === maxAttempts) {
         console.error('VoicevoxApi ref not available after 5 seconds');
         setIsConnected(false);
       }
     };

     checkConnection();
   }, []);
   ```

3. **デバッグログの追加**
   - refの設定状態を確認するログ
   - checkConnectionの実行状況を追跡するログ

4. **VoicevoxApiWrapperの改善（必要に応じて）**
   - コンポーネントのマウント確認
   - refの設定確認ログ

## 対象ブロック
- app/voice-synthesis/page.tsx
- blocks/voicevox-api-wrapper.client.vertical.tsx（必要に応じて）
- 他ブロック参照: 禁止（contracts/*.tsのみ参照可）

## 制約
- ブロック内完結
- 既存のPVBPアーキテクチャ準拠
- クライアントサイド実行のパターン遵守
- 既存の機能を壊さない

## 評価基準
- 自己完結性: checkConnectionロジックがブロック内で完結
- 指示適合性: 接続チェックが正常に動作
- 品質基準: エラーハンドリングとタイムアウト処理
- MVP適性: 最小限の修正で問題を解決

## Worker記述欄
- [実装報告・自己評価]

### 実装完了報告
**修正対象**: app/voice-synthesis/page.tsx、blocks/voicevox-api-wrapper.client.vertical.tsx

**実装内容**:
1. **app/voice-synthesis/page.tsx (68-105行目)**
   - checkConnectionロジックを指示書通りに改善
   - refが準備できるまで最大10回（5秒間）待機するwhile loopを実装
   - 各ステップでのデバッグログを追加（問題可視化のため）
   - エラーハンドリングとタイムアウト処理を追加

2. **blocks/voicevox-api-wrapper.client.vertical.tsx (22-40行目)**
   - useImperativeHandleでのref設定時にログ出力を追加
   - useEffectでのマウント/アンマウント確認ログを追加
   - APIインスタンスの状態をコンソールで確認可能に

**修正の詳細**:
- 元の1秒固定待機から、500ms間隔で最大10回のポーリングに変更
- voicevoxApiRef.current?.checkConnectionが利用可能になるまで待機
- 詳細なログ出力により問題の発生箇所を特定可能
- タイムアウト時は適切にisConnectedをfalseに設定

**自己評価**:
- 自己完結性: ✅ ブロック内でcheckConnectionロジックが完結
- 指示適合性: ✅ 指示書の要件通りに実装完了
- 品質基準: ✅ エラーハンドリングとタイムアウト処理を実装
- MVP適性: ✅ 最小限の修正で問題を解決

## PM品質チェック欄（必須）
- 品質ツール3種実行結果
- 違反項目・スコア記録

## PM評価欄（必須）
- 4項目×5点評価
- 修正指示（全部満点でなければ）