import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

/**
 * Normalize OCR text by removing extra spaces and fixing common OCR errors
 */
function normalizeOCRText(text: string): string {
  let normalized = text
    // Remove extra whitespaces
    .replace(/\s+/g, ' ')
    .trim()
    // Fix common Japanese OCR errors
    .replace(/[０-９]/g, (match) => {
      // Convert full-width numbers to half-width
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    })
    // Fix common punctuation issues
    .replace(/\s+([。、！？])/g, '$1')
    .replace(/([。、！？])\s+/g, '$1')
    // Remove isolated single characters that are likely noise
    .replace(/\s[^\s]\s/g, ' ')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  // Remove duplicate punctuation
  normalized = normalized.replace(/([。、！？])\1+/g, '$1');

  // Fix line breaks that should be spaces in Japanese text
  normalized = normalized.replace(/\n(?![。、！？\n])/g, '');

  return normalized;
}

/**
 * Validate image file
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (5MB limit)
  const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '5');
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Supported formats: JPEG, PNG, WebP, BMP'
    };
  }

  return { valid: true };
}

/**
 * POST /api/ocr
 * Process image with OCR to extract text
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get OCR language from environment or default to Japanese
    const ocrLanguage = process.env.OCR_LANGUAGE || 'jpn';

    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker(ocrLanguage);

    try {
      // Perform OCR
      const result = await worker.recognize(buffer);

      // Extract and normalize text
      const rawText = result.data.text;
      const normalizedText = normalizeOCRText(rawText);

      // Calculate confidence score (0-100)
      const confidence = result.data.confidence;

      // Get additional metadata
      const words = result.data.words || [];
      const wordCount = words.length;
      const averageConfidence = words.length > 0
        ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
        : 0;

      // Build response
      const response = {
        success: true,
        data: {
          text: rawText,
          normalizedText,
          confidence,
          wordCount,
          averageConfidence,
          language: ocrLanguage,
          timestamp: new Date().toISOString()
        },
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          processingTime: result.data.symbols ? result.data.symbols.length : 0
        }
      };

      return NextResponse.json(response);

    } finally {
      // Always terminate the worker
      await worker.terminate();
    }

  } catch (error) {
    console.error('OCR processing error:', error);

    // Determine error message
    let errorMessage = 'OCR processing failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ocr
 * Get OCR service status and configuration
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    configuration: {
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '5'),
      supportedFormats: ['JPEG', 'PNG', 'WebP', 'BMP'],
      defaultLanguage: process.env.OCR_LANGUAGE || 'jpn',
      supportedLanguages: ['jpn', 'eng', 'chi_sim', 'chi_tra', 'kor'],
      features: {
        textExtraction: true,
        textNormalization: true,
        confidenceScoring: true,
        wordLevelAnalysis: true
      }
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * OPTIONS /api/ocr
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}