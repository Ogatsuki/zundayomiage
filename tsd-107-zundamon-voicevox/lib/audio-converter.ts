import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Use system ffmpeg in Docker environment
ffmpeg.setFfmpegPath('ffmpeg');

export async function convertWavToMp3(wavBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const tempWav = path.join(tempDir, `temp_${Date.now()}.wav`);
  const tempMp3 = path.join(tempDir, `output_${Date.now()}.mp3`);

  try {
    // WAVファイル書き込み
    await fs.writeFile(tempWav, Buffer.from(wavBuffer));

    // MP3変換
    await new Promise((resolve, reject) => {
      ffmpeg(tempWav)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(22050)
        .on('end', resolve)
        .on('error', reject)
        .save(tempMp3);
    });

    // MP3読み込み
    const mp3Buffer = await fs.readFile(tempMp3);

    return mp3Buffer;
  } finally {
    // 一時ファイル削除
    try {
      await fs.unlink(tempWav);
      await fs.unlink(tempMp3);
    } catch (error) {
      console.warn('Temp file cleanup failed:', error);
    }
  }
}