/**
 * Version consistency validation tests
 * Ensures package.json version matches CHANGELOG and other version references
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Version Consistency Validation', () => {
  const projectRoot = resolve(__dirname, '../..');

  it('should have consistent version across package.json and CHANGELOG.md', () => {
    // Read package.json version
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const packageVersion = packageJson.version;

    // Read CHANGELOG.md content
    const changelogPath = resolve(projectRoot, 'CHANGELOG.md');
    const changelogContent = readFileSync(changelogPath, 'utf-8');

    // Extract the latest version from CHANGELOG (first version entry)
    const versionMatch = changelogContent.match(/^## \[([^\]]+)\]/m);
    expect(versionMatch, 'Could not find version in CHANGELOG.md').toBeTruthy();

    const changelogVersion = versionMatch![1];

    // If it's "Unreleased", skip validation
    if (changelogVersion === 'Unreleased') {
      return;
    }

    expect(packageVersion).toBe(
      changelogVersion,
      `Package.json version (${packageVersion}) should match CHANGELOG.md version (${changelogVersion})`
    );
  });

  it('should have valid semver format in package.json', () => {
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;

    // Basic semver validation (major.minor.patch)
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    expect(version).toMatch(
      semverRegex,
      `Version ${version} should follow semantic versioning format`
    );
  });

  it('should have version comparison links in correct format in CHANGELOG', () => {
    const changelogPath = resolve(projectRoot, 'CHANGELOG.md');
    const changelogContent = readFileSync(changelogPath, 'utf-8');

    // Look for version comparison links at the bottom
    const linkPattern =
      /\[([^\]]+)\]: https:\/\/github\.com\/kesslerio\/attio-mcp-server\/compare\/([^.]+)\.\.\.([^.]+)/g;
    const links = [...changelogContent.matchAll(linkPattern)];

    if (links.length > 0) {
      links.forEach((match) => {
        const [, version, fromTag, toTag] = match;

        // Skip unreleased links
        if (version === 'Unreleased') return;

        // Version should match the toTag (without 'v' prefix)
        const expectedToTag = toTag.startsWith('v') ? toTag.slice(1) : toTag;
        expect(version).toBe(
          expectedToTag,
          `Version ${version} should match tag ${expectedToTag} in comparison link`
        );
      });
    }
  });

  it('should have required package.json fields for release', () => {
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Validate required fields for npm release
    expect(packageJson.name).toBeTruthy('Package must have a name');
    expect(packageJson.version).toBeTruthy('Package must have a version');
    expect(packageJson.description).toBeTruthy(
      'Package must have a description'
    );
    expect(packageJson.author).toBeTruthy('Package must have an author');
    expect(packageJson.license).toBeTruthy('Package must have a license');
    expect(packageJson.main || packageJson.exports).toBeTruthy(
      'Package must have main entry point'
    );
  });
});
