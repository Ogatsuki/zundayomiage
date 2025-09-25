/**
 * ========== PVBP Block Contract ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 *
 * Purpose: Base contract interface for all PVBP-compliant blocks
 * Usage: Extend this contract for specific block implementations
 */

import { RuntimeType } from './index';

export interface PVBPBlockContract {
  /**
   * Mandatory runtime declaration
   * Must match filename pattern: [feature].[runtime].vertical.tsx
   */
  readonly RUNTIME: RuntimeType;

  /**
   * Block metadata for development tools
   */
  readonly metadata?: {
    name: string;
    version: string;
    description: string;
    dependencies?: string[];
    patterns_used?: string[];
  };

  /**
   * Error handling strategy
   */
  readonly error_handling?: {
    strategy: 'graceful_degradation' | 'user_feedback' | 'silent_fallback';
    fallback_component?: React.ComponentType;
  };

  /**
   * Performance requirements
   */
  readonly performance?: {
    max_render_time_ms?: number;
    max_memory_usage_mb?: number;
    priority: 'high' | 'medium' | 'low';
  };
}