// Test different API formats to find what VOICEVOX accepts

const axios = require('axios');

const BASE_URL = 'http://localhost:50021';
const SPEAKER_ID = 3;
const TEST_TEXT = 'こんにちは世界';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

async function testFormat(name, requestConfig) {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);

  try {
    const response = await axios(requestConfig);
    console.log(`${colors.green}✓ Success!${colors.reset}`);
    console.log('  Response has accent_phrases:', !!response.data.accent_phrases);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed!${colors.reset}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, JSON.stringify(error.response.data).substring(0, 200));
    } else {
      console.log(`  Error: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log(`${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}VOICEVOX API Format Test${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}`);

  // Test 1: Original method (text in URL params)
  await testFormat('Original (text in URL params)', {
    method: 'POST',
    url: `${BASE_URL}/audio_query`,
    params: {
      text: TEST_TEXT,
      speaker: SPEAKER_ID
    },
    data: null
  });

  // Test 2: JSON body with text
  await testFormat('JSON body {text: ...}', {
    method: 'POST',
    url: `${BASE_URL}/audio_query?speaker=${SPEAKER_ID}`,
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: TEST_TEXT
    }
  });

  // Test 3: JSON body with both text and speaker
  await testFormat('JSON body {text: ..., speaker: ...}', {
    method: 'POST',
    url: `${BASE_URL}/audio_query`,
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      text: TEST_TEXT,
      speaker: SPEAKER_ID
    }
  });

  // Test 4: Plain text body
  await testFormat('Plain text body', {
    method: 'POST',
    url: `${BASE_URL}/audio_query?speaker=${SPEAKER_ID}`,
    headers: {
      'Content-Type': 'text/plain'
    },
    data: TEST_TEXT
  });

  // Test 5: Form-urlencoded
  await testFormat('Form-urlencoded body', {
    method: 'POST',
    url: `${BASE_URL}/audio_query?speaker=${SPEAKER_ID}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: `text=${encodeURIComponent(TEST_TEXT)}`
  });

  // Test 6: Form-urlencoded with URLSearchParams
  const params = new URLSearchParams();
  params.append('text', TEST_TEXT);
  await testFormat('URLSearchParams body', {
    method: 'POST',
    url: `${BASE_URL}/audio_query?speaker=${SPEAKER_ID}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: params.toString()
  });

  // Test large text with working format
  console.log(`\n${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}Testing Large Text (10,000 chars)${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}`);

  const LARGE_TEXT = 'これは一万文字のテストです。'.repeat(667);

  await testFormat('Large text with URL params (should fail)', {
    method: 'POST',
    url: `${BASE_URL}/audio_query`,
    params: {
      text: LARGE_TEXT,
      speaker: SPEAKER_ID
    },
    data: null
  });
}

runTests().catch(error => {
  console.error(`${colors.red}Test execution error:${colors.reset}`, error);
  process.exit(1);
});