#!/usr/bin/env node
/**
 * Enhanced Reporting Dashboard
 * Generates comprehensive development reports for Phase IV CI/CD system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ReportingDashboard {
  constructor() {
    this.reportsPath = path.join(__dirname, '../reports');
    this.performanceResultsPath = path.join(__dirname, '../performance-results');
    
    // Ensure directories exist
    [this.reportsPath, this.performanceResultsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate comprehensive development report
   */
  async generateReport(options = {}) {
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      metadata: this.getMetadata(),
      codebase: await this.analyzeCodebase(),
      testing: await this.analyzeTestCoverage(),
      performance: await this.analyzePerformance(),
      quality: await this.analyzeCodeQuality(),
      ci_health: await this.analyzeCIHealth(),
      git_analysis: await this.analyzeGitHistory()
    };

    // Generate different report formats
    const reports = {
      json: this.generateJSONReport(reportData),
      markdown: this.generateMarkdownReport(reportData),
      html: this.generateHTMLReport(reportData)
    };

    // Save reports
    const reportId = timestamp.replace(/[:.]/g, '-');
    const savedReports = {};

    for (const [format, content] of Object.entries(reports)) {
      const filename = `development-report-${reportId}.${format}`;
      const filepath = path.join(this.reportsPath, filename);
      fs.writeFileSync(filepath, content);
      savedReports[format] = filepath;
    }

    // Create latest symlinks
    this.createLatestSymlinks(savedReports);

    return {
      reportId,
      files: savedReports,
      summary: this.generateSummary(reportData)
    };
  }

  /**
   * Get system metadata
   */
  getMetadata() {
    return {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      git_commit: this.getGitCommit(),
      git_branch: this.getGitBranch(),
      ci: !!process.env.CI,
      generated_by: 'Enhanced Reporting Dashboard v1.0'
    };
  }

  /**
   * Analyze codebase structure and complexity
   */
  async analyzeCodebase() {
    try {
      const stats = {
        files: {},
        lines: {},
        complexity: {},
        dependencies: {}
      };

      // Count files by type
      const fileTypes = ['.ts', '.js', '.json', '.md', '.yml', '.yaml'];
      fileTypes.forEach(ext => {
        try {
          const count = execSync(`find . -name "*${ext}" -not -path "./node_modules/*" -not -path "./dist/*" | wc -l`, { encoding: 'utf8' }).trim();
          stats.files[ext.replace('.', '')] = parseInt(count);
        } catch (error) {
          stats.files[ext.replace('.', '')] = 0;
        }
      });

      // Count lines of code
      try {
        const srcLines = execSync('find src -name "*.ts" | xargs wc -l | tail -1', { encoding: 'utf8' }).trim().split(/\\s+/)[0];
        const testLines = execSync('find test -name "*.ts" | xargs wc -l | tail -1', { encoding: 'utf8' }).trim().split(/\\s+/)[0];
        stats.lines.source = parseInt(srcLines) || 0;
        stats.lines.test = parseInt(testLines) || 0;
        stats.lines.total = stats.lines.source + stats.lines.test;
        stats.lines.test_ratio = stats.lines.source > 0 ? (stats.lines.test / stats.lines.source).toFixed(2) : 0;
      } catch (error) {
        stats.lines = { source: 0, test: 0, total: 0, test_ratio: 0 };
      }

      // Analyze package.json dependencies
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        stats.dependencies.production = Object.keys(packageJson.dependencies || {}).length;
        stats.dependencies.development = Object.keys(packageJson.devDependencies || {}).length;
        stats.dependencies.total = stats.dependencies.production + stats.dependencies.development;
      } catch (error) {
        stats.dependencies = { production: 0, development: 0, total: 0 };
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze test coverage and performance
   */
  async analyzeTestCoverage() {
    try {
      const stats = {
        suites: {},
        performance: {},
        coverage: null
      };

      // Analyze different test suites
      const suites = ['smoke', 'core', 'extended', 'integration'];
      
      for (const suite of suites) {
        try {
          const startTime = Date.now();
          const result = execSync(`npm run test:${suite} 2>/dev/null || echo "FAILED"`, { encoding: 'utf8' });
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          
          const passed = (result.match(/(\\d+) passed/) || [null, '0'])[1];
          const failed = (result.match(/(\\d+) failed/) || [null, '0'])[1];
          
          stats.suites[suite] = {
            duration: parseFloat(duration),
            passed: parseInt(passed),
            failed: parseInt(failed),
            status: result.includes('FAILED') ? 'failed' : 'passed'
          };
        } catch (error) {
          stats.suites[suite] = {
            duration: 0,
            passed: 0,
            failed: 0,
            status: 'error',
            error: error.message
          };
        }
      }

      // Try to get coverage data if available
      try {
        if (fs.existsSync('coverage/coverage-summary.json')) {
          stats.coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
        }
      } catch (error) {
        stats.coverage = null;
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance() {
    try {
      const stats = {
        latest: null,
        trends: [],
        budgets: null
      };

      // Load performance budget config
      try {
        const budgetsPath = path.join(__dirname, '../config/performance-budgets.json');
        if (fs.existsSync(budgetsPath)) {
          stats.budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
        }
      } catch (error) {
        stats.budgets = null;
      }

      // Load latest performance results
      try {
        const resultFiles = fs.readdirSync(this.performanceResultsPath)
          .filter(f => f.startsWith('performance-') && f.endsWith('.json'))
          .sort()
          .slice(-5);

        if (resultFiles.length > 0) {
          const latestFile = resultFiles[resultFiles.length - 1];
          stats.latest = JSON.parse(fs.readFileSync(
            path.join(this.performanceResultsPath, latestFile), 
            'utf8'
          ));
          
          // Load trend data
          stats.trends = resultFiles.slice(-5).map(file => {
            try {
              return JSON.parse(fs.readFileSync(
                path.join(this.performanceResultsPath, file), 
                'utf8'
              ));
            } catch (error) {
              return null;
            }
          }).filter(Boolean);
        }
      } catch (error) {
        // Performance results not available
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze code quality metrics
   */
  async analyzeCodeQuality() {
    try {
      const stats = {
        lint: null,
        typescript: null,
        format: null
      };

      // ESLint analysis
      try {
        const lintResult = execSync('npm run lint:check 2>&1 || echo "LINT_FAILED"', { encoding: 'utf8' });
        const warnings = (lintResult.match(/(\\d+) warnings?/) || [null, '0'])[1];
        const errors = (lintResult.match(/(\\d+) errors?/) || [null, '0'])[1];
        
        stats.lint = {
          warnings: parseInt(warnings),
          errors: parseInt(errors),
          status: lintResult.includes('LINT_FAILED') ? 'failed' : 'passed'
        };
      } catch (error) {
        stats.lint = { error: error.message };
      }

      // TypeScript analysis
      try {
        const tscResult = execSync('npm run typecheck 2>&1 || echo "TSC_FAILED"', { encoding: 'utf8' });
        stats.typescript = {
          status: tscResult.includes('TSC_FAILED') ? 'failed' : 'passed',
          output: tscResult.substring(0, 500) // Truncate long output
        };
      } catch (error) {
        stats.typescript = { error: error.message };
      }

      // Format check
      try {
        const formatResult = execSync('npm run check:format 2>&1 || echo "FORMAT_FAILED"', { encoding: 'utf8' });
        stats.format = {
          status: formatResult.includes('FORMAT_FAILED') ? 'failed' : 'passed'
        };
      } catch (error) {
        stats.format = { error: error.message };
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze CI/CD pipeline health
   */
  async analyzeCIHealth() {
    try {
      const stats = {
        github_actions: null,
        local_ci: null,
        hooks: null
      };

      // Check if GitHub Actions workflows exist
      const workflowsPath = '.github/workflows';
      if (fs.existsSync(workflowsPath)) {
        const workflows = fs.readdirSync(workflowsPath)
          .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
          .map(f => ({
            name: f,
            size: fs.statSync(path.join(workflowsPath, f)).size
          }));
        
        stats.github_actions = {
          count: workflows.length,
          workflows: workflows
        };
      }

      // Check local CI script
      const localCIPath = 'scripts/ci-local.sh';
      if (fs.existsSync(localCIPath)) {
        stats.local_ci = {
          exists: true,
          executable: fs.statSync(localCIPath).mode & parseInt('111', 8)
        };
      }

      // Check git hooks
      const hookPath = '.git/hooks/pre-commit';
      if (fs.existsSync(hookPath)) {
        stats.hooks = {
          pre_commit: {
            exists: true,
            executable: fs.statSync(hookPath).mode & parseInt('111', 8)
          }
        };
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze git repository history and health
   */
  async analyzeGitHistory() {
    try {
      const stats = {
        commits: null,
        contributors: null,
        branch_info: null
      };

      // Recent commits
      try {
        const commits = execSync('git log --oneline -10', { encoding: 'utf8' })
          .trim()
          .split('\\n')
          .map(line => {
            const [hash, ...message] = line.split(' ');
            return { hash, message: message.join(' ') };
          });
        stats.commits = commits;
      } catch (error) {
        stats.commits = [];
      }

      // Contributors
      try {
        const contributors = execSync('git shortlog -sn --all', { encoding: 'utf8' })
          .trim()
          .split('\\n')
          .map(line => {
            const [count, ...name] = line.trim().split('\\t');
            return { name: name.join('\\t'), commits: parseInt(count) };
          });
        stats.contributors = contributors;
      } catch (error) {
        stats.contributors = [];
      }

      // Branch info
      try {
        const currentBranch = this.getGitBranch();
        const branches = execSync('git branch -r', { encoding: 'utf8' })
          .trim()
          .split('\\n')
          .map(b => b.trim().replace('origin/', ''));
        
        stats.branch_info = {
          current: currentBranch,
          remote_branches: branches.filter(b => !b.includes('HEAD'))
        };
      } catch (error) {
        stats.branch_info = null;
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(data) {
    let md = `# Development Report

**Generated**: ${data.timestamp}  
**Git Commit**: ${data.metadata.git_commit}  
**Branch**: ${data.metadata.git_branch}  
**Platform**: ${data.metadata.platform} (${data.metadata.arch})  

## 📊 Codebase Statistics

| Metric | Value |
|--------|-------|
| Source Lines | ${data.codebase.lines?.source || 'N/A'} |
| Test Lines | ${data.codebase.lines?.test || 'N/A'} |
| Test Ratio | ${data.codebase.lines?.test_ratio || 'N/A'} |
| TypeScript Files | ${data.codebase.files?.ts || 'N/A'} |
| Total Dependencies | ${data.codebase.dependencies?.total || 'N/A'} |

## 🧪 Test Analysis

`;

    if (data.testing.suites) {
      md += '| Suite | Duration | Passed | Failed | Status |\\n';
      md += '|-------|----------|--------|--------|--------|\\n';
      
      Object.entries(data.testing.suites).forEach(([suite, stats]) => {
        const statusEmoji = stats.status === 'passed' ? '✅' : stats.status === 'failed' ? '❌' : '⚠️';
        md += `| ${suite} | ${stats.duration}s | ${stats.passed} | ${stats.failed} | ${statusEmoji} ${stats.status} |\\n`;
      });
    }

    md += `
## 🎯 Code Quality

`;

    if (data.quality.lint) {
      md += `**ESLint**: ${data.quality.lint.errors || 0} errors, ${data.quality.lint.warnings || 0} warnings\\n`;
    }
    
    if (data.quality.typescript) {
      md += `**TypeScript**: ${data.quality.typescript.status === 'passed' ? '✅ Passed' : '❌ Failed'}\\n`;
    }
    
    if (data.quality.format) {
      md += `**Format Check**: ${data.quality.format.status === 'passed' ? '✅ Passed' : '❌ Failed'}\\n`;
    }

    md += `
## ⚡ Performance

`;

    if (data.performance.latest && data.performance.latest.results) {
      md += '| Category | Duration | Budget | Status |\\n';
      md += '|----------|----------|--------|--------|\\n';
      
      Object.entries(data.performance.latest.results).forEach(([category, result]) => {
        if (result.duration !== undefined) {
          const budget = data.performance.budgets?.budgets?.test_execution?.[category]?.max_duration || 'N/A';
          md += `| ${category} | ${result.duration}s | ${budget} | ⚡ |\\n`;
        }
      });
    }

    md += `
## 🔧 CI/CD Health

`;

    if (data.ci_health.github_actions) {
      md += `**GitHub Actions**: ${data.ci_health.github_actions.count} workflows configured\\n`;
    }
    
    if (data.ci_health.local_ci) {
      md += `**Local CI**: ${data.ci_health.local_ci.exists ? '✅ Available' : '❌ Missing'}\\n`;
    }
    
    if (data.ci_health.hooks) {
      md += `**Git Hooks**: ${data.ci_health.hooks.pre_commit?.exists ? '✅ Pre-commit configured' : '❌ No hooks'}\\n`;
    }

    md += `
## 📈 Recent Activity

`;

    if (data.git_analysis.commits && data.git_analysis.commits.length > 0) {
      md += '**Recent Commits**:\\n\\n';
      data.git_analysis.commits.slice(0, 5).forEach(commit => {
        md += `- \`${commit.hash}\` ${commit.message}\\n`;
      });
    }

    md += `
---
*Report generated by Enhanced Reporting Dashboard*
`;

    return md;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(data) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Development Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #0066cc; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-warn { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Development Report</h1>
        <p><strong>Generated:</strong> ${data.timestamp}</p>
        <p><strong>Commit:</strong> ${data.metadata.git_commit} (${data.metadata.git_branch})</p>
        <p><strong>Platform:</strong> ${data.metadata.platform} ${data.metadata.arch}</p>
    </div>

    <div class="section">
        <h2>📈 Codebase Overview</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.codebase.lines?.source || 'N/A'}</div>
                <div>Source Lines</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.codebase.lines?.test || 'N/A'}</div>
                <div>Test Lines</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.codebase.lines?.test_ratio || 'N/A'}</div>
                <div>Test Ratio</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.codebase.dependencies?.total || 'N/A'}</div>
                <div>Dependencies</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🧪 Test Results</h2>
        ${data.testing.suites ? `
        <table>
            <tr><th>Suite</th><th>Duration</th><th>Passed</th><th>Failed</th><th>Status</th></tr>
            ${Object.entries(data.testing.suites).map(([suite, stats]) => `
            <tr>
                <td>${suite}</td>
                <td>${stats.duration}s</td>
                <td>${stats.passed}</td>
                <td>${stats.failed}</td>
                <td class="status-${stats.status === 'passed' ? 'pass' : 'fail'}">${stats.status}</td>
            </tr>
            `).join('')}
        </table>
        ` : '<p>No test data available</p>'}
    </div>

    <div class="section">
        <h2>🎯 Quality Metrics</h2>
        <div class="metric-grid">
            ${data.quality.lint ? `
            <div class="metric-card">
                <div class="metric-value status-${data.quality.lint.errors > 0 ? 'fail' : 'pass'}">${data.quality.lint.warnings}</div>
                <div>ESLint Warnings</div>
            </div>
            ` : ''}
            ${data.quality.typescript ? `
            <div class="metric-card">
                <div class="metric-value status-${data.quality.typescript.status === 'passed' ? 'pass' : 'fail'}">
                    ${data.quality.typescript.status === 'passed' ? '✅' : '❌'}
                </div>
                <div>TypeScript Check</div>
            </div>
            ` : ''}
            ${data.quality.format ? `
            <div class="metric-card">
                <div class="metric-value status-${data.quality.format.status === 'passed' ? 'pass' : 'fail'}">
                    ${data.quality.format.status === 'passed' ? '✅' : '❌'}
                </div>
                <div>Format Check</div>
            </div>
            ` : ''}
        </div>
    </div>

    <footer style="margin-top: 40px; text-align: center; color: #6c757d;">
        <p>Generated by Enhanced Reporting Dashboard</p>
    </footer>
</body>
</html>`;
  }

  /**
   * Create symlinks to latest reports
   */
  createLatestSymlinks(files) {
    try {
      Object.entries(files).forEach(([format, filepath]) => {
        const latestPath = path.join(this.reportsPath, `latest-report.${format}`);
        
        // Remove existing symlink
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        
        // Create new symlink
        fs.symlinkSync(path.basename(filepath), latestPath);
      });
    } catch (error) {
      // Symlink creation failed, but not critical
    }
  }

  /**
   * Generate summary for console output
   */
  generateSummary(data) {
    const summary = {
      codebase: `${data.codebase.lines?.total || 'N/A'} lines (${data.codebase.lines?.test_ratio || 'N/A'} test ratio)`,
      quality: `${data.quality.lint?.warnings || 0} warnings, ${data.quality.lint?.errors || 0} errors`,
      tests: data.testing.suites ? Object.keys(data.testing.suites).length + ' suites' : 'No test data',
      performance: data.performance.latest ? 'Performance data available' : 'No performance data'
    };

    return summary;
  }

  /**
   * Get git commit hash
   */
  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get git branch name
   */
  getGitBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }
}

// CLI interface
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Enhanced Reporting Dashboard

Usage: node scripts/generate-report.js [options]

Options:
  --format <format>    Report format (json|markdown|html|all) - default: all
  --output <path>      Output directory - default: reports/
  --verbose, -v        Show detailed output
  --help, -h           Show this help message

Examples:
  node scripts/generate-report.js
  node scripts/generate-report.js --format markdown
  node scripts/generate-report.js --verbose
    `);
    return;
  }

  const dashboard = new ReportingDashboard();
  
  try {
    console.log('📊 Generating development report...');
    
    const result = await dashboard.generateReport();
    
    console.log('\\n✅ Report generation completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Report ID: ${result.reportId}`);
    console.log('');
    console.log('📄 Generated files:');
    Object.entries(result.files).forEach(([format, filepath]) => {
      console.log(`  ${format.toUpperCase().padEnd(8)} ${filepath}`);
    });
    
    console.log('');
    console.log('📈 Summary:');
    Object.entries(result.summary).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(12)} ${value}`);
    });
    
    console.log('');
    console.log('🔗 Access reports:');
    console.log(`  Latest JSON:     reports/latest-report.json`);
    console.log(`  Latest Markdown: reports/latest-report.md`);
    console.log(`  Latest HTML:     reports/latest-report.html`);
    
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ReportingDashboard };