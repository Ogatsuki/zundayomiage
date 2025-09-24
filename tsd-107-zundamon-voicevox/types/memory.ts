/**
 * Type definitions for memory management utilities
 */

/**
 * Memory status information
 */
export interface MemoryStatus {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  isHighUsage: boolean;
  isCritical: boolean;
  usagePercentage: number;
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  filesDeleted: number;
  bytesFreed: number;
  errors: string[];
}

/**
 * Memory threshold configuration
 */
export interface MemoryThresholds {
  warning: number;  // Bytes
  critical: number; // Bytes
}