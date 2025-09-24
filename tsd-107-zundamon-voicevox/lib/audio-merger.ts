import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Use system ffmpeg in Docker environment
ffmpeg.setFfmpegPath('ffmpeg');

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
  const listFile = path.join(tempDir, `concat_list_${Date.now()}.txt`);
  const outputFile = path.join(tempDir, `merged_output_${Date.now()}.mp3`);

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

    // Read the merged MP3 file
    const mp3Buffer = await fs.readFile(outputFile);
    return mp3Buffer;

  } catch (error) {
    console.error('Audio merging error:', error);
    throw new Error(`Failed to merge audio files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temporary files
    const filesToClean = [...tempFiles, listFile, outputFile];
    await Promise.all(filesToClean.map(async (file) => {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.warn(`Failed to clean up temp file ${file}:`, error);
      }
    }));
  }
}

/**
 * Convert a single WAV buffer to MP3
 * @param wavBuffer WAV file buffer
 * @returns MP3 buffer
 */
async function convertSingleWavToMp3(wavBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const tempWav = path.join(tempDir, `single_temp_${Date.now()}.wav`);
  const tempMp3 = path.join(tempDir, `single_output_${Date.now()}.mp3`);

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

    // Read the converted MP3 file
    const mp3Buffer = await fs.readFile(tempMp3);
    return mp3Buffer;

  } catch (error) {
    console.error('Audio conversion error:', error);
    throw new Error(`Failed to convert audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temporary files
    try {
      await fs.unlink(tempWav);
      await fs.unlink(tempMp3);
    } catch (error) {
      console.warn('Temp file cleanup failed:', error);
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