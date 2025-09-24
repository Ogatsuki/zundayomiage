/**
 * 同時処理制限機能のテストスクリプト
 * 複数のリクエストを同時送信して制限が正しく機能するかテスト
 */

const API_URL = 'http://localhost:3000/api/voicevox/generate';

async function sendRequest(requestId) {
  const startTime = Date.now();

  try {
    console.log(`Request ${requestId}: Starting...`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `テストリクエスト ${requestId} です。`,
        speaker: 3 // Zundamon
      }),
    });

    const duration = Date.now() - startTime;

    if (response.status === 429) {
      console.log(`Request ${requestId}: ❌ Rate limited (429) - ${duration}ms`);
      const errorData = await response.json();
      console.log(`Request ${requestId}: Error message: ${errorData.error}`);
      return { requestId, status: 429, duration, success: false };
    } else if (response.ok) {
      const audioData = await response.arrayBuffer();
      console.log(`Request ${requestId}: ✅ Success - ${duration}ms, Audio size: ${audioData.byteLength} bytes`);
      return { requestId, status: 200, duration, success: true, audioSize: audioData.byteLength };
    } else {
      console.log(`Request ${requestId}: ❌ Error ${response.status} - ${duration}ms`);
      const errorData = await response.json();
      console.log(`Request ${requestId}: Error message: ${errorData.error}`);
      return { requestId, status: response.status, duration, success: false };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`Request ${requestId}: ❌ Network error - ${duration}ms`);
    console.log(`Request ${requestId}: Error: ${error.message}`);
    return { requestId, status: 0, duration, success: false, error: error.message };
  }
}

async function testConcurrentLimit() {
  console.log('=== 同時処理制限テスト開始 ===');
  console.log('4つのリクエストを同時送信（制限: 3）');
  console.log('期待結果: 3つが成功、1つが429エラー');
  console.log('');

  // 4つのリクエストを同時送信
  const promises = [];
  for (let i = 1; i <= 4; i++) {
    promises.push(sendRequest(i));
  }

  // 全てのリクエストが完了するまで待機
  const results = await Promise.all(promises);

  console.log('');
  console.log('=== テスト結果 ===');

  const successCount = results.filter(r => r.success).length;
  const rateLimitedCount = results.filter(r => r.status === 429).length;
  const errorCount = results.filter(r => !r.success && r.status !== 429).length;

  console.log(`成功: ${successCount}件`);
  console.log(`制限エラー(429): ${rateLimitedCount}件`);
  console.log(`その他エラー: ${errorCount}件`);

  console.log('');
  console.log('詳細結果:');
  results.forEach(result => {
    const status = result.success ? '✅ 成功' :
                   result.status === 429 ? '⚠️  制限' : '❌ エラー';
    console.log(`  Request ${result.requestId}: ${status} (${result.duration}ms)`);
  });

  console.log('');

  // テスト判定
  if (rateLimitedCount === 1 && successCount === 3) {
    console.log('🎉 テスト成功: 同時処理制限が正しく機能しています');
  } else if (successCount === 4 && rateLimitedCount === 0) {
    console.log('⚠️  テスト注意: 全てのリクエストが成功しました（VOICEVOXが高速、または制限が機能していない可能性）');
  } else {
    console.log('❌ テスト失敗: 期待される結果と異なります');
  }
}

// メイン実行
testConcurrentLimit().catch(console.error);