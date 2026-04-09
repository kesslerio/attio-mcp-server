import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildReleaseNotes } = require('../../scripts/release-notes.cjs');

describe('release notes builder', () => {
  const projectRoot = resolve(__dirname, '../..');
  const packageJson = JSON.parse(
    readFileSync(resolve(projectRoot, 'package.json'), 'utf8')
  );
  const changelogContent = readFileSync(
    resolve(projectRoot, 'CHANGELOG.md'),
    'utf8'
  );

  it('builds user-facing notes from the current changelog version', () => {
    const releaseNotes = buildReleaseNotes(
      changelogContent,
      packageJson.version
    );

    expect(releaseNotes).toContain(
      'This release adds record interaction history'
    );
    expect(releaseNotes).toContain("## What's New");
    expect(releaseNotes).toContain('### Added');
    expect(releaseNotes).toContain('### Fixed');
    expect(releaseNotes).toContain('npm install -g attio-mcp');
    expect(releaseNotes).toContain('npm update -g attio-mcp');
    expect(releaseNotes).toContain(
      '**Full Changelog**: https://github.com/kesslerio/attio-mcp-server/compare/v1.4.1...v1.5.0'
    );
  });
});
