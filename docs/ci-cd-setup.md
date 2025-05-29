# CI/CD Pipeline Documentation

This document describes the comprehensive CI/CD pipeline implemented for the Attio MCP Server project.

## Overview

The CI/CD pipeline consists of three main workflows:
1. **CI Pipeline** (`ci.yml`) - Runs on every push and pull request
2. **Maintenance** (`maintenance.yml`) - Weekly maintenance tasks and health checks
3. **Release Pipeline** (`release.yml`) - Automated release creation and deployment

## CI Pipeline (`ci.yml`)

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches  
- Manual workflow dispatch

### Jobs

#### 1. Lint & Type Check
- **Runtime**: ~5-10 minutes
- **Node.js**: 20.x
- **Tasks**:
  - ESLint code quality checks
  - TypeScript type checking
  - Code formatting verification

#### 2. Test Matrix
- **Runtime**: ~15-30 minutes per Node.js version
- **Node.js Versions**: 18.x, 20.x, 22.x
- **Tasks**:
  - Build verification
  - Offline unit tests
  - Coverage report generation
  - Codecov upload (Node 20.x only)

#### 3. Integration Tests
- **Runtime**: ~30-45 minutes
- **Triggers**: Push events or PRs with `run-integration-tests` label
- **Requirements**: `ATTIO_TEST_API_KEY` and `ATTIO_TEST_WORKSPACE_ID` secrets
- **Tasks**:
  - Real API integration tests
  - Test result artifact upload

#### 4. Build Verification
- **Runtime**: ~10-15 minutes
- **Tasks**:
  - Production build creation
  - CLI functionality verification
  - Build artifact validation

#### 5. Security Audit
- **Runtime**: ~5-10 minutes
- **Tasks**:
  - npm security audit
  - Dependency vulnerability scanning
  - Security report generation

#### 6. Performance Tests
- **Runtime**: ~15-20 minutes
- **Triggers**: Push to `main` branch only
- **Tasks**:
  - Performance benchmark execution
  - Performance regression detection

#### 7. Test Results Summary
- **Dependencies**: All test jobs
- **Tasks**:
  - Aggregate test results
  - Generate summary report
  - Post PR comments with results

#### 8. Quality Gates
- **Triggers**: Pull requests only
- **Tasks**:
  - Enforce quality thresholds
  - Block merge if critical checks fail

## Maintenance Pipeline (`maintenance.yml`)

### Schedule
- **Weekly**: Sundays at 2 AM UTC
- **Manual**: Workflow dispatch trigger

### Jobs

#### 1. Dependency Health Check
- Outdated package detection
- Security vulnerability scanning
- Unused dependency identification

#### 2. Coverage Tracking
- Weekly coverage report generation
- Coverage trend analysis
- Badge updates

#### 3. Test Health Report
- Test suite health analysis
- Failure pattern detection
- Test performance metrics

#### 4. Performance Baseline
- CLI startup time measurement
- Memory usage analysis
- Performance regression detection

#### 5. Documentation Health
- Broken link detection
- Documentation completeness check
- Example freshness verification

## Release Pipeline (`release.yml`)

### Triggers
- Git tags matching `v*.*.*` pattern
- Manual workflow dispatch with version input

### Jobs

#### 1. Validate Release
- Version format validation
- Full test suite execution
- Build verification
- Uncommitted changes check

#### 2. Create Release Build
- Production build creation
- Artifact packaging
- Tarball generation

#### 3. Create GitHub Release
- Changelog generation
- Release notes compilation
- Asset attachment
- Release publication

#### 4. Post-Release Tasks
- Documentation updates
- Success notifications
- Artifact verification

#### 5. Failure Cleanup
- Failed release cleanup
- Error reporting
- Rollback procedures

## Configuration

### Required Secrets

#### For Integration Tests
```
ATTIO_TEST_API_KEY - Test API key for integration tests
ATTIO_TEST_WORKSPACE_ID - Test workspace ID
```

#### For Coverage Reporting
```
CODECOV_TOKEN - Codecov integration token
```

