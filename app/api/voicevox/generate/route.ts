// ============================================================
// route.ts - TSD-107 ずんだ読み上げ 音声生成API
// ============================================================
// POST /api/voicevox/generate
// - NDJSON形式でチャンク進捗をストリーム送信
// - チャンクごとにタイムアウトリセット可能な設計
// ============================================================

import { NextRequest } from 'next/server';

// 定数
const VOICEVOX_API_URL = process.env.VOICEVOX_API_URL || 'http://localhost:50021';
const CHUNK_SIZE = 500;
const CHUNK_TIMEOUT = 60000; // 1チャンクあたり60秒

// ------------------------------------------------------------
// ヘルパー関数
// ------------------------------------------------------------

/** テキストをチャンクに分割 */
function splitIntoChunks(text: string, size: number = CHUNK_SIZE): string[] {
  if (text.length === 0) return [];
  if (text.length <= size) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size;
  }
  return chunks;
}

/** VOICEVOX audio_query API呼び出し */
async function getAudioQuery(text: string, speaker: number): Promise<any> {
  const params = new URLSearchParams({ text, speaker: speaker.toString() });
  const response = await fetch(`${VOICEVOX_API_URL}/audio_query?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(CHUNK_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`audio_query failed: ${response.status}`);
  }
  return response.json();
}

/** VOICEVOX synthesis API呼び出し */
async function synthesize(query: any, speaker: number): Promise<ArrayBuffer> {
  const response = await fetch(`${VOICEVOX_API_URL}/synthesis?speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(CHUNK_TIMEOUT * 2),
  });

  if (!response.ok) {
    throw new Error(`synthesis failed: ${response.status}`);
  }
  return response.arrayBuffer();
}

/** WAVファイルをマージ（シンプル実装） */
function mergeWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error('No buffers to merge');
  if (buffers.length === 1) return buffers[0];

  // 全データサイズを計算（ヘッダー44バイトを除く）
  const totalDataSize = buffers.reduce((sum, buf) => sum + buf.byteLength - 44, 0);

  // 新しいWAVファイル作成
  const result = new ArrayBuffer(44 + totalDataSize);
  const view = new DataView(result);
  const uint8View = new Uint8Array(result);

  // 最初のファイルからヘッダーをコピー
  const firstView = new Uint8Array(buffers[0]);
  for (let i = 0; i < 44; i++) {
    uint8View[i] = firstView[i];
  }

  // ファイルサイズを更新
  view.setUint32(4, 36 + totalDataSize, true);
  view.setUint32(40, totalDataSize, true);

  // 全バッファのオーディオデータをコピー
  let offset = 44;
  for (const buffer of buffers) {
    const dataView = new Uint8Array(buffer);
    for (let i = 44; i < buffer.byteLength; i++) {
      uint8View[offset++] = dataView[i];
    }
  }

  return result;
}

/** ArrayBufferをBase64に変換 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ------------------------------------------------------------
// POSTハンドラー（ストリーミング対応）
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, speaker } = body;

    // バリデーション
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ type: 'error', message: 'テキストが必要です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (![2, 3].includes(speaker)) {
      return new Response(
        JSON.stringify({ type: 'error', message: '無効な話者IDです' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // チャンク分割
    const chunks = splitIntoChunks(text.trim(), CHUNK_SIZE);
    const totalChunks = chunks.length;

    // ストリーミングレスポンス
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const audioBuffers: ArrayBuffer[] = [];

        try {
          // 各チャンクを処理
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // 進捗を送信
            controller.enqueue(
              encoder.encode(JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: totalChunks,
              }) + '\n')
            );

            // VOICEVOX API呼び出し
            const query = await getAudioQuery(chunk, speaker);
            const audio = await synthesize(query, speaker);
            audioBuffers.push(audio);
          }

          // 全チャンク完了 - マージ
          const mergedWav = mergeWavBuffers(audioBuffers);

          // 完了イベントを送信（WAV形式）
          controller.enqueue(
            encoder.encode(JSON.stringify({
              type: 'complete',
              audio: arrayBufferToBase64(mergedWav),
            }) + '\n')
          );

          controller.close();
        } catch (error) {
          // エラーイベントを送信
          controller.enqueue(
            encoder.encode(JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '音声生成に失敗しました',
            }) + '\n')
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ヘルスチェック用GET
export async function GET() {
  try {
    const response = await fetch(`${VOICEVOX_API_URL}/version`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const version = await response.text();
      return new Response(JSON.stringify({ status: 'ok', voicevox_version: version }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'error', message: 'VOICEVOX not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ status: 'error', message: 'VOICEVOX connection failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
