# CI/CD Documentation

This directory contains documentation for the Attio MCP Server's CI/CD pipeline and testing infrastructure.

## Contents

- **[Smart Testing](smart-testing.md)** - Phase IV intelligent testing system with test impact analysis, performance budgets, and CI/CD optimization

## Quick Reference

### Test Categories
- `npm run test:smoke` - Ultra-fast critical path tests (<30s)
- `npm run test:core` - Services and handlers (<2m)
- `npm run test:extended` - Full suite minus integration (<5m)
- `npm run test:affected` - Smart selection based on git changes

### Developer Tools
- `npm run ci:local` - Simulate GitHub Actions locally
- `npm run fix:all` - Auto-fix common issues
- `npm run perf:budgets` - Check performance thresholds
- `npm run report:generate` - Generate development metrics
- `npm run emergency:rollback` - Quick recovery system

## Benefits

- **40-60% CI time reduction** through intelligent test selection
- **Proactive performance monitoring** with automated alerts
- **Local CI validation** before pushing changes
- **Automated quality fixes** for common issues