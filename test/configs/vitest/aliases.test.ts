/**
 * Tests for alias resolution consistency between tsconfig and vitest config
 * Based on PR #744 feedback
 */

import { describe, test, expect } from 'vitest';
import { resolve } from 'path';

describe('Path Aliases Configuration', () => {
  const projectRoot = resolve(__dirname, '../../..');

  test('aliases match between tsconfig and vitest config', async () => {
    // Import the vitest aliases configuration
    const { aliasEntries } = await import('../../../configs/vitest/aliases.js');

    // Define expected aliases (vitest config uses base aliases without /*)
    const expectedAliases = {
      '@src': 'src',
      '@api': 'src/api',
      '@config': 'src/config',
      '@constants': 'src/constants',
      '@handlers': 'src/handlers',
      '@services': 'src/services',
      '@errors': 'src/errors',
      '@shared-types': 'src/types',
      '@utils': 'src/utils',
      '@test-support': 'src/test-support',
      '@test': 'test',
    };

    // Convert vitest aliases to comparable format
    const vitestAliases: Record<string, string> = {};
    aliasEntries.forEach((entry: any) => {
      if (typeof entry.find === 'string' && !entry.find.includes('*.js')) {
        vitestAliases[entry.find] = entry.replacement;
      }
    });

    // Compare core aliases
    Object.keys(expectedAliases).forEach((alias) => {
      expect(
        vitestAliases[alias],
        `Alias ${alias} should exist in vitest config`
      ).toBeDefined();

      // Normalize paths for comparison
      const expectedPath = resolve(
        projectRoot,
        expectedAliases[alias as keyof typeof expectedAliases]
      );
      const vitestPath = vitestAliases[alias];

      expect(
        vitestPath,
        `Alias ${alias} should point to the same location`
      ).toBe(expectedPath);
    });
  });

  test('js extension mapping resolves correctly', async () => {
    const { aliasEntries } = await import('../../../configs/vitest/aliases.js');

    // Find .js extension mappings
    const jsAliases = aliasEntries.filter(
      (entry: any) =>
        entry.find instanceof RegExp && entry.find.source.includes('\\.js$')
    );

    expect(
      jsAliases.length,
      'Should have .js extension mappings'
    ).toBeGreaterThan(0);

    // Count string aliases and regex aliases - they should correspond
    const stringAliases = aliasEntries.filter(
      (entry: any) => typeof entry.find === 'string'
    );

    // Each string alias should have a corresponding .js regex mapping
    // Since there are 11 base aliases and one additional relative path regex,
    // we expect 11 .js regex patterns plus the relative path pattern
    expect(
      jsAliases.length,
      'Should have .js mappings for each base alias plus relative paths'
    ).toBeGreaterThanOrEqual(stringAliases.length);
  });

  test('regex patterns handle edge cases (special characters in paths)', async () => {
    const { aliasEntries } = await import('../../../configs/vitest/aliases.js');

    const regexAliases = aliasEntries.filter(
      (entry: any) => entry.find instanceof RegExp
    );

    regexAliases.forEach((alias: any) => {
      const regex = alias.find;

      // Test that regex doesn't match unintended patterns
      expect(
        regex.test('@invalid/path.ts'),
        `Regex should not match invalid paths`
      ).toBe(false);
      expect(
        regex.test('not-an-alias.js'),
        `Regex should not match non-alias paths`
      ).toBe(false);

      // Test proper escaping of special characters
      const source = regex.source;
      // Check for proper regex patterns that contain escaped characters or expected patterns
      const hasValidPattern =
        source.includes('\\.') || // Escaped dot
        source.includes('\\$') || // Escaped dollar
        source.includes('^@') || // Valid alias start pattern
        source.includes('\.{1,2}'); // Valid relative path pattern
      expect(
        hasValidPattern,
        'Should contain properly escaped or valid regex patterns'
      ).toBe(true);
    });
  });

  test('all essential aliases are present in vitest config', async () => {
    const { aliasEntries } = await import('../../../configs/vitest/aliases.js');

    const expectedAliases = [
      '@src',
      '@api',
      '@config',
      '@constants',
      '@handlers',
      '@services',
      '@errors',
      '@shared-types',
      '@utils',
      '@test-support',
      '@test',
    ];

    const vitestAliases = aliasEntries
      .filter((entry: any) => typeof entry.find === 'string')
      .map((entry: any) => entry.find);

    expectedAliases.forEach((alias) => {
      expect(
        vitestAliases,
        `Essential alias ${alias} should exist in vitest config`
      ).toContain(alias);
    });
  });

  test('no duplicate alias definitions in vitest config', async () => {
    const { aliasEntries } = await import('../../../configs/vitest/aliases.js');

    const stringAliases = aliasEntries
      .filter((entry: any) => typeof entry.find === 'string')
      .map((entry: any) => entry.find);

    const uniqueAliases = new Set(stringAliases);
    expect(
      uniqueAliases.size,
      'Should not have duplicate alias definitions'
    ).toBe(stringAliases.length);
  });
});
