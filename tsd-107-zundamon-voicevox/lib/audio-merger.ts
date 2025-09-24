import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Use system ffmpeg in Docker environment
ffmpeg.setFfmpegPath('ffmpeg');

// Type definitions for cleanup results
interface CleanupResult {
  success: string[];
  failed: Array<{
    file: string;
    error: any;
  }>;
  totalDeleted: number;
}

/**
 * Perform reliable cleanup of temporary files using Promise.allSettled
 * @param files Array of file paths to clean up
 * @returns Cleanup result with success and failure information
 */
async function cleanupTempFiles(files: string[]): Promise<CleanupResult> {
  if (files.length === 0) {
    return { success: [], failed: [], totalDeleted: 0 };
  }

  // Promise.allSettled to ensure all cleanup attempts are made
  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        await fs.unlink(file);
        return { file, success: true };
      } catch (error) {
        return { file, success: false, error };
      }
    })
  );

  // Aggregate results
  const success = results
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => (r as PromiseFulfilledResult<any>).value.file);

  const failed = results
    .filter(r => r.status === 'fulfilled' && !r.value.success)
    .map(r => (r as PromiseFulfilledResult<any>).value);

  return {
    success,
    failed,
    totalDeleted: success.length
  };
}

/**
 * Merge multiple WAV buffers into a single MP3 file
 * @param wavBuffers Array of WAV file buffers
 * @returns Combined MP3 buffer
 */
export async function mergeWavToMp3(wavBuffers: ArrayBuffer[]): Promise<Buffer> {
  if (wavBuffers.length === 0) {
    throw new Error('No audio buffers provided for merging');
  }

  // For single buffer, just convert to MP3
  if (wavBuffers.length === 1) {
    return convertSingleWavToMp3(wavBuffers[0]);
  }

  const tempDir = os.tmpdir();
  const tempFiles: string[] = [];
  let cleanupTimer: NodeJS.Timeout | null = null;

  // Generate unique session ID for this merge operation
  const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const listFile = path.join(tempDir, `concat_list_${sessionId}.txt`);
  const outputFile = path.join(tempDir, `merged_output_${sessionId}.mp3`);

  try {
    // Write all WAV buffers to temporary files
    const fileList: string[] = [];

    for (let i = 0; i < wavBuffers.length; i++) {
      const tempWav = path.join(tempDir, `temp_chunk_${Date.now()}_${i}.wav`);
      await fs.writeFile(tempWav, Buffer.from(wavBuffers[i]));
      tempFiles.push(tempWav);
      fileList.push(`file '${tempWav.replace(/\\/g, '/')}'`);
    }

    // Create concat list file for ffmpeg
    await fs.writeFile(listFile, fileList.join('\n'));

    // Merge WAV files and convert to MP3
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(22050)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`Audio merging failed: ${err.message}`));
        })
        .save(outputFile);
    });

    // Set up auto-cleanup timer (60 seconds)
    cleanupTimer = setTimeout(async () => {
      console.warn(`Auto cleanup triggered for session ${sessionId}`);
      await cleanupTempFiles([...tempFiles, listFile, outputFile]);
    }, 60000);

    // Read the merged MP3 file
    const mp3Buffer = await fs.readFile(outputFile);
    return mp3Buffer;

  } catch (error) {
    // Detailed error logging
    console.error('Audio merging failed:', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      tempFiles: tempFiles.length,
      tempDir
    });

    throw new Error(`Failed to merge audio files: ${error instanceof Error ? error.message : 'Unknown error'}`);

  } finally {
    // Clear the timer
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
    }

    // Reliable cleanup using Promise.allSettled
    const allFiles = [...tempFiles, listFile, outputFile];
    const cleanupResult = await cleanupTempFiles(allFiles);

    if (cleanupResult.failed.length > 0) {
      console.warn('Some temp files could not be deleted:', {
        sessionId,
        failed: cleanupResult.failed.length,
        total: allFiles.length
      });
    }

    // Development environment detailed logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Cleanup completed:', {
        sessionId,
        deleted: cleanupResult.totalDeleted,
        failed: cleanupResult.failed.length
      });
    }
  }
}

/**
 * Convert a single WAV buffer to MP3
 * @param wavBuffer WAV file buffer
 * @returns MP3 buffer
 */
