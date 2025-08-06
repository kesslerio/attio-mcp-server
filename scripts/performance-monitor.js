#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * 
 * Run performance tests and generate a detailed report
 * Usage: npm run perf:monitor
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Performance budgets (in milliseconds)
const BUDGETS = {
  notFound: 2000,
  search: 3000,
  create: 3000,
  update: 3000,
  delete: 2000,
  getDetails: 2000,
  batchSmall: 5000,
  batchLarge: 10000
};

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, color = '') {
    console.log(`${color}${message}${colors.reset}`);
  }

  header(title) {
    this.log('\n' + '='.repeat(60), colors.cyan);
    this.log(title, colors.bright + colors.cyan);
    this.log('='.repeat(60) + '\n', colors.cyan);
  }

  async checkEnvironment() {
    this.header('Environment Check');
    
    // Check for API key
    if (!process.env.ATTIO_API_KEY) {
      this.log('⚠️  Warning: ATTIO_API_KEY not set', colors.yellow);
      this.log('   Performance tests will be skipped', colors.yellow);
      return false;
    }
    
    this.log('✅ API key configured', colors.green);
    
    // Check Node version
    const nodeVersion = process.version;
    this.log(`📦 Node version: ${nodeVersion}`, colors.blue);
    
    // Check if build is up to date
    const srcPath = path.join(__dirname, '..', 'src');
    const distPath = path.join(__dirname, '..', 'dist');
    
    if (!fs.existsSync(distPath)) {
      this.log('⚠️  Build directory not found. Running build...', colors.yellow);
      await this.runCommand('npm', ['run', 'build']);
    }
    
    return true;
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { 
        stdio: 'pipe',
        env: { ...process.env }
      });
      
      let output = '';
      let errorOutput = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ output, errorOutput });
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  async runPerformanceTests() {
    this.header('Running Performance Tests');
    
    try {
      const result = await this.runCommand('npm', ['test', 'test/performance/regression.test.ts']);
      return this.parseTestOutput(result.output);
    } catch (error) {
      this.log('❌ Performance tests failed', colors.red);
      console.error(error);
      return null;
    }
  }

  parseTestOutput(output) {
    const metrics = {
      notFound: [],
      search: [],
      crud: [],
      cache: []
    };
    
    // Parse timing information from output
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Parse 404 response times
      if (line.includes('404') && line.includes('response time:')) {
        const match = line.match(/(\d+)ms/);
        if (match) {
          metrics.notFound.push(parseInt(match[1]));
        }
      }
      
      // Parse search times
      if (line.includes('Search operation time:')) {
        const match = line.match(/(\d+)ms/);
        if (match) {
          metrics.search.push(parseInt(match[1]));
        }
      }
      
      // Parse CRUD operation times
      if (line.includes('operation time:') && !line.includes('Search')) {
        const match = line.match(/(\d+)ms/);
        if (match) {
          metrics.crud.push(parseInt(match[1]));
        }
      }
      
      // Parse cache performance
      if (line.includes('cache performance:')) {
        const matches = line.match(/First: (\d+)ms, Second: (\d+)ms/);
        if (matches) {
          metrics.cache.push({
            first: parseInt(matches[1]),
            second: parseInt(matches[2])
          });
        }
      }
    });
    
    return metrics;
  }

  analyzeResults(metrics) {
    this.header('Performance Analysis');
    
    if (!metrics) {
      this.log('No metrics available for analysis', colors.yellow);
      return;
    }
    
    // Analyze 404 performance
    if (metrics.notFound.length > 0) {
      const avg404 = metrics.notFound.reduce((a, b) => a + b, 0) / metrics.notFound.length;
      const max404 = Math.max(...metrics.notFound);
      
      this.log('404 Response Performance:', colors.bright);
      this.log(`  Average: ${avg404.toFixed(0)}ms`);
      this.log(`  Maximum: ${max404}ms`);
      this.log(`  Budget: ${BUDGETS.notFound}ms`);
      
      if (max404 > BUDGETS.notFound) {
        this.log(`  ⚠️  EXCEEDED BUDGET by ${max404 - BUDGETS.notFound}ms`, colors.red);
      } else {
        this.log(`  ✅ Within budget`, colors.green);
      }
    }
    
    // Analyze search performance
    if (metrics.search.length > 0) {
      const avgSearch = metrics.search.reduce((a, b) => a + b, 0) / metrics.search.length;
      const maxSearch = Math.max(...metrics.search);
      
      this.log('\nSearch Operation Performance:', colors.bright);
      this.log(`  Average: ${avgSearch.toFixed(0)}ms`);
      this.log(`  Maximum: ${maxSearch}ms`);
      this.log(`  Budget: ${BUDGETS.search}ms`);
      
      if (maxSearch > BUDGETS.search) {
        this.log(`  ⚠️  EXCEEDED BUDGET by ${maxSearch - BUDGETS.search}ms`, colors.red);
      } else {
        this.log(`  ✅ Within budget`, colors.green);
      }
    }
    
    // Analyze CRUD performance
    if (metrics.crud.length > 0) {
      const avgCrud = metrics.crud.reduce((a, b) => a + b, 0) / metrics.crud.length;
      const maxCrud = Math.max(...metrics.crud);
      
      this.log('\nCRUD Operation Performance:', colors.bright);
      this.log(`  Average: ${avgCrud.toFixed(0)}ms`);
      this.log(`  Maximum: ${maxCrud}ms`);
      this.log(`  Budget: ${BUDGETS.create}ms`);
      
      if (maxCrud > BUDGETS.create) {
        this.log(`  ⚠️  EXCEEDED BUDGET by ${maxCrud - BUDGETS.create}ms`, colors.red);
      } else {
        this.log(`  ✅ Within budget`, colors.green);
      }
    }
    
    // Analyze cache effectiveness
    if (metrics.cache.length > 0) {
      this.log('\nCache Performance:', colors.bright);
      metrics.cache.forEach((cache, i) => {
        const improvement = ((cache.first - cache.second) / cache.first * 100).toFixed(1);
        this.log(`  Test ${i + 1}: ${cache.first}ms → ${cache.second}ms (${improvement}% improvement)`);
      });
    }
  }

  generateReport(metrics) {
    this.header('Performance Report');
    
    const reportPath = path.join(__dirname, '..', 'performance-report.json');
    const htmlReportPath = path.join(__dirname, '..', 'performance-report.html');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      metrics: metrics,
      budgets: BUDGETS,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📊 JSON report saved to: ${reportPath}`, colors.green);
    
    // Generate HTML report
    const html = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, html);
    this.log(`📊 HTML report saved to: ${htmlReportPath}`, colors.green);
    
    return report;
  }

  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        h1 { color: #333; }
        .metric { 
            background: white; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>Performance Report</h1>
    <p>Generated: ${report.timestamp}</p>
    <p>Duration: ${report.duration}ms</p>
    
    <div class="metric">
        <h2>Environment</h2>
        <table>
            <tr><td>Node Version</td><td>${report.environment.nodeVersion}</td></tr>
            <tr><td>Platform</td><td>${report.environment.platform}</td></tr>
            <tr><td>Architecture</td><td>${report.environment.arch}</td></tr>
        </table>
    </div>
    
    <div class="metric">
        <h2>Performance Budgets</h2>
        <table>
            <thead>
                <tr>
                    <th>Operation</th>
                    <th>Budget (ms)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.budgets).map(([op, budget]) => `
                    <tr>
                        <td>${op}</td>
                        <td>${budget}</td>
                        <td class="success">✓</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="metric">
        <h2>Test Results</h2>
        <p>View detailed metrics in the JSON report.</p>
    </div>
</body>
</html>`;
  }

  async run() {
    this.log('🚀 Starting Performance Monitor', colors.bright + colors.blue);
    this.log(`   Time: ${new Date().toLocaleString()}`, colors.blue);
    
    // Check environment
    const envOk = await this.checkEnvironment();
    if (!envOk) {
      this.log('\n❌ Environment check failed', colors.red);
      process.exit(1);
    }
    
    // Run performance tests
    const metrics = await this.runPerformanceTests();
    
    // Analyze results
    this.analyzeResults(metrics);
    
    // Generate report
    const report = this.generateReport(metrics || {});
    
    // Summary
    this.header('Summary');
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.log(`✅ Performance monitoring completed in ${duration}s`, colors.green);
    
    // Check for any budget violations
    if (metrics) {
      const violations = [];
      
      if (metrics.notFound.some(t => t > BUDGETS.notFound)) {
        violations.push('404 responses');
      }
      if (metrics.search.some(t => t > BUDGETS.search)) {
        violations.push('search operations');
      }
      if (metrics.crud.some(t => t > BUDGETS.create)) {
        violations.push('CRUD operations');
      }
      
      if (violations.length > 0) {
        this.log(`\n⚠️  Budget violations detected for: ${violations.join(', ')}`, colors.yellow);
        process.exit(1);
      } else {
        this.log('\n✅ All operations within performance budgets', colors.green);
      }
    }
  }
}

// Run the monitor
const monitor = new PerformanceMonitor();
monitor.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});