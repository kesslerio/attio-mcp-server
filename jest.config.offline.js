// Offline Jest configuration for Codex environments
// This config skips tests that require network access

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],

  // Offline optimizations
  setupFilesAfterEnv: [],
  testTimeout: 10_000,
  maxWorkers: '50%',

  // Skip tests that require network access
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/real-api',
    '/test/manual/',
    '/test/.*\\.manual\\.',
    'real-api-integration',
    'claude-desktop-scenario',
  ],

  // Skip slow or network-dependent tests
  globalTeardown: undefined,
  globalSetup: undefined,

  // Simplified module resolution for offline
  moduleNameMapping: {},

  // Reduce noise in offline environments
  silent: false,
  verbose: true,
};
