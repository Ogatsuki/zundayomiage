import { useMachine } from '@xstate/react';
import { appMachine } from '../state/app.machine';
import * as ocrCore from '../core/ocr.core';
import * as ttsCore from '../core/tts.core';

export function useAppMachine() {
  const [state, send] = useMachine(appMachine);

  const handleOCRUpload = async (file: File) => {
    const validation = ocrCore.validateOCRFile(file);
    if (!validation.isValid) {
      send({ type: 'ERROR', message: validation.errors.join(', '), recoverable: true });
      return;
    }

    send({ type: 'START_OCR', file });
    send({ type: 'OCR_PROCESS' });

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const normalizedText = ocrCore.normalizeOCRText(data.data.normalizedText);
        send({ type: 'OCR_SUCCESS', text: normalizedText });
      } else {
        throw new Error(data.error || 'OCR処理に失敗しました');
      }
    } catch (error) {
      send({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'OCR処理エラー',
        recoverable: true
      });
    }
  };

  const handleTTSSynthesize = async (text: string, speakerId: number) => {
    const validation = ttsCore.validateTTSRequest(text, speakerId);
    if (!validation.isValid) {
      send({ type: 'ERROR', message: validation.errors.join(', '), recoverable: true });
      return;
    }

    send({ type: 'START_TTS', text, speakerId });
    send({ type: 'CHUNK_START' });

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speakerId })
      });

      const data = await response.json();
      if (response.ok && data.audio) {
        // MP3形式でBlob生成（MIMEタイプ変更）
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }  // WAVからMP3に変更
        );
        const audioUrl = URL.createObjectURL(audioBlob);

        // ファイル名の生成（デフォルト値）
        const fileName = data.fileName || `${speakerId === 3 ? 'zundamon' : 'metan'}_${Date.now()}.mp3`;

        send({
          type: 'TTS_SUCCESS',
          audioUrl,
          fileName,
          format: 'mp3'
        });
      } else {
        // エラーコードに基づいて具体的なメッセージを表示
        let errorMessage = 'TTS処理に失敗しました';
        if (data.error?.code === 'CONNECTION_ERROR') {
          errorMessage = 'VOICEVOXサービスに接続できません。サービスが起動していることを確認してください。';
        } else if (data.error?.code === 'TIMEOUT_ERROR') {
          errorMessage = 'VOICEVOXサービスへのリクエストがタイムアウトしました。';
        } else if (data.error?.message) {
          errorMessage = data.error.message;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      send({
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'TTS処理エラー',
        recoverable: true
      });
    }
  };

  const resetError = () => send({ type: 'RESET' });

  return {
    state,
    send,
    handleOCRUpload,
    handleTTSSynthesize,
    resetError
  };
}