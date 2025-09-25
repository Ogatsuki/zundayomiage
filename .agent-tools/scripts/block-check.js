#!/usr/bin/env node

/**
 * 垂直ブロックの品質チェックスクリプト
 * Usage: npm run block-check [block-name]
 */

const fs = require('fs');
const path = require('path');

function checkBlock(blockPath) {
  const results = {
    path: blockPath,
    exists: false,
    lines: 0,
    sizeOptimal: false,
    hasOtherBlockImports: false,
    score: 0
  };

  // ファイル存在チェック
  if (!fs.existsSync(blockPath)) {
    console.error(`❌ Block not found: ${blockPath}`);
    return results;
  }
  results.exists = true;

  // ファイル読み込み
  const content = fs.readFileSync(blockPath, 'utf8');
  const lines = content.split('\n');
  results.lines = lines.length;

  // サイズチェック（200-400行が最適）
  results.sizeOptimal = results.lines >= 200 && results.lines <= 400;

  // 他ブロックのインポートチェック
  const importPattern = /from ['"]\.\.\/blocks\//;
  results.hasOtherBlockImports = lines.some(line => importPattern.test(line));

  // スコア計算
  let score = 0;
  if (results.exists) score += 25;
  if (results.sizeOptimal) score += 25;
  if (!results.hasOtherBlockImports) score += 50;
  results.score = score;

  return results;
}

function printResults(results) {
  console.log('\n📊 Block Quality Check Results');
  console.log('================================');
  console.log(`📁 File: ${results.path}`);
  console.log(`📏 Lines: ${results.lines}`);

  if (results.sizeOptimal) {
    console.log('✅ Size: Optimal (200-400 lines)');
  } else if (results.lines < 200) {
    console.log('⚠️  Size: Too small (< 200 lines)');
  } else {
    console.log('⚠️  Size: Too large (> 400 lines)');
  }

  if (!results.hasOtherBlockImports) {
    console.log('✅ Independence: Self-contained');
  } else {
    console.log('❌ Independence: Has other block imports');
  }

  console.log(`\n🎯 Score: ${results.score}/100`);

  if (results.score >= 80) {
    console.log('✨ Status: PASS');
  } else {
    console.log('❌ Status: FAIL (needs improvement)');
  }
}

// メイン実行
const args = process.argv.slice(2);
if (args.length === 0) {
  // 全ブロックをチェック
  const blocksDir = path.join(__dirname, '..', 'blocks');
  const files = fs.readdirSync(blocksDir).filter(f => f.endsWith('.vertical.tsx'));

  console.log(`🔍 Checking ${files.length} vertical blocks...\n`);

  const allResults = files.map(file => {
    const blockPath = path.join(blocksDir, file);
    return checkBlock(blockPath);
  });

  // サマリー表示
  allResults.forEach(printResults);

  const avgScore = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
  console.log('\n📈 Overall Average Score:', avgScore.toFixed(1));

} else {
  // 特定ブロックをチェック
  const blockName = args[0];
  const blockPath = path.join(__dirname, '..', 'blocks', `${blockName}.vertical.tsx`);
  const results = checkBlock(blockPath);
  printResults(results);
}

// process.exit(results.score >= 80 ? 0 : 1);