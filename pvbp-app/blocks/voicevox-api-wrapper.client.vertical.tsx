'use client';

/**
 * ========== VOICEVOX API Wrapper Component ==========
 * PVBP Protocol v1.0.0 Compliant
 * Runtime: client
 */

import { forwardRef, useImperativeHandle, useEffect } from 'react';
import VoicevoxApiVertical from './voicevox-api.client.vertical';

export const RUNTIME = 'client' as const;

interface VoicevoxApiWrapperProps {
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

const VoicevoxApiWrapper = forwardRef<any, VoicevoxApiWrapperProps>((props, ref) => {
  const api = VoicevoxApiVertical();

  useImperativeHandle(ref, () => api);

  useEffect(() => {
    if (props.onError) {
      api.onError = props.onError;
    }
    if (props.onProgress) {
      api.onProgress = props.onProgress;
    }
  }, [api, props.onError, props.onProgress]);

  return null;
});

VoicevoxApiWrapper.displayName = 'VoicevoxApiWrapper';

export default VoicevoxApiWrapper;