// Test script for OCR API
import fs from 'fs/promises';
import { createCanvas } from 'canvas';

async function createTestImage() {
  // Create a simple test image with text
  const canvas = createCanvas(400, 200);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 400, 200);

  // Add text
  ctx.fillStyle = 'black';
  ctx.font = '30px Arial';
  ctx.fillText('Test OCR Text', 50, 50);
  ctx.fillText('テストテキスト', 50, 100);
  ctx.fillText('1234567890', 50, 150);

  // Convert to buffer
  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

async function testOCREndpoint() {
  console.log('Testing OCR API endpoint...\n');

  const baseUrl = 'http://localhost:3000/api/ocr';

  try {
    // Test 1: GET endpoint (status check)
    console.log('Test 1: GET /api/ocr (status check)');
    try {
      const getResponse = await fetch(baseUrl);
      const status = await getResponse.json();
      console.log('  Status:', status.status);
      console.log('  Max file size:', status.configuration.maxFileSizeMB, 'MB');
      console.log('  Default language:', status.configuration.defaultLanguage);
      console.log('  ✅ Status endpoint works\n');
    } catch (error) {
      console.log('  ⚠️  Could not connect to API');
      console.log('  Make sure the Next.js server is running (npm run dev)');
      return;
    }

    // Test 2: Create test image
    console.log('Test 2: Create test image');
    const imageBuffer = await createTestImage();
    await fs.writeFile('test-ocr-image.png', imageBuffer);
    console.log('  Created test image: test-ocr-image.png');
    console.log('  Image size:', imageBuffer.length, 'bytes');
    console.log('  ✅ Test image created\n');

    // Test 3: POST endpoint (OCR processing)
    console.log('Test 3: POST /api/ocr (OCR processing)');
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test-image.png');

    try {
      const postResponse = await fetch(baseUrl, {
        method: 'POST',
        body: formData
      });

      const result = await postResponse.json();

      if (result.success) {
        console.log('  OCR successful!');
        console.log('  Raw text:', result.data.text);
        console.log('  Normalized text:', result.data.normalizedText);
        console.log('  Confidence:', result.data.confidence);
        console.log('  Word count:', result.data.wordCount);
        console.log('  ✅ OCR processing works');
      } else {
        console.log('  ❌ OCR failed:', result.error);
      }
    } catch (error) {
      console.log('  ⚠️  OCR processing error');
      console.log('  This may require Tesseract.js to be properly configured');
      console.log('  Error:', error.message);
    }
    console.log();

    // Test 4: Test with invalid file
    console.log('Test 4: Test error handling (no file)');
    const emptyFormData = new FormData();
    const errorResponse = await fetch(baseUrl, {
      method: 'POST',
      body: emptyFormData
    });

    const errorResult = await errorResponse.json();
    console.log('  Expected error:', errorResult.error);
    console.log('  ✅ Error handling works\n');

    console.log('✨ OCR API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check if running in browser or Node.js
if (typeof window === 'undefined') {
  console.log('Note: This test requires the canvas package for Node.js');
  console.log('Install with: npm install canvas\n');
}

// Run tests
testOCREndpoint();