/**
 * ========== PVBP Standard Pattern Library ==========
 * Protocol: Pragmatic Vertical Blocks Protocol v1.0.0
 * File: blocks/shared/lifecycle-patterns.ts
 *
 * Purpose: Standardized lifecycle patterns for temporal issue resolution
 * Usage: Copy patterns into blocks as needed, maintain self-containment
 *
 * Patterns implemented:
 * - useEffectOnce: Prevent StrictMode double execution
 * - useClientOnly: Detect client-side environment
 * - useAbortSafe: Manage AbortController lifecycle safely
 * - useMountedRef: Track component mount state
 * - useHydrated: Detect hydration completion
 */

import { useRef, useEffect, useState } from 'react';

/**
 * useEffectOnce - Prevent StrictMode double execution
 * Lines of code: 15
 * Implementation: useRef to track execution + useEffect
 *
 * Usage:
 * ```
 * useEffectOnce(() => {
 *   // This will only run once, even in StrictMode
 *   console.log('Effect ran once');
 * });
 * ```
 */
export const useEffectOnce = (effect: () => void | (() => void)) => {
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return effect();
    }
  }, []);
};

/**
 * useClientOnly - Detect client-side environment
 * Lines of code: 10
 * Implementation: typeof window check with useState
 *
 * Usage:
 * ```
 * const isClient = useClientOnly();
 * if (!isClient) return null; // Skip server-side rendering
 * ```
 */
export const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
};

/**
 * useAbortSafe - Manage AbortController lifecycle safely
 * Lines of code: 30
 * Implementation: Persistent ref + cleanup timing control
 *
 * Usage:
 * ```
 * const { getController, isMounted } = useAbortSafe();
 * const handleAsync = async () => {
 *   const controller = getController();
 *   try {
 *     const response = await fetch('/api/data', { signal: controller.signal });
 *     if (isMounted.current) {
 *       // Process response
 *     }
 *   } catch (error) {
 *     if (!controller.signal.aborted) {
 *       // Handle non-abort errors
 *     }
 *   }
 * };
 * ```
 */
export const useAbortSafe = () => {
  const abortRef = useRef<AbortController>();
  const isMounted = useRef(true);

  const getController = () => {
    if (!abortRef.current) {
      abortRef.current = new AbortController();
    }
    return abortRef.current;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Only abort if actually unmounting
      if (abortRef.current && !document.hidden) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { getController, isMounted };
};

/**
 * useMountedRef - Track component mount state
 * Lines of code: 10
 * Implementation: Simple ref tracking
 *
 * Usage:
 * ```
 * const mounted = useMountedRef();
 * const handleAsync = async () => {
 *   const result = await someAsyncOperation();
 *   if (mounted.current) {
 *     setState(result);
 *   }
 * };
 * ```
 */
export const useMountedRef = () => {
  const mounted = useRef(true);
  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);
  return mounted;
};

/**
 * useHydrated - Detect hydration completion
 * Lines of code: 12
 * Implementation: useState with useEffect
 *
 * Usage:
 * ```
 * const hydrated = useHydrated();
 * return hydrated ? <InteractiveComponent /> : <StaticComponent />;
 * ```
 */
export const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
};

/**
 * ========== Pattern Selection Matrix ==========
 *
 * Client Blocks: useClientOnly, useAbortSafe, useHydrated, useMountedRef
 * Server Blocks: None required - pure functions
 * Universal Blocks: useClientOnly, useEffectOnce, useHydrated
 *
 * ========== Implementation Guidelines ==========
 *
 * 1. Copy needed patterns directly into your vertical blocks
 * 2. Maintain self-containment - each block includes its own patterns
 * 3. Use appropriate patterns based on runtime category
 * 4. Test patterns in the target runtime environment
 * 5. Ensure patterns resolve your specific temporal issues
 */