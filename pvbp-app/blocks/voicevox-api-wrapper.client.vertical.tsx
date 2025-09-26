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

  useImperativeHandle(ref, () => {
    console.log('VoicevoxApiWrapper ref is being set up with API:', api);
    return api;
  });

  useEffect(() => {
    console.log('VoicevoxApiWrapper mounted, API instance:', api);

    if (props.onError) {
      api.onError = props.onError;
    }
    if (props.onProgress) {
      api.onProgress = props.onProgress;
    }

    return () => {
      console.log('VoicevoxApiWrapper unmounting');
    };
  }, [api, props.onError, props.onProgress]);

  return null;
});

VoicevoxApiWrapper.displayName = 'VoicevoxApiWrapper';

export default VoicevoxApiWrapper;