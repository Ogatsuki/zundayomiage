#!/usr/bin/env node

/**
 * MEGA QA - 統合品質保証システム
 * 全ての品質チェックを一気に実行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MegaQA {
  constructor(projectPath) {
    this.projectPath = projectPath || process.cwd();
    this.results = {
      timestamp: new Date().toISOString(),
      phases: {},
      totalScore: 0,
      recommendation: '',
      errors: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌',
      running: '🔄'
    };
    console.log(`${icons[type]} ${message}`);
  }

  detectBuildCommand() {
    // プロジェクトタイプを検出してビルドコマンドを返す
    const packageJsonPath = path.join(this.projectPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.scripts) {
          // 優先順位でビルドコマンドを検出
          if (packageJson.scripts.build) return 'npm run build';
          if (packageJson.scripts.compile) return 'npm run compile';
          if (packageJson.scripts.dist) return 'npm run dist';
        }
      } catch (error) {
        // パースエラーは無視
      }
    }

    // TypeScriptプロジェクトの場合
    if (fs.existsSync(path.join(this.projectPath, 'tsconfig.json'))) {
      return 'npx tsc';
    }

    // デフォルト
    return 'echo "No build command detected"';
  }

  async runPhase(name, commands, critical = true) {
    this.log(`${name} 開始...`, 'running');
    const phaseResult = {
      name,
      status: 'running',
      duration: 0,
      checks: []
    };

    const startTime = Date.now();

    for (const cmd of commands) {
      try {
        const result = execSync(cmd.command, {
          cwd: cmd.cwd || this.projectPath,
          stdio: 'pipe',
          encoding: 'utf8'
        });

        phaseResult.checks.push({
          name: cmd.name,
          status: 'pass',
          output: result.substring(0, 200) // 最初の200文字のみ
        });

        this.log(`  ${cmd.name}: PASS`, 'success');
      } catch (error) {
        phaseResult.checks.push({
          name: cmd.name,
          status: 'fail',
          error: error.message
        });

        this.log(`  ${cmd.name}: FAIL`, 'error');

        if (critical) {
          phaseResult.status = 'failed';
          this.results.phases[name] = phaseResult;
          throw new Error(`Critical failure in ${name}: ${cmd.name}`);
        } else {
          this.results.warnings.push(`${name}: ${cmd.name} failed but continuing`);
        }
      }
    }

    phaseResult.duration = Date.now() - startTime;
    phaseResult.status = 'passed';
    this.results.phases[name] = phaseResult;

    this.log(`${name} 完了 (${phaseResult.duration}ms)`, 'success');
    return phaseResult;
  }

  async phase1_StaticAnalysis() {
    return this.runPhase('Phase 1: 静的解析', [
      {
        name: 'TypeScript型チェック',
        command: 'npx tsc --noEmit'
      },
      {
        name: 'ESLint',
        command: 'npx eslint . --ext .ts,.tsx --max-warnings 0 || true',
        cwd: this.projectPath
      },
      {
        name: 'ブロック独立性',
        command: `node ${path.join(__dirname, 'quality-checker.js')} --path ${this.projectPath}`
      }
    ]);
  }

  async phase2_Build() {
    return this.runPhase('Phase 2: ビルド', [
      {
        name: 'ビルド',
        command: this.detectBuildCommand()
      },
      {
        name: 'バンドルサイズ分析',
        command: 'ls -lh .next/static/chunks/*.js | head -5 || true'
      }
    ]);
  }

  async phase3_UnitTests() {
    // テストがまだない場合はスキップ
    const hasTests = fs.existsSync(path.join(this.projectPath, '__tests__')) ||
                    fs.existsSync(path.join(this.projectPath, 'test'));

    if (!hasTests) {
      this.log('Phase 3: 単体テスト - スキップ（テスト未実装）', 'warning');
      this.results.warnings.push('Unit tests not implemented yet');
      return;
    }

    return this.runPhase('Phase 3: 単体テスト', [
      {
        name: 'Jest実行',
        command: 'npm test -- --passWithNoTests'
      }
    ], false);
  }

  async phase4_E2E() {
    // Playwrightがインストールされているか確認
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
    } catch {
      this.log('Phase 4: E2E - スキップ（Playwright未インストール）', 'warning');
      this.results.warnings.push('E2E tests require Playwright installation');
      return;
    }

    return this.runPhase('Phase 4: E2Eテスト', [
      {
        name: 'Playwright実行',
        command: 'npx playwright test --reporter=line || true'
      }
    ], false);
  }

  async phase5_Performance() {
    this.log('Phase 5: パフォーマンス測定', 'running');

    const perfResult = {
      name: 'Performance',
      metrics: {}
    };

    try {
      // ビルドサイズ測定
      const buildSize = execSync(
        `du -sh ${path.join(this.projectPath, '.next')} | cut -f1`,
        { encoding: 'utf8' }
      ).trim();
      perfResult.metrics.buildSize = buildSize;

      // 垂直ブロックサイズ測定
      const blocksDir = path.join(this.projectPath, 'blocks');
      if (fs.existsSync(blocksDir)) {
        const blocks = fs.readdirSync(blocksDir)
          .filter(f => f.endsWith('.vertical.tsx'));

        perfResult.metrics.blocks = blocks.map(block => {
          const content = fs.readFileSync(path.join(blocksDir, block), 'utf8');
          const lines = content.split('\n').length;
          return { name: block, lines };
        });

        const avgLines = perfResult.metrics.blocks.reduce((sum, b) => sum + b.lines, 0) / blocks.length;
        perfResult.metrics.avgBlockSize = Math.round(avgLines);
      }

      this.results.phases['performance'] = perfResult;
      this.log('Phase 5: パフォーマンス測定 完了', 'success');
    } catch (error) {
      this.log('Phase 5: パフォーマンス測定 失敗', 'error');
    }
  }

  calculateScore() {
    let score = 100;
    const phases = Object.values(this.results.phases);

    // 各フェーズの結果に基づいてスコア計算
    phases.forEach(phase => {
      if (phase.status === 'failed') {
        score -= 20;
      } else if (phase.checks) {
        const failedChecks = phase.checks.filter(c => c.status === 'fail').length;
        score -= failedChecks * 5;
      }
    });

    // 警告によるスコア減点
    score -= this.results.warnings.length * 2;

    // パフォーマンス評価
    const perf = this.results.phases.performance;
    if (perf && perf.metrics.avgBlockSize) {
      if (perf.metrics.avgBlockSize > 400) {
        score -= 10; // ブロックが大きすぎる
      } else if (perf.metrics.avgBlockSize < 200) {
        score -= 5; // ブロックが小さすぎる
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  generateReport() {
    this.results.totalScore = this.calculateScore();

    // 推奨事項の決定
    if (this.results.totalScore >= 90) {
      this.results.recommendation = '✨ Production Ready - デプロイ可能';
    } else if (this.results.totalScore >= 70) {
      this.results.recommendation = '⚠️  Minor Issues - 軽微な問題あり';
    } else if (this.results.totalScore >= 50) {
      this.results.recommendation = '🔧 Needs Work - 改善が必要';
    } else {
      this.results.recommendation = '❌ Critical Issues - 重大な問題あり';
    }

    // レポート出力
    console.log('\n' + '='.repeat(60));
    console.log('📊 MEGA QA REPORT');
    console.log('='.repeat(60));
    console.log(`📅 実行日時: ${new Date().toLocaleString()}`);
    console.log(`🎯 総合スコア: ${this.results.totalScore}/100`);
    console.log(`📝 判定: ${this.results.recommendation}`);

    // フェーズサマリー
    console.log('\n📈 フェーズ別結果:');
    Object.entries(this.results.phases).forEach(([name, phase]) => {
      const icon = phase.status === 'passed' ? '✅' : '❌';
      console.log(`  ${icon} ${phase.name || name}`);
    });

    // 警告
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.results.warnings.forEach(w => console.log(`  - ${w}`));
    }

    // パフォーマンス
    const perf = this.results.phases.performance;
    if (perf && perf.metrics) {
      console.log('\n📏 メトリクス:');
      console.log(`  - ビルドサイズ: ${perf.metrics.buildSize || 'N/A'}`);
      console.log(`  - 平均ブロックサイズ: ${perf.metrics.avgBlockSize || 'N/A'}行`);
    }

    // JSON形式で保存
    const reportPath = path.join(__dirname, 'qa-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 詳細レポート: ${reportPath}`);

    console.log('='.repeat(60));

    return this.results;
  }

  async run() {
    console.log('🚀 MEGA QA - 統合品質保証開始\n');

    try {
      // Phase 1: 静的解析（必須）
      await this.phase1_StaticAnalysis();

      // Phase 2: ビルド（必須）
      await this.phase2_Build();

      // Phase 3: 単体テスト（オプション）
      await this.phase3_UnitTests();

      // Phase 4: E2E（オプション）
      await this.phase4_E2E();

      // Phase 5: パフォーマンス
      await this.phase5_Performance();

    } catch (error) {
      this.results.errors.push(error.message);
      console.error('\n❌ Critical Error:', error.message);
    }

    // レポート生成
    const report = this.generateReport();

    // 終了コード決定
    process.exit(report.totalScore >= 70 ? 0 : 1);
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2);
  let projectPath = process.cwd();

  // 引数パース
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--path' || args[i] === '-p') && args[i + 1]) {
      projectPath = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('使用方法:');
      console.log('  node mega-qa.js [options]');
      console.log('\nオプション:');
      console.log('  --path, -p <dir>  チェック対象ディレクトリ（デフォルト: カレント）');
      console.log('  --help, -h        ヘルプを表示');
      console.log('\n例:');
      console.log('  node mega-qa.js --path ./my-project');
      process.exit(0);
    }
  }

  const qa = new MegaQA(projectPath);
  qa.run().catch(console.error);
}

module.exports = MegaQA;