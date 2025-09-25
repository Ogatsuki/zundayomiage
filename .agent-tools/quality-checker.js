#!/usr/bin/env node

/**
 * Quality Checker - プロジェクト非依存の品質チェックツール
 * Agentが実装後に実行する汎用チェッカー
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class QualityChecker {
  constructor(options = {}) {
    this.targetPath = options.path || process.cwd();
    this.blockName = options.block || null;
    this.results = {
      timestamp: new Date().toISOString(),
      checks: [],
      score: 0,
      passed: false
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌',
      check: '🔍'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * TypeScript型チェック（プロジェクト非依存）
   */
  async checkTypeScript() {
    this.log('TypeScript型チェック', 'check');

    try {
      // tsconfig.jsonの存在確認
      const tsconfigPath = path.join(this.targetPath, 'tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) {
        this.results.checks.push({
          name: 'TypeScript',
          status: 'skip',
          message: 'tsconfig.json not found'
        });
        return;
      }

      // tscコマンドの実行（グローバルまたはローカル）
      let result;
      try {
        result = execSync('npx tsc --noEmit', {
          cwd: this.targetPath,
          stdio: 'pipe',
          encoding: 'utf8'
        });
      } catch (error) {
        // エラー出力を解析
        const errorLines = error.stdout ? error.stdout.split('\n') : [];
        const errorCount = errorLines.filter(line => line.includes('error TS')).length;

        this.results.checks.push({
          name: 'TypeScript',
          status: 'fail',
          errors: errorCount,
          sample: errorLines.slice(0, 3).join('\n')
        });
        this.log(`  TypeScriptエラー: ${errorCount}件`, 'error');
        return;
      }

      this.results.checks.push({
        name: 'TypeScript',
        status: 'pass'
      });
      this.log('  TypeScriptエラー: 0件', 'success');
    } catch (error) {
      this.results.checks.push({
        name: 'TypeScript',
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * 垂直ブロック完結性チェック
   */
  async checkBlockIndependence() {
    if (!this.blockName) {
      this.log('ブロック指定なし - スキップ', 'info');
      return;
    }

    this.log(`ブロック独立性チェック: ${this.blockName}`, 'check');

    // PVBPプロトコル対応: [feature].[runtime].vertical.tsx パターンを探す
    const blocksDir = path.join(this.targetPath, 'blocks');
    let blockPath = null;

    if (fs.existsSync(blocksDir)) {
      const files = fs.readdirSync(blocksDir);
      // 完全一致を優先
      const exactMatch = files.find(f => f === `${this.blockName}.tsx`);
      if (exactMatch) {
        blockPath = path.join(blocksDir, exactMatch);
      } else {
        // パターンマッチング: blockNameで始まり.vertical.tsxで終わる
        const patternMatch = files.find(f =>
          f.startsWith(this.blockName) && f.endsWith('.vertical.tsx')
        );
        if (patternMatch) {
          blockPath = path.join(blocksDir, patternMatch);
        }
      }
    }

    if (!blockPath || !fs.existsSync(blockPath)) {
      this.results.checks.push({
        name: 'BlockIndependence',
        status: 'skip',
        message: 'Block file not found'
      });
      return;
    }

    const content = fs.readFileSync(blockPath, 'utf8');
    const lines = content.split('\n');

    // import文の解析
    const imports = lines.filter(line => line.trim().startsWith('import'));
    const blockImports = imports.filter(line =>
      line.includes('../blocks/') ||
      line.includes('./') && !line.includes('./types') && !line.includes('./constants')
    );

    if (blockImports.length > 0) {
      this.results.checks.push({
        name: 'BlockIndependence',
        status: 'fail',
        violations: blockImports.length,
        details: blockImports.slice(0, 3)
      });
      this.log(`  他ブロック参照: ${blockImports.length}件`, 'error');
    } else {
      this.results.checks.push({
        name: 'BlockIndependence',
        status: 'pass'
      });
      this.log('  他ブロック参照: 0件', 'success');
    }

    // サイズチェック
    const lineCount = lines.length;
    const sizeStatus = lineCount >= 200 && lineCount <= 400 ? 'optimal' :
                      lineCount < 200 ? 'small' : 'large';

    this.results.checks.push({
      name: 'BlockSize',
      status: sizeStatus === 'optimal' ? 'pass' : 'warning',
      lines: lineCount,
      recommendation: sizeStatus === 'optimal' ? 'Good' :
                     sizeStatus === 'small' ? 'Consider adding more functionality' :
                     'Consider splitting into smaller blocks'
    });

    this.log(`  ブロックサイズ: ${lineCount}行 (${sizeStatus})`,
             sizeStatus === 'optimal' ? 'success' : 'warning');
  }

  /**
   * 契約準拠チェック
   */
  async checkContractCompliance() {
    this.log('契約準拠チェック', 'check');

    const contractsDir = path.join(this.targetPath, 'contracts');

    if (!fs.existsSync(contractsDir)) {
      this.results.checks.push({
        name: 'ContractCompliance',
        status: 'skip',
        message: 'No contracts directory'
      });
      return;
    }

    // 契約ファイルの存在確認 - PVBPでは -contract.ts パターンも含む
    const contractFiles = fs.readdirSync(contractsDir)
      .filter(f =>
        f.endsWith('-contract.ts') ||
        f.endsWith('.contract.ts') ||
        f.endsWith('.contracts.ts') ||
        f.endsWith('contract.ts')
      );

    if (contractFiles.length === 0) {
      this.results.checks.push({
        name: 'ContractCompliance',
        status: 'warning',
        message: 'No contract files found'
      });
      this.log('  契約ファイル: 0件', 'warning');
    } else {
      this.results.checks.push({
        name: 'ContractCompliance',
        status: 'pass',
        contractCount: contractFiles.length
      });
      this.log(`  契約ファイル: ${contractFiles.length}件`, 'success');
    }
  }

  /**
   * 基本的な構文チェック
   */
  async checkSyntax() {
    this.log('構文チェック', 'check');

    // 全体をチェック（blocksとappディレクトリ両方）
    const targetDirs = ['blocks', 'app'].map(d => path.join(this.targetPath, d));
    let errorCount = 0;
    let checkedFiles = 0;

    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = this.findFilesInDir(dir, ['.ts', '.tsx', '.js', '.jsx']);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          // console文の検出（console.log, console.error, console.warn等）
          const consolePattern = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
          const matches = content.match(consolePattern);
          if (matches && !content.includes('// eslint-disable')) {
            errorCount += matches.length;
          }
          checkedFiles++;
        } catch (error) {
          // ファイル読み込みエラーは無視
        }
      }
    }

    this.results.checks.push({
      name: 'Syntax',
      status: errorCount > 0 ? 'warning' : 'pass',
      debugStatements: errorCount
    });

    if (errorCount > 0) {
      this.log(`  デバッグ文: ${errorCount}件`, 'warning');
    } else {
      this.log('  デバッグ文: なし', 'success');
    }
  }

  /**
   * ディレクトリ内のファイル検索ヘルパー
   */
  findFilesInDir(dir, extensions = []) {
    const files = [];
    const searchDir = (currentDir) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory() &&
              !entry.name.startsWith('.') &&
              entry.name !== 'node_modules' &&
              entry.name !== 'dist' &&
              entry.name !== 'build' &&
              entry.name !== '.next') {
            searchDir(fullPath);
          } else if (entry.isFile() &&
                     (extensions.length === 0 ||
                      extensions.some(ext => entry.name.endsWith(ext)))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // ディレクトリ読み込みエラーは無視
      }
    };
    searchDir(dir);
    return files;
  }

  /**
   * ファイル検索ヘルパー（後方互換性のため維持）
   */
  findFiles(pattern) {
    const files = [];
    const searchDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            searchDir(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // アクセスできないディレクトリは無視
      }
    };
    searchDir(this.targetPath);
    return files;
  }

  /**
   * スコア計算
   */
  calculateScore() {
    let totalChecks = 0;
    let passedChecks = 0;
    let criticalFails = 0;

    for (const check of this.results.checks) {
      if (check.status === 'skip') continue;

      totalChecks++;
      if (check.status === 'pass') {
        passedChecks++;
      } else if (check.status === 'fail') {
        criticalFails++;
      }
    }

    if (totalChecks === 0) return 0;

    // スコア計算（100点満点）
    let score = (passedChecks / totalChecks) * 100;

    // クリティカルな失敗は大きく減点
    score -= criticalFails * 20;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * レポート生成
   */
  generateReport() {
    this.results.score = this.calculateScore();
    this.results.passed = this.results.score >= 70;

    console.log('\n' + '='.repeat(50));
    console.log('📊 Quality Check Report');
    console.log('='.repeat(50));
    console.log(`📅 実行時刻: ${new Date().toLocaleString()}`);
    console.log(`📁 対象: ${this.blockName || this.targetPath}`);
    console.log(`🎯 スコア: ${this.results.score}/100`);
    console.log(`📝 判定: ${this.results.passed ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n📋 チェック結果:');
    for (const check of this.results.checks) {
      const icon = check.status === 'pass' ? '✅' :
                  check.status === 'fail' ? '❌' :
                  check.status === 'warning' ? '⚠️ ' :
                  check.status === 'skip' ? '⏭️ ' : '❓';
      console.log(`  ${icon} ${check.name}: ${check.status.toUpperCase()}`);

      if (check.message) {
        console.log(`     ${check.message}`);
      }
      if (check.errors) {
        console.log(`     エラー数: ${check.errors}`);
      }
      if (check.violations) {
        console.log(`     違反数: ${check.violations}`);
      }
    }

    console.log('='.repeat(50));

    return this.results;
  }

  /**
   * メイン実行
   */
  async run() {
    console.log('🚀 Quality Checker 開始\n');

    try {
      // 各チェックを実行
      await this.checkTypeScript();
      await this.checkBlockIndependence();
      await this.checkContractCompliance();
      await this.checkSyntax();

      // レポート生成
      const report = this.generateReport();

      // 結果をJSONファイルに保存
      const reportPath = path.join(process.cwd(), 'qa-result.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 詳細結果: ${reportPath}`);

      // 終了コード
      process.exit(report.passed ? 0 : 1);
    } catch (error) {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    }
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // 引数パース
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      options.path = args[i + 1];
      i++;
    } else if (args[i] === '--block' && args[i + 1]) {
      options.block = args[i + 1];
      i++;
    }
  }

  // ヘルプ表示
  if (args.includes('--help') || args.includes('-h')) {
    console.log('使用方法:');
    console.log('  node quality-checker.js [options]');
    console.log('\nオプション:');
    console.log('  --path <dir>   チェック対象ディレクトリ（デフォルト: カレント）');
    console.log('  --block <name> 特定のブロックをチェック');
    console.log('  --help         ヘルプを表示');
    console.log('\n例:');
    console.log('  node quality-checker.js --path ./new-architecture-test');
    console.log('  node quality-checker.js --block voice-synthesis');
    process.exit(0);
  }

  const checker = new QualityChecker(options);
  checker.run();
}

module.exports = QualityChecker;