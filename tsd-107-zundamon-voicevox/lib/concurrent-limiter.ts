/**
 * ConcurrentLimiter - メモリベースの同時処理制限機能
 * VOICEVOX音声生成APIでの同時処理数を制限し、サーバークラッシュを防止
 */
export class ConcurrentLimiter {
  private static activeRequests = new Map<string, number>();
  private static readonly MAX_CONCURRENT = 3;

  /**
   * 指定されたエンドポイントの処理権を取得する
   * @param endpoint 処理対象のエンドポイント識別子
   * @returns 処理権が取得できた場合true、制限に達している場合false
   */
  static async acquire(endpoint: string): Promise<boolean> {
    const currentCount = this.activeRequests.get(endpoint) || 0;

    if (currentCount >= this.MAX_CONCURRENT) {
      return false;
    }

    this.activeRequests.set(endpoint, currentCount + 1);
    return true;
  }

  /**
   * 指定されたエンドポイントの処理権を解放する
   * @param endpoint 処理対象のエンドポイント識別子
   */
  static release(endpoint: string): void {
    const currentCount = this.activeRequests.get(endpoint) || 0;

    if (currentCount <= 1) {
      this.activeRequests.delete(endpoint);
    } else {
      this.activeRequests.set(endpoint, currentCount - 1);
    }
  }

  /**
   * デバッグ用: 現在のアクティブリクエスト数を取得
   * @param endpoint 処理対象のエンドポイント識別子
   * @returns 現在のアクティブリクエスト数
   */
  static getActiveCount(endpoint: string): number {
    return this.activeRequests.get(endpoint) || 0;
  }

  /**
   * デバッグ用: 最大同時処理数を取得
   * @returns 最大同時処理数
   */
  static getMaxConcurrent(): number {
    return this.MAX_CONCURRENT;
  }
}