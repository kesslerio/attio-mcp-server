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
const ALWAYS_INCLUDE = [
  'tsconfig.json',
  'src/handlers/tools/standards/index.ts',
];

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

function listRing0(diffRange) {
  const output = runGit(['diff', '--name-status', diffRange]);
  const files = [];
  const deletions = [];
  for (const line of output.split('\n')) {
    if (!line) continue;
    const [status, file] = line.split('\t');
    if (!file) continue;
    const safePath = ensureSafePath(file);
    if (!safePath) continue;

    if (status === 'D') {
      // Track deletions separately (can't read content but should review rationale)
      deletions.push(safePath);
    } else {
      files.push(safePath);
    }
  }
  return {
    files: Array.from(new Set(files)),
    deletions: Array.from(new Set(deletions)),
  };
}

/**
 * Captures the unified diff for the given diff range.
 * This provides the actual line-by-line changes for more focused review.
 *
 * @param {string} diffRange - The git diff range (e.g., 'origin/main...HEAD')
 * @param {number} maxChars - Maximum characters to return (default 15000)
 * @returns {string} The unified diff content, truncated if necessary
 */
function captureUnifiedDiff(diffRange, maxChars = 15000) {
  try {
    let diff = runGit(['diff', '--unified=3', diffRange]);

    // Escape triple backticks to prevent Markdown fencing issues
    // Renders as \`\`\` inside the ```diff``` block, preserving visual intent without breaking fence
    diff = diff.replace(/```/g, '\\`\\`\\`');

    if (diff.length > maxChars) {
      return (
        diff.slice(0, maxChars) +
        `\n... [diff truncated at ${maxChars} chars - ${diff.length - maxChars} chars omitted]`
      );
    }
    return diff;
  } catch (error) {
    console.warn('[scope] Failed to capture unified diff:', error.message);
    return '';
  }
}

// Relative imports (./foo, ../bar)
const RELATIVE_IMPORT_RE = /import\s+[^;]*?from\s+['\"](\.{1,2}\/.+?)['\"]/g;
const EXPORT_IMPORT_RE = /export\s+[^;]*?from\s+['\"](\.{1,2}\/[^'\"]+)['\"]/g;
const REQUIRE_RE = /require\(\s*['\"](\.{1,2}\/[^'\"]+)['\"]\s*\)/g;

// Path alias imports (@/... maps to src/...)
// These are configured in tsconfig.json: "@/*": ["src/*"]
const PATH_ALIAS_IMPORT_RE = /import\s+[^;]*?from\s+['\"]@\/([^'\"]+)['\"]/g;
const PATH_ALIAS_EXPORT_RE = /export\s+[^;]*?from\s+['\"]@\/([^'\"]+)['\"]/g;

// Dynamic imports (await import(...) or just import(...))
// Captures both relative paths and @/ path aliases in dynamic import() calls
const DYNAMIC_RELATIVE_IMPORT_RE =
  /import\s*\(\s*['\"](\.{1,2}\/[^'\"]+)['\"]\s*\)/g;
const DYNAMIC_PATH_ALIAS_IMPORT_RE =
  /import\s*\(\s*['\"]@\/([^'\"]+)['\"]\s*\)/g;

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Resolves a path alias import to an actual file path.
 * @param {string} aliasPath - The path after @/ (e.g., "services/utils/foo.js")
 * @returns {string|null} - The resolved path (e.g., "src/services/utils/foo.ts") or null
 */
function resolvePathAlias(aliasPath) {
  // @/foo/bar.js → src/foo/bar
  let resolved = `src/${aliasPath}`;

  // Convert .js extension to .ts for source files (ESM imports use .js)
  if (resolved.endsWith('.js')) {
    resolved = resolved.replace(/\.js$/, '.ts');
  }

  // Check if file exists with various extensions
  const safePath = ensureSafePath(resolved);
  if (safePath && existsSync(safePath)) {
    return safePath;
  }

  // Try without extension (might be a directory with index)
  const withoutExt = resolved.replace(/\.[^/.]+$/, '');
  for (const ext of EXTENSIONS) {
    const candidate = ensureSafePath(`${withoutExt}${ext}`);
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  // Try as directory with index file
  for (const ext of EXTENSIONS) {
    const indexPath = ensureSafePath(join(resolved, `index${ext}`));
    if (indexPath && existsSync(indexPath)) {
      return indexPath;
    }
  }

  // Return the .ts path even if it doesn't exist (let caller handle)
  return safePath;
}

/**
 * Collects all @/ alias imports from Ring 0 files and pre-resolves them.
 * Returns an array of alias paths with resolved paths and existence info.
 * This provides Claude with pre-computed alias resolutions to prevent
 * false positive "missing file" errors when files exist outside sparse checkout.
 *
 * @param {string[]} ring0 - Array of Ring 0 file paths
 * @returns {Array<{alias: string, resolved: string, exists: boolean}>}
 */
function collectAliasResolutions(ring0) {
  const resolutions = new Map();

  // Use the same context-aware patterns as extractRelativeImports()
  // This avoids false positives from regex literals, comments, or strings
  const aliasPatterns = [
    new RegExp(PATH_ALIAS_IMPORT_RE),
    new RegExp(PATH_ALIAS_EXPORT_RE),
    new RegExp(DYNAMIC_PATH_ALIAS_IMPORT_RE),
  ];

  for (const file of ring0) {
    const ext = extname(file);
    if (!EXTENSIONS.includes(ext)) continue;
    const source = readFileSafe(file);
    if (!source) continue;

    // Collect unique alias paths from all import patterns
    for (const pattern of aliasPatterns) {
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const aliasPath = match[1];
        if (resolutions.has(aliasPath)) continue;

        const resolved = resolvePathAlias(aliasPath);
        const exists = resolved && existsSync(resolved);
        resolutions.set(aliasPath, {
          alias: `@/${aliasPath}`,
          resolved: resolved || `src/${aliasPath}`,
          exists,
        });
      }
    }
  }
  return Array.from(resolutions.values());
}

function extractRelativeImports(filePath, source) {
  const matches = new Set();
  const capture = (regex) => {
    let match;
    while ((match = regex.exec(source)) !== null) {
      matches.add(match[1]);
    }
  };

  // Capture relative imports (static)
  capture(new RegExp(RELATIVE_IMPORT_RE));
  capture(new RegExp(EXPORT_IMPORT_RE));
  capture(new RegExp(REQUIRE_RE));
  // Capture relative imports (dynamic)
  capture(new RegExp(DYNAMIC_RELATIVE_IMPORT_RE));

  // Capture path alias imports (@/...)
  const aliasMatches = new Set();
  const captureAlias = (regex) => {
    let match;
    while ((match = regex.exec(source)) !== null) {
      aliasMatches.add(match[1]);
    }
  };
  // Capture path alias imports (static)
  captureAlias(new RegExp(PATH_ALIAS_IMPORT_RE));
  captureAlias(new RegExp(PATH_ALIAS_EXPORT_RE));
  // Capture path alias imports (dynamic)
  captureAlias(new RegExp(DYNAMIC_PATH_ALIAS_IMPORT_RE));

  // Resolve relative imports
  const relativeResolved = Array.from(matches)
    .map((rel) => normalizeRelative(filePath, rel))
    .filter(Boolean);

  // Resolve path alias imports
  const aliasResolved = Array.from(aliasMatches)
    .map((alias) => resolvePathAlias(alias))
    .filter(Boolean);

  return [...relativeResolved, ...aliasResolved];
}

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

  // Compute diffRange once for both listRing0 and captureUnifiedDiff
  const diffRange = `${baseRef}...${headRef}`;

  let fallback = false;
  let ring0 = [];
  let deletions = [];
  try {
    const result = listRing0(diffRange);
    ring0 = result.files;
    deletions = result.deletions;
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

  const extraContext = [];
  for (const candidate of ALWAYS_INCLUDE) {
    const safePath = ensureSafePath(candidate);
    if (!safePath) continue;
    if (!existsSync(safePath)) continue;
    if (ring0.includes(safePath)) continue;
    extraContext.push(safePath);
  }

  if (!fallback) {
    for (const path of extraContext) ring1Set.add(path);
  }

  const ring1 = fallback ? extraContext : Array.from(ring1Set);

  ring0.sort();
  ring1.sort();
  deletions.sort();

  const baseOutput =
    ensureSafePath(process.env.OUTPUT_DIR || '.github/claude-cache') ||
    '.github/claude-cache';
  const outputDir =
    ensureSafePath(join(baseOutput, runId)) || `${baseOutput}/${runId}`;
  mkdirSync(outputDir, { recursive: true });

  // Write standard ring files
  const ring0Path = join(outputDir, 'ring0.json');
  const ring1Path = join(outputDir, 'ring1.json');
  writeFileSync(ring0Path, JSON.stringify(ring0, null, 2) + '\n');
  writeFileSync(ring1Path, JSON.stringify(ring1, null, 2) + '\n');

  // Write alias resolution hints for Claude (pre-computed from full repo)
  let aliasResolutionsPath = null;
  const aliasResolutions = collectAliasResolutions(ring0);
  if (aliasResolutions.length > 0) {
    aliasResolutionsPath = join(outputDir, 'alias-resolutions.json');
    writeFileSync(
      aliasResolutionsPath,
      JSON.stringify(aliasResolutions, null, 2) + '\n'
    );
  }

  // Write deletions summary if there are any deletions
  let deletionsSummaryPath = null;
  if (deletions.length > 0) {
    deletionsSummaryPath = join(outputDir, 'DELETIONS.md');
    const deletionContent = [
      '# Deleted Files in This PR',
      '',
      `This PR deletes ${deletions.length} file(s):`,
      '',
      ...deletions.map((f) => `- \`${f}\``),
      '',
      '**Review Focus:** Verify that:',
      '1. Deletions are intentional and justified in the PR description',
      '2. No critical functionality is lost without replacement',
      '3. Coverage gaps are tracked or mitigated',
      '4. Related documentation/tests are updated accordingly',
      '', // Ensure file ends with newline for heredoc safety
    ].join('\n');
    writeFileSync(deletionsSummaryPath, deletionContent);
  }

  // Capture and write unified diff for line-level review scope
  let hasDiff = false;
  let diffPath = null;
  const unifiedDiff = captureUnifiedDiff(diffRange);
  if (unifiedDiff) {
    diffPath = join(outputDir, 'diff.txt');
    writeFileSync(diffPath, unifiedDiff + '\n');
    hasDiff = true;
  }

  const summary = {
    ring0Count: ring0.length,
    ring1Count: ring1.length,
    deletionsCount: deletions.length,
    hasDiff,
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
    'deletions:',
    deletions.length,
    'diff:',
    hasDiff ? 'yes' : 'no',
    'fallback:',
    fallback ? 'yes' : 'no'
  );
  console.info(`[scope] output: ${outputDir}`);
  if (deletionsSummaryPath) {
    console.info(`[scope] deletions summary: ${deletionsSummaryPath}`);
  }
  if (diffPath) {
    console.info(`[scope] unified diff: ${diffPath}`);
  }
  if (aliasResolutionsPath) {
    console.info(
      `[scope] alias resolutions: ${aliasResolutionsPath} (${aliasResolutions.length} entries)`
    );
  }
}

main();