#### For Releases
```
GITHUB_TOKEN - Automatically provided by GitHub Actions
```

### Environment Variables

The CI pipeline uses these environment variables:
- `NODE_VERSION_MATRIX` - Node.js versions to test against
- `ATTIO_API_KEY` - Attio API key (for integration tests)
- `ATTIO_WORKSPACE_ID` - Attio workspace ID (for integration tests)

## Branch Protection Rules

To fully implement the CI/CD pipeline, configure these branch protection rules for the `main` branch:

### Required Status Checks
- `Lint & Type Check`
- `Test (Node 18.x)`
- `Test (Node 20.x)` 
- `Test (Node 22.x)`
- `Build Verification`
- `Security Audit`
- `Quality Gates`

### Additional Rules
- ✅ Require branches to be up to date before merging
- ✅ Require linear history
- ✅ Include administrators in restrictions
- ✅ Restrict pushes that create files

## Test Commands

The pipeline uses these npm scripts:

### Core Testing
```bash
npm run test:offline          # Offline tests only
npm run test:coverage:offline # Coverage for offline tests
npm run test:ci              # CI-optimized test run
npm run test:integration     # Integration tests only
npm run test:unit           # Unit tests only
```

### Quality Checks
```bash
npm run lint:check          # ESLint checking
npm run check              # TypeScript type checking
npm run check:format       # Prettier format checking
npm run build              # Production build
```

## Coverage Reporting

### Thresholds
- **Statements**: 5% (starting threshold)
- **Branches**: 5% (starting threshold)
- **Functions**: 10% (starting threshold)
- **Lines**: 5% (starting threshold)

### Reports
- **HTML**: Available in CI artifacts
- **LCOV**: Uploaded to Codecov
- **JSON**: Available for analysis

## Performance Monitoring

### Metrics Tracked
- **CLI Startup Time**: Time to execute `--help` command
- **Memory Usage**: RSS, heap used, heap total
- **Test Execution Time**: Per test suite timing
- **Build Time**: TypeScript compilation duration

### Regression Detection
- Alerts on significant performance degradation
- Historical performance tracking
- Baseline comparisons

## Troubleshooting

### Common Issues

#### Failed Integration Tests
1. Check `ATTIO_TEST_API_KEY` secret is set
2. Verify test workspace permissions
3. Review API rate limiting

#### Coverage Upload Failures
1. Verify `CODECOV_TOKEN` is configured
2. Check coverage file generation
3. Review Codecov service status

#### Build Failures
1. Check Node.js version compatibility
2. Verify dependency installation
3. Review TypeScript compilation errors

#### Performance Test Failures
1. Check resource availability
2. Review performance thresholds
3. Verify baseline measurements

### Manual Interventions

#### Trigger Integration Tests on PR
Add the `run-integration-tests` label to any PR to force integration test execution.

#### Skip CI Checks
Add `[ci skip]` to commit messages to bypass CI pipeline (not recommended for main branches).

#### Manual Release
Use workflow dispatch on the release pipeline with a specific version string.

## Monitoring and Alerts

### GitHub Actions
- Workflow run notifications
- Failed job alerts
- Performance degradation warnings

### Codecov
- Coverage decrease alerts
- Pull request coverage reports
- Coverage trend analysis

### Dependencies
- Security vulnerability alerts
- Outdated dependency notifications
- License compliance monitoring

## Future Enhancements

### Planned Improvements
1. **Deployment Pipeline**: Automated deployment to staging/production
2. **E2E Testing**: Browser-based end-to-end tests
3. **Visual Regression**: Screenshot comparison testing
4. **Load Testing**: API performance under load
5. **Security Scanning**: Advanced security analysis tools

### Metrics Expansion
1. **Code Quality**: Technical debt tracking
2. **Performance**: More granular performance metrics
3. **User Experience**: UX metrics for CLI tools
4. **Reliability**: Error rate and uptime tracking

This CI/CD pipeline ensures high code quality, comprehensive testing, and reliable releases while providing fast feedback to developers.