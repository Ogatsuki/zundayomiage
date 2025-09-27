import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface AudioConversionOptions {
  bitrate?: number;    // default: 128
  channels?: number;   // default: 1 (mono)
  frequency?: number;  // default: 22050
}

export class AudioProcessor {
  private tempDir: string;

  constructor() {
    // Set ffmpeg path if provided in environment
    const ffmpegPath = process.env.FFMPEG_PATH;
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }

    // Create temp directory for processing
    this.tempDir = path.join(os.tmpdir(), 'audio-processor');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.error(`Failed to cleanup temp file ${file}:`, error);
      }
    }
  }

  /**
   * Merge multiple WAV files into a single WAV file
   */
  async mergeWavFiles(wavBuffers: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (wavBuffers.length === 0) {
      throw new Error('No WAV files to merge');
    }

    if (wavBuffers.length === 1) {
      return wavBuffers[0];
    }

    const tempFiles: string[] = [];
    const outputFile = path.join(this.tempDir, `merged_${Date.now()}.wav`);

    try {
      // Write buffers to temp files
      for (let i = 0; i < wavBuffers.length; i++) {
        const tempFile = path.join(this.tempDir, `input_${Date.now()}_${i}.wav`);
        await fs.writeFile(tempFile, Buffer.from(wavBuffers[i]));
        tempFiles.push(tempFile);
      }

      // Merge WAV files using ffmpeg
      return await new Promise((resolve, reject) => {
        const command = ffmpeg();

        // Add all input files
        tempFiles.forEach(file => {
          command.input(file);
        });

        command
          .on('error', (err) => {
            reject(new Error(`FFmpeg merge error: ${err.message}`));
          })
          .on('end', async () => {
            try {
              const mergedBuffer = await fs.readFile(outputFile);
              const arrayBuffer = mergedBuffer.buffer.slice(
                mergedBuffer.byteOffset,
                mergedBuffer.byteOffset + mergedBuffer.byteLength
              );
              resolve(arrayBuffer as ArrayBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .mergeToFile(outputFile, this.tempDir);
      });
    } finally {
      // Cleanup temp files
      await this.cleanupTempFiles([...tempFiles, outputFile]);
    }
  }

  /**
   * Convert WAV buffer to MP3
   */
  async convertToMp3(
    wavBuffer: ArrayBuffer,
    options: AudioConversionOptions = {}
  ): Promise<ArrayBuffer> {
    const {
      bitrate = parseInt(process.env.MP3_BITRATE || '128'),
      channels = parseInt(process.env.MP3_CHANNELS || '1'),
      frequency = parseInt(process.env.MP3_FREQUENCY || '22050')
    } = options;

    const inputFile = path.join(this.tempDir, `input_${Date.now()}.wav`);
    const outputFile = path.join(this.tempDir, `output_${Date.now()}.mp3`);

    try {
      // Write WAV buffer to temp file
      await fs.writeFile(inputFile, Buffer.from(wavBuffer));

      // Convert to MP3
      return await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .audioCodec('libmp3lame')
          .audioBitrate(bitrate)
          .audioChannels(channels)
          .audioFrequency(frequency)
          .on('error', (err) => {
            reject(new Error(`FFmpeg conversion error: ${err.message}`));
          })
          .on('end', async () => {
            try {
              const mp3Buffer = await fs.readFile(outputFile);
              const arrayBuffer = mp3Buffer.buffer.slice(
                mp3Buffer.byteOffset,
                mp3Buffer.byteOffset + mp3Buffer.byteLength
              );
              resolve(arrayBuffer as ArrayBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .save(outputFile);
      });
    } finally {
      // Cleanup temp files
      await this.cleanupTempFiles([inputFile, outputFile]);
    }
  }

  /**
   * Generate a filename for the audio file
   */
  generateFileName(speakerId: number, format: 'wav' | 'mp3' = 'mp3'): string {
    const speakerName = speakerId === 2 ? 'metan' : 'zundamon';
    const timestamp = Date.now();
    return `${speakerName}_${timestamp}.${format}`;
  }

  /**
   * Convert ArrayBuffer to Buffer stream
   */
  private arrayBufferToStream(buffer: ArrayBuffer): Readable {
    const readable = new Readable();
    readable.push(Buffer.from(buffer));
    readable.push(null);
    return readable;
  }

  /**
   * Get audio metadata from a buffer
   */
  async getAudioMetadata(audioBuffer: ArrayBuffer): Promise<{
    duration?: number;
    bitrate?: number;
    format?: string;
    channels?: number;
    sampleRate?: number;
  }> {
    const tempFile = path.join(this.tempDir, `meta_${Date.now()}.audio`);

    try {
      await fs.writeFile(tempFile, Buffer.from(audioBuffer));

      return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFile, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
            resolve({
              duration: metadata.format.duration,
              bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate.toString()) : undefined,
              format: metadata.format.format_name,
              channels: audioStream?.channels,
              sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate.toString()) : undefined
            });
          }
        });
      });
    } finally {
      await this.cleanupTempFiles([tempFile]);
    }
  }
}

// Export a singleton instance
export const audioProcessor = new AudioProcessor();