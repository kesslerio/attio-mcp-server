#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const INSTALLATION_BLOCK = [
  '## Installation',
  '',
  '```bash',
  'npm install -g attio-mcp',
  '```',
  '',
  'Or update your existing installation:',
  '',
  '```bash',
  'npm update -g attio-mcp',
  '```',
];

function normalizeVersion(input) {
  if (!input) {
    throw new Error('A version argument is required, for example: v1.5.0');
  }

  return input.replace(/^v/, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractVersionSection(changelogContent, version) {
  const normalizedVersion = normalizeVersion(version);
  const sectionPattern = new RegExp(
    `^## \\[${escapeRegExp(normalizedVersion)}\\](?: - .+)?\\n([\\s\\S]*?)(?=^## \\[|\\Z)`,
    'm'
  );
  const match = changelogContent.match(sectionPattern);

  if (!match) {
    throw new Error(
      `Could not find CHANGELOG section for version ${normalizedVersion}`
    );
  }

  return `## [${normalizedVersion}]${match[0].slice(match[0].indexOf(']') + 1)}`.trim();
}

function extractSummary(sectionContent, version) {
  const summaryMatch = sectionContent.match(
    /^\*\*TL;DR for Users\*\*:\s*(.+)$/m
  );

  if (!summaryMatch) {
    throw new Error(
      `Missing "**TL;DR for Users**" summary in CHANGELOG section for ${normalizeVersion(version)}`
    );
  }

  return summaryMatch[1].trim();
}

function stripHeadingAndSummary(sectionContent) {
  const lines = sectionContent.split('\n');
  const filteredLines = [];
  let skippedHeading = false;
  let skippedSummary = false;

  for (const line of lines) {
    if (!skippedHeading) {
      skippedHeading = true;
      continue;
    }

    if (!skippedSummary && line.startsWith('**TL;DR for Users**:')) {
      skippedSummary = true;
      continue;
    }

    filteredLines.push(line);
  }

  return filteredLines.join('\n').trim();
}

function extractCompareUrl(changelogContent, version) {
  const normalizedVersion = normalizeVersion(version);
  const compareLinkPattern = new RegExp(
    `^\\[${escapeRegExp(normalizedVersion)}\\]:\\s+(https://github\\.com/kesslerio/attio-mcp-server/(?:compare|releases/tag)/\\S+)$`,
    'm'
  );
  const match = changelogContent.match(compareLinkPattern);

  if (!match) {
    throw new Error(
      `Missing compare link for version ${normalizedVersion} in CHANGELOG footer`
    );
  }

  return match[1];
}

function buildReleaseNotes(changelogContent, version) {
  const sectionContent = extractVersionSection(changelogContent, version);
  const summary = extractSummary(sectionContent, version);
  const compareUrl = extractCompareUrl(changelogContent, version);
  const sectionBody = stripHeadingAndSummary(sectionContent);

  return [
    summary,
    '',
    "## What's New",
    '',
    sectionBody,
    '',
    ...INSTALLATION_BLOCK,
    '',
    `**Full Changelog**: ${compareUrl}`,
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const args = [...argv];
  const version = args.shift();
  let outputPath = null;
  let validateOnly = false;

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === '--validate') {
      validateOnly = true;
      continue;
    }

    if (arg === '--output') {
      outputPath = args.shift() || null;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { version, outputPath, validateOnly };
}

function main() {
  const { version, outputPath, validateOnly } = parseArgs(
    process.argv.slice(2)
  );
  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  const releaseNotes = buildReleaseNotes(changelogContent, version);

  if (validateOnly) {
    process.stdout.write(
      `Validated release notes for ${normalizeVersion(version)}\n`
    );
    return;
  }

  if (outputPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputPath), releaseNotes);
    return;
  }

  process.stdout.write(releaseNotes);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  buildReleaseNotes,
  extractCompareUrl,
  extractSummary,
  extractVersionSection,
  normalizeVersion,
};
