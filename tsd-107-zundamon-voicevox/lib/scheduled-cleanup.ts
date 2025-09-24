/**
 * Scheduled cleanup utilities for automatic maintenance tasks
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CleanupResult } from '../types/memory';
import { cleanupOldTempFiles } from './audio-merger';
import { MemoryManager } from './memory-manager';

/**
 * Scheduled cleanup manager for periodic maintenance
 */
export class ScheduledCleanup {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static memoryMonitorInterval: NodeJS.Timeout | null = null;
  private static isRunning: boolean = false;

  /**
   * Start scheduled cleanup tasks
   * @param cleanupIntervalMs Interval for temp file cleanup (default: 1 hour)
   * @param memoryMonitorIntervalMs Interval for memory monitoring (default: 1 minute)
   */
  static start(
    cleanupIntervalMs: number = 3600000,  // 1 hour
    memoryMonitorIntervalMs: number = 60000  // 1 minute
  ): void {
    if (this.isRunning) {
      console.warn('Scheduled cleanup is already running');
      return;
    }

    console.log('Starting scheduled cleanup tasks...');
    this.isRunning = true;

    // Perform initial cleanup
    this.performCleanup().then(result => {
      console.log('Initial cleanup completed:', {
        filesDeleted: result.filesDeleted,
        bytesFreed: MemoryManager.formatBytes(result.bytesFreed)
      });
    }).catch(error => {
      console.error('Initial cleanup failed:', error);
    });

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        const result = await this.performCleanup();
        if (result.filesDeleted > 0 || process.env.NODE_ENV === 'development') {
          console.log('Scheduled cleanup completed:', {
            timestamp: new Date().toISOString(),
            filesDeleted: result.filesDeleted,
            bytesFreed: MemoryManager.formatBytes(result.bytesFreed)
          });
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, cleanupIntervalMs);

    // Start memory monitoring
    this.memoryMonitorInterval = MemoryManager.startMonitoring(memoryMonitorIntervalMs);

    console.log('Scheduled cleanup started:', {
      cleanupInterval: `${cleanupIntervalMs / 1000} seconds`,
      memoryMonitorInterval: `${memoryMonitorIntervalMs / 1000} seconds`
    });
  }

  /**
   * Stop scheduled cleanup tasks
   */
  static stop(): void {
    if (!this.isRunning) {
      console.warn('Scheduled cleanup is not running');
      return;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    this.isRunning = false;
    console.log('Scheduled cleanup stopped');
  }

  /**
   * Perform cleanup of temporary files
   * @returns Cleanup result with statistics
   */
  private static async performCleanup(): Promise<CleanupResult> {
    const errors: string[] = [];
    let filesDeleted = 0;
    let bytesFreed = 0;

    try {
      // Clean up old audio merger temp files
      await cleanupOldTempFiles(3600000); // Clean files older than 1 hour

      // Clean up our custom temp directory if exists
      const customTempDir = path.join(os.tmpdir(), 'voicevox-temp');

      try {
        const exists = await fs.access(customTempDir).then(() => true).catch(() => false);
        if (exists) {
          const files = await fs.readdir(customTempDir);

          for (const file of files) {
            const filePath = path.join(customTempDir, file);
            try {
              const stats = await fs.stat(filePath);
              const ageMs = Date.now() - stats.mtime.getTime();

              // Delete files older than 1 hour
              if (ageMs > 3600000) {
                await fs.unlink(filePath);
                filesDeleted++;
                bytesFreed += stats.size;
              }
            } catch (error) {
              errors.push(`Failed to process ${file}: ${error}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Custom temp directory cleanup failed: ${error}`);
      }

      // Additional cleanup for specific patterns
      const tempDir = os.tmpdir();
      const patterns = [
        'voicevox_',
        'audio_temp_',
        'merge_temp_',
        'wav_chunk_'
      ];

      try {
        const files = await fs.readdir(tempDir);

        for (const file of files) {
          if (!patterns.some(p => file.startsWith(p))) continue;

          const filePath = path.join(tempDir, file);
          try {
            const stats = await fs.stat(filePath);
            const ageMs = Date.now() - stats.mtime.getTime();

            // Delete files older than 1 hour
            if (ageMs > 3600000) {
              await fs.unlink(filePath);
              filesDeleted++;
              bytesFreed += stats.size;
            }
          } catch (error) {
            // Silently skip files that can't be accessed
          }
        }
      } catch (error) {
        errors.push(`System temp directory cleanup failed: ${error}`);
      }

    } catch (error) {
      errors.push(`Cleanup failed: ${error}`);
    }

    // Log errors if any
    if (errors.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('Cleanup errors:', errors);
    }

    return {
      filesDeleted,
      bytesFreed,
      errors
    };
  }

  /**
   * Get cleanup status
   * @returns Whether scheduled cleanup is running
   */
  static isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Perform immediate cleanup (can be called manually)
   * @returns Cleanup result
   */
  static async cleanupNow(): Promise<CleanupResult> {
    console.log('Performing immediate cleanup...');
    const result = await this.performCleanup();

    // Also trigger garbage collection if available
    MemoryManager.forceGarbageCollection();

    return result;
  }
}