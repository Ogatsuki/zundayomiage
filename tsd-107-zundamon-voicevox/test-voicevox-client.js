// Test script for VOICEVOX client HTTP method fix
// Tests various text lengths to ensure the fix works properly

const axios = require('axios');

// VOICEVOX API base URL - adjust if needed
const BASE_URL = process.env.VOICEVOX_URL || 'http://localhost:50021';
const SPEAKER_ID = 3; // Zundamon

// Test cases with different text lengths
const testCases = [
  { name: '10文字', text: 'こんにちは世界です' },
  { name: '100文字', text: 'あ'.repeat(100) },
  { name: '1000文字', text: 'これは千文字のテストです。'.repeat(77) }, // ~1000 chars
  { name: '10000文字', text: 'これは一万文字のテストです。'.repeat(667) }, // ~10000 chars
  { name: '50000文字', text: 'これは五万文字のテストです。'.repeat(3334) }, // ~50000 chars
];

// Color output helpers
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

async function testAudioQuery(text, testName) {
  console.log(`\n${colors.blue}[Testing ${testName}]${colors.reset}`);
  console.log(`Text length: ${text.length} characters`);

  const startTime = Date.now();

  try {
    // Test with VOICEVOX API requirement - text in URL params
    const response = await axios.post(
      `${BASE_URL}/audio_query`,
      null,
      {
        params: {
          text,
          speaker: SPEAKER_ID,
        },
        timeout: 60000, // 60 second timeout
      }
    );

    const elapsedTime = Date.now() - startTime;

    if (response.data && response.data.accent_phrases) {
      console.log(`${colors.green}✓ Success!${colors.reset}`);
      console.log(`  Response time: ${elapsedTime}ms`);
      console.log(`  Audio query generated with ${response.data.accent_phrases.length} accent phrases`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠ Unexpected response format${colors.reset}`);
      console.log('  Response:', JSON.stringify(response.data).substring(0, 200));
      return false;
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.log(`${colors.red}✗ Failed!${colors.reset}`);
    console.log(`  Time until error: ${elapsedTime}ms`);

    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Error: ${error.response.data}`);

      // Check if it's the URL parameter issue
      if (error.response.status === 400 &&
          error.response.data &&
          error.response.data.includes('Invalid HTTP request')) {
        console.log(`  ${colors.red}This is the URL size limit error that should be fixed!${colors.reset}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`  ${colors.yellow}VOICEVOX engine is not running at ${BASE_URL}${colors.reset}`);
      console.log('  Please start the VOICEVOX engine first.');
    } else {
      console.log(`  Error: ${error.message}`);
    }
    return false;
  }
}

async function compareImplementations(text, testName) {
  console.log(`\n${colors.blue}[Comparing implementations for ${testName}]${colors.reset}`);
  console.log(`Text length: ${text.length} characters`);

  // Test OLD implementation (text in URL params)
  console.log(`\n${colors.yellow}OLD implementation (text in URL):${colors.reset}`);
  try {
    const response = await axios.post(
      `${BASE_URL}/audio_query`,
      null,
      {
        params: { text, speaker: SPEAKER_ID },
        timeout: 10000,
      }
    );
    console.log(`${colors.green}✓ Success with OLD method${colors.reset}`);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`${colors.red}✗ Failed with status 400: ${error.response.data}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    }
  }

  // Test NEW implementation (text in body)
  console.log(`\n${colors.green}NEW implementation (text in body):${colors.reset}`);
  try {
    const response = await axios.post(
      `${BASE_URL}/audio_query?speaker=${SPEAKER_ID}`,
      text,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );
    console.log(`${colors.green}✓ Success with NEW method${colors.reset}`);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`${colors.red}✗ Failed with status 400: ${error.response.data}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    }
  }
}

async function runTests() {
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}VOICEVOX Client HTTP Method Test${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Speaker ID: ${SPEAKER_ID}`);

  // First check if VOICEVOX is running
  console.log(`\n${colors.yellow}Checking VOICEVOX availability...${colors.reset}`);
  try {
    await axios.get(`${BASE_URL}/version`, { timeout: 5000 });
    console.log(`${colors.green}✓ VOICEVOX is running${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ VOICEVOX is not accessible at ${BASE_URL}${colors.reset}`);
    console.log('Please ensure VOICEVOX is running with: docker-compose up -d');
    process.exit(1);
  }

  // Run comparison test for 10,000 character text
  console.log(`\n${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}Comparison Test (10,000 chars)${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}`);
  await compareImplementations(testCases[3].text, testCases[3].name);

  // Run all test cases
  console.log(`\n${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}Full Test Suite with NEW Implementation${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}`);

  const results = [];
  for (const testCase of testCases) {
    const success = await testAudioQuery(testCase.text, testCase.name);
    results.push({ name: testCase.name, success });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  results.forEach(result => {
    const icon = result.success ? `${colors.green}✓` : `${colors.red}✗`;
    console.log(`${icon} ${result.name}${colors.reset}`);
  });

  console.log(`\n${colors.blue}Results: ${successCount}/${totalCount} tests passed${colors.reset}`);

  if (successCount === totalCount) {
    console.log(`${colors.green}All tests passed! The fix is working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.red}Some tests failed. Please check the implementation.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test execution error:${colors.reset}`, error);
  process.exit(1);
});