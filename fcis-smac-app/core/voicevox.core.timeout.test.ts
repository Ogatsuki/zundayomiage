/**
 * タイムアウト機能のテストファイル
 * タスクID: 0927-1500-05 の受入条件検証
 */

import {
  createDefaultNetworkConfig,
  createTimeoutAbortController,
  createTimeoutError,
  isTimeoutError,
  type TimeoutConfig,
  type NetworkConfig,
  type TimeoutError
} from './voicevox.core';

// ===== 受入条件テスト =====

/**
 * 受入条件1: 指定時間でタイムアウトする
 */
const testTimeoutOccurs = async (): Promise<boolean> => {
  console.log('Test 1: 指定時間でタイムアウトする');

  const timeoutMs = 100; // 100ms でテスト
  const timeoutController = createTimeoutAbortController(timeoutMs);

  const startTime = Date.now();

  return new Promise((resolve) => {
    timeoutController.controller.signal.addEventListener('abort', () => {
      const elapsedTime = Date.now() - startTime;
      const isWithinExpectedRange = elapsedTime >= timeoutMs && elapsedTime < timeoutMs + 50; // 50ms の余裕

      console.log(`- タイムアウト発生時間: ${elapsedTime}ms (期待値: ${timeoutMs}ms)`);
      console.log(`- 結果: ${isWithinExpectedRange ? 'PASS' : 'FAIL'}`);

      timeoutController.cleanup();
      resolve(isWithinExpectedRange);
    });
  });
};

/**
 * 受入条件2: AbortControllerが正しく動作
 */
const testAbortControllerWorks = (): boolean => {
  console.log('Test 2: AbortControllerが正しく動作');

  const timeoutController = createTimeoutAbortController(1000);

  // 初期状態では abort されていない
  const initialState = !timeoutController.controller.signal.aborted;

  // 手動で abort する
  timeoutController.controller.abort();

  // abort 後は aborted が true になる
  const afterAbortState = timeoutController.controller.signal.aborted;

  timeoutController.cleanup();

  const isWorking = initialState && afterAbortState;
  console.log(`- 初期状態 (aborted = false): ${initialState}`);
  console.log(`- abort後 (aborted = true): ${afterAbortState}`);
  console.log(`- 結果: ${isWorking ? 'PASS' : 'FAIL'}`);

  return isWorking;
};

/**
 * 受入条件3: タイムアウトエラーが識別可能
 */
const testTimeoutErrorIdentification = (): boolean => {
  console.log('Test 3: タイムアウトエラーが識別可能');

  // タイムアウトエラーの生成と識別
  const audioQueryError = createTimeoutError('AUDIO_QUERY', 30000);
  const synthesisError = createTimeoutError('SYNTHESIS', 60000);

  // 通常のエラー
  const normalError = new Error('Normal error');
  const abortError = new Error('AbortError');
  abortError.name = 'AbortError';

  const timeoutKeywordError = new Error('Request timeout occurred');

  // タイムアウトエラー識別テスト
  const isAudioQueryTimeoutCorrect = audioQueryError.type === 'TIMEOUT_ERROR' &&
                                     audioQueryError.operation === 'AUDIO_QUERY' &&
                                     audioQueryError.timeoutMs === 30000;

  const isSynthesisTimeoutCorrect = synthesisError.type === 'TIMEOUT_ERROR' &&
                                    synthesisError.operation === 'SYNTHESIS' &&
                                    synthesisError.timeoutMs === 60000;

  const isNormalErrorNotTimeout = !isTimeoutError(normalError);
  const isAbortErrorTimeout = isTimeoutError(abortError);
  const isTimeoutKeywordError = isTimeoutError(timeoutKeywordError);

  const allTestsPass = isAudioQueryTimeoutCorrect &&
                       isSynthesisTimeoutCorrect &&
                       isNormalErrorNotTimeout &&
                       isAbortErrorTimeout &&
                       isTimeoutKeywordError;

  console.log(`- AudioQuery タイムアウトエラー: ${isAudioQueryTimeoutCorrect}`);
  console.log(`- Synthesis タイムアウトエラー: ${isSynthesisTimeoutCorrect}`);
  console.log(`- 通常エラー判定: ${isNormalErrorNotTimeout}`);
  console.log(`- AbortError判定: ${isAbortErrorTimeout}`);
  console.log(`- タイムアウトキーワード判定: ${isTimeoutKeywordError}`);
  console.log(`- 結果: ${allTestsPass ? 'PASS' : 'FAIL'}`);

  return allTestsPass;
};

/**
 * 設定関数のテスト
 */
const testConfigFunctions = (): boolean => {
  console.log('Test 4: 設定関数のテスト');

  const defaultConfig = createDefaultNetworkConfig();

  const isDefaultConfigCorrect =
    defaultConfig.timeout.audioQueryTimeout === 30_000 &&
    defaultConfig.timeout.synthesisTimeout === 60_000 &&
    defaultConfig.retryCount === 3 &&
    defaultConfig.retryDelay === 1000;

  console.log(`- デフォルト設定: ${JSON.stringify(defaultConfig, null, 2)}`);
  console.log(`- 結果: ${isDefaultConfigCorrect ? 'PASS' : 'FAIL'}`);

  return isDefaultConfigCorrect;
};

/**
 * 全テストを実行
 */
const runAllTests = async (): Promise<void> => {
  console.log('=== VOICEVOX Core タイムアウト機能テスト ===\n');

  const results: boolean[] = [];

  // 非同期テスト
  results.push(await testTimeoutOccurs());
  console.log();

  // 同期テスト
  results.push(testAbortControllerWorks());
  console.log();

  results.push(testTimeoutErrorIdentification());
  console.log();

  results.push(testConfigFunctions());
  console.log();

  // 結果集計
  const passCount = results.filter(r => r).length;
  const totalCount = results.length;

  console.log('=== テスト結果 ===');
  console.log(`パス: ${passCount}/${totalCount}`);
  console.log(`総合結果: ${passCount === totalCount ? 'ALL PASS ✅' : 'SOME FAILED ❌'}`);

  if (passCount === totalCount) {
    console.log('\n🎉 タイムアウト機能の実装が正常に完了しました！');
    console.log('受入条件:');
    console.log('✅ 指定時間でタイムアウトする');
    console.log('✅ AbortControllerが正しく動作');
    console.log('✅ タイムアウトエラーが識別可能');
  }
};

// テスト実行（Node.js環境での実行用）
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  testTimeoutOccurs,
  testAbortControllerWorks,
  testTimeoutErrorIdentification,
  testConfigFunctions
};