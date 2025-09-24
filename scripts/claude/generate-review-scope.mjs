#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
} from 'node:path';

const RING1_MAX = Number(process.env.RING1_MAX || 200);
const workspace = process.cwd();
const runId = process.env.GITHUB_RUN_ID || `${Date.now()}`;

function sanitizeRef(ref, fallback) {
  if (!ref) return fallback;
  const trimmed = String(ref).trim();
  if (/^[0-9a-f]{40}$/i.test(trimmed)) return trimmed;
  if (/^(refs\/|origin\/)?[A-Za-z0-9._\/-]+$/.test(trimmed)) return trimmed;
  console.warn(
    `[scope] Unsafe git ref '${trimmed}' → using fallback '${fallback}'`
  );
  return fallback;
}

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: workspace,
      ...options,
    }).trim();
  } catch (error) {
    console.error(`[scope] git command failed: ${args.join(' ')}`);
    throw error;
  }
}

function resolveBaseRef(baseRefInput) {
  const defaultBase = process.env.GITHUB_BASE_REF || 'origin/main';
  return sanitizeRef(baseRefInput, sanitizeRef(defaultBase, 'origin/main'));
}

function ensureSafePath(filePath) {
  if (!filePath) return null;
  const normalized = normalize(filePath);
  if (isAbsolute(normalized)) {
    console.warn(`[scope] Skipping absolute path: ${normalized}`);
    return null;
  }
  const posix = toPosix(normalized);
  if (posix.startsWith('../') || posix.includes('/../')) {
    console.warn(`[scope] Skipping path outside workspace: ${posix}`);
    return null;
  }
  const rel = toPosix(relative('.', normalized));
  if (rel.startsWith('../')) {
    console.warn(`[scope] Skipping path escaping workspace: ${normalized}`);
    return null;
  }
  return rel;
}

function listRing0(baseRef, headRef) {
  const safeBase = sanitizeRef(baseRef, 'origin/main');
  const safeHead = sanitizeRef(headRef, 'HEAD');
  const diffRange = `${safeBase}...${safeHead}`;
  const output = runGit(['diff', '--name-status', diffRange]);
  const files = [];
  for (const line of output.split('\n')) {
    if (!line) continue;
    const [status, file] = line.split('\t');
    if (!file) continue;
    if (status === 'D') continue; // skip deletions
    const safePath = ensureSafePath(file);
    if (safePath) files.push(safePath);
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
  return Array.from(matches)
    .map((rel) => normalizeRelative(filePath, rel))
    .filter(Boolean);
}

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function normalizeRelative(fromFile, relativePath) {
  const baseDir = dirname(fromFile);
  const resolved = ensureSafePath(join(baseDir, relativePath));
  if (!resolved) return null;
  if (resolved.endsWith('/')) return ensureSafePath(`${resolved}index.ts`);
  const ext = extname(resolved);
  if (ext) return resolved;
  for (const candidateExt of EXTENSIONS) {
    const candidate = ensureSafePath(`${resolved}${candidateExt}`);
    if (candidate && existsSync(candidate)) return candidate;
  }
  for (const candidateExt of EXTENSIONS) {
    const candidate = ensureSafePath(join(resolved, `index${candidateExt}`));
    if (candidate && existsSync(candidate)) return candidate;
  }
  return resolved;
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
      listDirPattern(dir, '*', ring1);
      listDirPattern(dir, '*.test.*', ring1);
      listDirPattern(dir, '*.spec.*', ring1);
    }
    const ext = extname(file);
    if (EXTENSIONS.includes(ext)) {
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
  const safeDir = ensureSafePath(directory) || '';
  const pathSpec = safeDir ? `${safeDir}/${globPattern}` : globPattern;
  const matches = runGit(['ls-files', pathSpec], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  for (const file of matches.split('\n')) {
    if (!file) continue;
    const safePath = ensureSafePath(file);
    if (safePath) outSet.add(safePath);
  }
}

function main() {
  const baseRef = resolveBaseRef(
    process.env.INPUT_BASE ||
      process.env.BASE_REF ||
      process.env.GITHUB_EVENT_PULL_REQUEST_BASE_REF ||
      'origin/main'
  );
  const headRef = sanitizeRef(
    process.env.INPUT_HEAD ||
      process.env.HEAD_REF ||
      process.env.GITHUB_SHA ||
      'HEAD',
    'HEAD'
  );

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

  const baseOutput =
    ensureSafePath(process.env.OUTPUT_DIR || '.github/claude-cache') ||
    '.github/claude-cache';
  const outputDir =
    ensureSafePath(join(baseOutput, runId)) || `${baseOutput}/${runId}`;
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
    outputDir,
  };
  const summaryPath = join(outputDir, 'scope-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.info(
    '[scope] ring0:',
    ring0.length,
    'ring1:',
    ring1.length,
    'fallback:',
    fallback ? 'yes' : 'no'
  );
  console.info(`[scope] output: ${outputDir}`);
}

main();
