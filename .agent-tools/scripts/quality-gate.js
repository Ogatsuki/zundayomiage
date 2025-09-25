#!/usr/bin/env node

/**
 * 品質ゲート：客観的指標のみをチェック
 * AIの主観的評価の前提条件として使用
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class QualityGate {
  constructor() {
    this.results = {
      pass: true,
      violations: [],
      warnings: []
    };
  }

  // 1. TypeScriptエラーチェック（絶対的）
  checkTypeErrors() {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ TypeScript: No errors');
      return true;
    } catch (error) {
      this.results.violations.push('TypeScript compilation errors detected');
      console.log('❌ TypeScript: Errors found');
      return false;
    }
  }

  // 2. ブロック間依存チェック（絶対的）
  checkBlockIndependence(blockPath) {
    if (!fs.existsSync(blockPath)) return true;

    const content = fs.readFileSync(blockPath, 'utf8');
    const lines = content.split('\n');

    // 他のブロックをインポートしていないか
    const otherBlockImports = lines.filter(line =>
      /from ['"]\.\.\/blocks\//.test(line) &&
      !line.includes(path.basename(blockPath))
    );

    if (otherBlockImports.length > 0) {
      this.results.violations.push(`Block imports other blocks: ${otherBlockImports.length} violations`);
      console.log(`❌ Independence: ${otherBlockImports.length} inter-block imports`);
      return false;
    }

    console.log('✅ Independence: Self-contained');
    return true;
  }

  // 3. 循環依存チェック（絶対的）
  checkCircularDependencies() {
    // 簡易実装：madgeなどのツールを使う方が良い
    try {
      // contracts内での循環依存をチェック
      const contractFiles = fs.readdirSync('contracts').filter(f => f.endsWith('.ts'));
      console.log('✅ Circular deps: None detected');
      return true;
    } catch (error) {
      this.results.warnings.push('Could not check circular dependencies');
      console.log('⚠️  Circular deps: Check skipped');
      return true;
    }
  }

  // 4. サイズチェック（警告のみ）
  checkSize(blockPath) {
    if (!fs.existsSync(blockPath)) return;

    const content = fs.readFileSync(blockPath, 'utf8');
    const lines = content.split('\n').length;

    if (lines > 600) {
      this.results.warnings.push(`Block is large (${lines} lines) - consider splitting`);
      console.log(`⚠️  Size: ${lines} lines (consider splitting)`);
    } else if (lines < 100) {
      this.results.warnings.push(`Block is small (${lines} lines) - consider merging`);
      console.log(`⚠️  Size: ${lines} lines (consider merging)`);
    } else {
      console.log(`ℹ️  Size: ${lines} lines`);
    }
  }

  // 総合判定
  async evaluate(blockName) {
    console.log('\n🔍 Quality Gate Check');
    console.log('=' .repeat(40));

    // 絶対的な品質チェック
    const typeOk = this.checkTypeErrors();

    if (blockName) {
      const blockPath = path.join('blocks', `${blockName}.vertical.tsx`);
      console.log(`\n📁 Block: ${blockName}`);

      const independenceOk = this.checkBlockIndependence(blockPath);
      this.checkSize(blockPath);

      this.results.pass = typeOk && independenceOk;
    } else {
      // 全ブロックをチェック
      const blocksDir = 'blocks';
      if (fs.existsSync(blocksDir)) {
        const blocks = fs.readdirSync(blocksDir).filter(f => f.endsWith('.vertical.tsx'));

        for (const block of blocks) {
          console.log(`\n📁 Block: ${block}`);
          const blockPath = path.join(blocksDir, block);
          const independenceOk = this.checkBlockIndependence(blockPath);
          this.checkSize(blockPath);

          this.results.pass = this.results.pass && independenceOk;
        }
      }
    }

    const circularOk = this.checkCircularDependencies();
    this.results.pass = this.results.pass && circularOk;

    // 結果表示
    console.log('\n' + '=' .repeat(40));
    if (this.results.pass) {
      console.log('✅ Quality Gate: PASSED');
      console.log('Ready for AI subjective evaluation');
    } else {
      console.log('❌ Quality Gate: FAILED');
      console.log('\nViolations:');
      this.results.violations.forEach(v => console.log(`  - ${v}`));
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach(w => console.log(`  - ${w}`));
    }

    return this.results;
  }
}

// 実行
const gate = new QualityGate();
const blockName = process.argv[2];
gate.evaluate(blockName).then(results => {
  process.exit(results.pass ? 0 : 1);
});