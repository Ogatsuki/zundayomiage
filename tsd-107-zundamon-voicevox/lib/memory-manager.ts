/**
 * Memory management utilities for server-side operations
 */

import { MemoryStatus } from '../types/memory';

/**
 * Memory manager class for monitoring and managing server memory usage
 */
export class MemoryManager {
  // Memory thresholds (in bytes)
  private static readonly MEMORY_THRESHOLD = 500 * 1024 * 1024;  // 500MB warning threshold
  private static readonly CRITICAL_THRESHOLD = 800 * 1024 * 1024; // 800MB critical threshold

  /**
   * Check current memory usage and return status
   * @returns Memory status with usage information and flags
   */
  static checkMemoryUsage(): MemoryStatus {
    const memUsage = process.memoryUsage();

    // Calculate usage percentage based on heap
    const usagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Check if memory usage is high or critical
    const isHighUsage = memUsage.heapUsed > this.MEMORY_THRESHOLD;
    const isCritical = memUsage.heapUsed > this.CRITICAL_THRESHOLD;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      isHighUsage,
      isCritical,
      usagePercentage
    };
  }

  /**
   * Force garbage collection if available
   * Note: Requires Node.js to be started with --expose-gc flag
   */
  static forceGarbageCollection(): void {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;

      console.log('Garbage collection performed:', {
        before: `${(before / 1048576).toFixed(2)} MB`,
        after: `${(after / 1048576).toFixed(2)} MB`,
        freed: `${(freed / 1048576).toFixed(2)} MB`
      });
    } else {
      console.warn('Garbage collection is not exposed. Run Node.js with --expose-gc flag to enable.');
    }
  }

  /**
   * Log current memory statistics
   */
  static logMemoryStats(): void {
    const status = this.checkMemoryUsage();

    const stats = {
      timestamp: new Date().toISOString(),
      heapUsed: `${(status.heapUsed / 1048576).toFixed(2)} MB`,
      heapTotal: `${(status.heapTotal / 1048576).toFixed(2)} MB`,
      rss: `${(status.rss / 1048576).toFixed(2)} MB`,
      external: `${(status.external / 1048576).toFixed(2)} MB`,
      arrayBuffers: `${(status.arrayBuffers / 1048576).toFixed(2)} MB`,
      usagePercentage: `${status.usagePercentage.toFixed(2)}%`,
      status: status.isCritical ? 'CRITICAL' : status.isHighUsage ? 'WARNING' : 'NORMAL'
    };

    if (status.isCritical) {
      console.error('CRITICAL: Memory usage is critically high', stats);
    } else if (status.isHighUsage) {
      console.warn('WARNING: Memory usage is high', stats);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('Memory status:', stats);
    }
  }

  /**
   * Monitor memory usage and trigger actions if needed
   * @param interval Monitoring interval in milliseconds (default: 60000)
   * @returns Interval ID that can be used to stop monitoring
   */
  static startMonitoring(interval: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const status = this.checkMemoryUsage();

      // Log stats
      this.logMemoryStats();

      // If critical, attempt garbage collection
      if (status.isCritical && global.gc) {
        console.warn('Critical memory usage detected, forcing garbage collection...');
        this.forceGarbageCollection();
      }
    }, interval);
  }

  /**
   * Stop memory monitoring
   * @param intervalId The interval ID returned by startMonitoring
   */
  static stopMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('Memory monitoring stopped');
  }

  /**
   * Get human-readable memory size
   * @param bytes Memory size in bytes
   * @returns Formatted string with appropriate unit
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Declare global.gc type
declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}