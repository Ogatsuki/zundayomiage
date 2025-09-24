// Find the maximum text length that VOICEVOX can handle

const axios = require('axios');

const BASE_URL = 'http://localhost:50021';
const SPEAKER_ID = 3;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

async function testLength(length) {
  const text = 'あ'.repeat(length);

  try {
    const response = await axios.post(
      `${BASE_URL}/audio_query`,
      null,
      {
        params: { text, speaker: SPEAKER_ID },
        timeout: 30000,
      }
    );
    return { success: true, error: null };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        error: `Status ${error.response.status}: ${error.response.data}`
      };
    }
    return { success: false, error: error.message };
  }
}

async function binarySearch(min, max) {
  console.log(`\n${colors.yellow}Binary search for maximum text length...${colors.reset}`);
  console.log(`Range: ${min} - ${max} characters\n`);

  let low = min;
  let high = max;
  let lastWorking = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    console.log(`Testing ${mid} characters... `);

    const result = await testLength(mid);

    if (result.success) {
      console.log(`${colors.green}✓ Success${colors.reset}`);
      lastWorking = mid;
      low = mid + 1;
    } else {
      console.log(`${colors.red}✗ Failed: ${result.error.substring(0, 50)}...${colors.reset}`);
      high = mid - 1;
    }
  }

  return lastWorking;
}

async function testSpecificLengths() {
  const testCases = [
    1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000
  ];

  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Testing specific lengths${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}\n`);

  for (const length of testCases) {
    console.log(`Testing ${length} characters: `);
    const result = await testLength(length);
    if (result.success) {
      console.log(`  ${colors.green}✓ Success${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Failed: ${result.error.substring(0, 100)}${colors.reset}`);
    }
  }
}

async function run() {
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}VOICEVOX Text Length Limit Finder${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);

  // First test specific lengths
  await testSpecificLengths();

  // Binary search between working (3000) and failing (10000)
  const maxLength = await binarySearch(3000, 10000);

  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Results${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.green}Maximum working text length: ${maxLength} characters${colors.reset}`);

  // Test around the boundary
  console.log(`\nVerifying boundary:`);
  const boundaryTests = [maxLength - 1, maxLength, maxLength + 1, maxLength + 2];
  for (const length of boundaryTests) {
    const result = await testLength(length);
    console.log(`  ${length} chars: ${result.success ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  }
}

run().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});