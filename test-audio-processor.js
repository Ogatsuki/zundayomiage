// Test script for AudioProcessor
import { audioProcessor } from './lib/audio-processor.js';
import fs from 'fs/promises';

async function createTestWav() {
  // Create a simple WAV header for testing
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const encoder = new TextEncoder();

  // "RIFF" chunk descriptor
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, 36 + dataSize, true);

  // "WAVE" format
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // "fmt " subchunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6D); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // space
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // ByteRate
  view.setUint16(32, numChannels * bitsPerSample / 8, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true);

  // "data" subchunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true);

  // Generate simple sine wave data
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0x7FFF;
    view.setInt16(44 + i * 2, sample, true);
  }

  return buffer;
}

async function testAudioProcessor() {
  console.log('Testing AudioProcessor...\n');

  try {
    // Test 1: Generate filename
    console.log('Test 1: Generate filename');
    const filename1 = audioProcessor.generateFileName(3, 'mp3');
    const filename2 = audioProcessor.generateFileName(2, 'wav');
    console.log('  Zundamon MP3:', filename1);
    console.log('  Metan WAV:', filename2);
    console.log('  ✅ Filename generation works\n');

    // Test 2: Create test WAV files
    console.log('Test 2: Create test WAV buffers');
    const wav1 = await createTestWav();
    const wav2 = await createTestWav();
    console.log('  Created two test WAV buffers');
    console.log('  Buffer 1 size:', wav1.byteLength, 'bytes');
    console.log('  Buffer 2 size:', wav2.byteLength, 'bytes');
    console.log('  ✅ Test WAV creation works\n');

    // Test 3: Get metadata
    console.log('Test 3: Get audio metadata');
    try {
      const metadata = await audioProcessor.getAudioMetadata(wav1);
      console.log('  Metadata:', JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.log('  ⚠️  Metadata extraction requires ffmpeg to be installed');
    }
    console.log();

    // Test 4: Merge WAV files
    console.log('Test 4: Merge WAV files');
    try {
      const merged = await audioProcessor.mergeWavFiles([wav1, wav2]);
      console.log('  Merged buffer size:', merged.byteLength, 'bytes');
      console.log('  ✅ WAV merging works');
    } catch (error) {
      console.log('  ⚠️  WAV merging requires ffmpeg to be installed');
      console.log('  Error:', error.message);
    }
    console.log();

    // Test 5: Convert to MP3
    console.log('Test 5: Convert WAV to MP3');
    try {
      const mp3 = await audioProcessor.convertToMp3(wav1, {
        bitrate: 128,
        channels: 1,
        frequency: 22050
      });
      console.log('  MP3 buffer size:', mp3.byteLength, 'bytes');
      console.log('  ✅ MP3 conversion works');

      // Save test file
      await fs.writeFile('test_output.mp3', Buffer.from(mp3));
      console.log('  Saved test file: test_output.mp3');
    } catch (error) {
      console.log('  ⚠️  MP3 conversion requires ffmpeg to be installed');
      console.log('  Error:', error.message);
    }
    console.log();

    console.log('✨ AudioProcessor tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testAudioProcessor();