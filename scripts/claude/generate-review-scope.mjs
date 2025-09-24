#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';

const RING1_MAX = Number(process.env.RING1_MAX || 200);
const workspace = process.cwd();

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: workspace,
      ...options,
    }).trim();
  } catch (error) {
    const err = new Error(`git ${args.join(' ')} failed: ${error.message}`);
    err.original = error;
    throw err;
  }
}

function resolveBaseRef(baseRefInput) {
  if (baseRefInput && baseRefInput !== '') return baseRefInput;
  const defaultBase = process.env.GITHUB_BASE_REF;
  if (defaultBase && defaultBase !== '') return defaultBase;
  // Fallback to origin/main
  return 'origin/main';
}

function listRing0(baseRef, headRef) {
  if (!headRef) headRef = 'HEAD';
  const diffRange = `${baseRef}...${headRef}`;
  const output = runGit(['diff', '--name-status', diffRange]);
  const files = [];
  for (const line of output.split('\n')) {
    if (!line) continue;
    const [status, file] = line.split('\t');
    if (!file) continue;
    if (status === 'D') continue; // skip deletions
    // Normalize to posix for GitHub paths
    files.push(toPosix(file));
  }
  return Array.from(new Set(files));
}

const RELATIVE_IMPORT_RE = /import\s+[^;]*?from\s+['\"](\.{1,2}\/.+?)['\"]/g;
const EXPORT_IMPORT_RE = /export\s+[^;]*?from\s+['\"](\.{1,2}\/[^'\"]+)['\"]/g;
const REQUIRE_RE = /require\(\s*['\"](\.{1,2}\/[^'\"]+)['\"]\s*\)/g;

function extractRelativeImports(filePath, source) {
  const matches = new Set();
  const capture = (regex) => {
    let match;
    while ((match = regex.exec(source)) !== null) {
      matches.add(match[1]);
    }
  };
  capture(new RegExp(RELATIVE_IMPORT_RE));
  capture(new RegExp(EXPORT_IMPORT_RE));
  capture(new RegExp(REQUIRE_RE));
  return Array.from(matches).map((rel) => normalizeRelative(filePath, rel));
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function normalizeRelative(fromFile, relativePath) {
  const baseDir = dirname(fromFile);
  const resolved = normalize(join(baseDir, relativePath));
  if (resolved.endsWith('/')) return toPosix(resolved + 'index.ts');
  const ext = extname(resolved);
  if (ext) return toPosix(resolved);
  // Try appending known extensions
  for (const candidateExt of EXTENSIONS) {
    const candidate = `${resolved}${candidateExt}`;
    if (existsSync(candidate)) return toPosix(candidate);
  }
  // Accept directory index fallback
  for (const candidateExt of EXTENSIONS) {
    const candidate = join(resolved, `index${candidateExt}`);
    if (existsSync(candidate)) return toPosix(candidate);
  }
  return toPosix(resolved);
}

function toPosix(path) {
  if (!path) return path;
  return path.replace(/\\+/g, '/');
}

function readFileSafe(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function collectRing1(ring0) {
  const ring1 = new Set();
  const seenDirs = new Set();
  for (const file of ring0) {
    const dir = toPosix(dirname(file));
    if (!seenDirs.has(dir)) {
      seenDirs.add(dir);
      // Add peers in directory
      listDirPattern(dir, '*', ring1);
      // Add tests
      listDirPattern(dir, '*.test.*', ring1);
      listDirPattern(dir, '*.spec.*', ring1);
    }
    if (file.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) {
      const source = readFileSafe(file);
      if (!source) continue;
      const relImports = extractRelativeImports(file, source);
      for (const target of relImports) {
        ring1.add(target);
      }
    }
  }
  return ring1;
}

function listDirPattern(directory, globPattern, outSet) {
  const dir = directory === '.' ? '' : directory;
  const path = dir ? `${dir}/${globPattern}` : globPattern;
  const matches = runGit(['ls-files', path], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  for (const file of matches.split('\n')) {
    if (!file) continue;
    outSet.add(toPosix(file));
  }
}

function main() {
  const baseRef = resolveBaseRef(
    process.env.INPUT_BASE ||
      process.env.BASE_REF ||
      process.env.GITHUB_BASE_REF ||
      process.env.GITHUB_EVENT_PULL_REQUEST_BASE_REF ||
      'origin/main'
  );
  const headRef =
    process.env.INPUT_HEAD ||
    process.env.HEAD_REF ||
    process.env.GITHUB_SHA ||
    'HEAD';

  let fallback = false;
  let ring0 = [];
  try {
    ring0 = listRing0(baseRef, headRef);
  } catch (error) {
    console.error('[scope] Failed to list Ring 0:', error.message);
    fallback = true;
  }

  let ring1Set = new Set();
  if (!fallback) {
    try {
      ring1Set = collectRing1(ring0);
      // Drop ring0 files from ring1
      for (const file of ring0) ring1Set.delete(file);
    } catch (error) {
      console.error('[scope] Failed to expand Ring 1:', error.message);
      fallback = true;
    }
  }

  if (!fallback && ring1Set.size > RING1_MAX) {
    console.warn(
      `[scope] Ring 1 candidate size ${ring1Set.size} exceeds cap ${RING1_MAX}; falling back to Ring 0 only.`
    );
    fallback = true;
  }

  const ring1 = fallback ? [] : Array.from(ring1Set);

  ring0.sort();
  ring1.sort();

  const outputDir = process.env.OUTPUT_DIR || '.github/claude-cache';
  mkdirSync(outputDir, { recursive: true });
  const ring0Path = join(outputDir, 'ring0.json');
  const ring1Path = join(outputDir, 'ring1.json');
  writeFileSync(ring0Path, JSON.stringify(ring0, null, 2) + '\n');
  writeFileSync(ring1Path, JSON.stringify(ring1, null, 2) + '\n');

  const summary = {
    ring0Count: ring0.length,
    ring1Count: ring1.length,
    fallback,
    baseRef,
    headRef,
  };
  const summaryPath = join(outputDir, 'scope-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  // Optionally populate sparse-checkout patterns
  console.info(
    '[scope] ring0:',
    ring0.length,
    'ring1:',
    ring1.length,
    'fallback:',
    fallback ? 'yes' : 'no'
  );
}

main();
