import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..', '..');

const aliasDirectories: Record<string, string> = {
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

// Performance optimization: Cache regex compilation and use more efficient escape
const escapeForRegex = (value: string): string =>
  value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

// Pre-compile regex patterns for better performance
const regexCache = new Map<string, RegExp>();
const getOrCreateRegex = (pattern: string): RegExp => {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, new RegExp(pattern));
  }
  return regexCache.get(pattern)!;
};

// Pre-compute alias entries for better startup performance
const aliasEntries: Array<{ find: string | RegExp; replacement: string }> = [];

// Add string aliases and their corresponding .js mappings
for (const [alias, relativePath] of Object.entries(aliasDirectories)) {
  const absolutePath = resolve(projectRoot, relativePath);

  // String alias mapping
  aliasEntries.push({
    find: alias,
    replacement: absolutePath,
  });

  // Cached regex for .js extension mapping
  const regexPattern = `^${escapeForRegex(alias)}/(.+)\\.js$`;
  aliasEntries.push({
    find: getOrCreateRegex(regexPattern),
    replacement: `${absolutePath}/$1.ts`,
  });
}

// Relative path .js mapping (cached)
aliasEntries.push({
  find: getOrCreateRegex('^(\\.{1,2}/.*)\\.js$'),
  replacement: '$1',
});

export { aliasEntries };