async function convertSingleWavToMp3(wavBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tempWav = path.join(tempDir, `single_temp_${sessionId}.wav`);
  const tempMp3 = path.join(tempDir, `single_output_${sessionId}.mp3`);
  let cleanupTimer: NodeJS.Timeout | null = null;

  try {
    // Write WAV buffer to temporary file
    await fs.writeFile(tempWav, Buffer.from(wavBuffer));

    // Convert to MP3
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempWav)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(22050)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('FFmpeg conversion error:', err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .save(tempMp3);
    });

    // Set up auto-cleanup timer (60 seconds)
    cleanupTimer = setTimeout(async () => {
      console.warn(`Auto cleanup triggered for single conversion ${sessionId}`);
      await cleanupTempFiles([tempWav, tempMp3]);
    }, 60000);

    // Read the converted MP3 file
    const mp3Buffer = await fs.readFile(tempMp3);
    return mp3Buffer;

  } catch (error) {
    console.error('Audio conversion error:', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      tempDir
    });
    throw new Error(`Failed to convert audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clear the timer
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
    }

    // Reliable cleanup using Promise.allSettled
    const cleanupResult = await cleanupTempFiles([tempWav, tempMp3]);

    if (cleanupResult.failed.length > 0) {
      console.warn('Some temp files could not be deleted:', {
        sessionId,
        failed: cleanupResult.failed.length
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Single conversion cleanup completed:', {
        sessionId,
        deleted: cleanupResult.totalDeleted,
        failed: cleanupResult.failed.length
      });
    }
  }
}

/**
 * Alternative merging function using WAV concatenation (simpler approach)
 * @param wavBuffers Array of WAV file buffers
 * @returns Combined WAV buffer that can be converted to MP3 later
 */
export async function concatenateWavBuffers(wavBuffers: ArrayBuffer[]): Promise<ArrayBuffer> {
  if (wavBuffers.length === 0) {
    throw new Error('No audio buffers provided for concatenation');
  }

  if (wavBuffers.length === 1) {
    return wavBuffers[0];
  }

  // Simple WAV concatenation approach
  // Note: This is a simplified implementation that assumes all WAV files have the same format
  const firstWav = new Uint8Array(wavBuffers[0]);
  const header = firstWav.slice(0, 44); // Standard WAV header is 44 bytes

  // Extract audio data from all WAV files (skip headers except first)
  const audioDataChunks: Uint8Array[] = [];
  let totalAudioLength = 0;

  for (let i = 0; i < wavBuffers.length; i++) {
    const wavArray = new Uint8Array(wavBuffers[i]);
    const audioData = wavArray.slice(44); // Skip WAV header
    audioDataChunks.push(audioData);
    totalAudioLength += audioData.length;
  }

  // Create new WAV buffer with updated length
  const newWavBuffer = new ArrayBuffer(44 + totalAudioLength);
  const newWavArray = new Uint8Array(newWavBuffer);

  // Copy header
  newWavArray.set(header, 0);

  // Update file size in header (bytes 4-7)
  const newFileSize = 36 + totalAudioLength;
  const fileSizeView = new DataView(newWavBuffer, 4, 4);
  fileSizeView.setUint32(0, newFileSize, true);

  // Update data chunk size in header (bytes 40-43)
  const dataSizeView = new DataView(newWavBuffer, 40, 4);
  dataSizeView.setUint32(0, totalAudioLength, true);

  // Copy all audio data
  let offset = 44;
  for (const chunk of audioDataChunks) {
    newWavArray.set(chunk, offset);
    offset += chunk.length;
  }

  return newWavBuffer;
}

/**
 * Clean up old temporary files on application startup
 * @param maxAgeMs Maximum age of files to keep (default: 1 hour)
 */
export async function cleanupOldTempFiles(maxAgeMs: number = 3600000): Promise<void> {
  const tempDir = os.tmpdir();

  try {
    const files = await fs.readdir(tempDir);
    const patterns = ['temp_chunk_', 'concat_list_', 'merged_output_', 'single_temp_', 'single_output_'];

    const oldFiles: string[] = [];
    for (const file of files) {
      // Check if file matches our temp file patterns
      if (!patterns.some(p => file.includes(p))) continue;

      const filepath = path.join(tempDir, file);
      try {
        const stats = await fs.stat(filepath);
        const ageMs = Date.now() - stats.mtime.getTime();

        if (ageMs > maxAgeMs) {
          oldFiles.push(filepath);
        }
      } catch {
        // Ignore stat errors
      }
    }

    if (oldFiles.length > 0) {
      const result = await cleanupTempFiles(oldFiles);
      console.log(`Cleaned up ${result.totalDeleted} old temp files from previous sessions`);

      if (result.failed.length > 0) {
        console.warn(`Failed to clean ${result.failed.length} old temp files`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old temp files:', error);
  }
}