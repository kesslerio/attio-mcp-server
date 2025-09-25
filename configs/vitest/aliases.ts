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

const escapeForRegex = (value: string): string =>
  value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const aliasEntries = Object.entries(aliasDirectories).flatMap(
  ([alias, relativePath]) => {
    const absolutePath = resolve(projectRoot, relativePath);
    return [
      {
        find: alias,
        replacement: absolutePath,
      },
      {
        find: new RegExp(`^${escapeForRegex(alias)}/(.+)\\.js$`),
        replacement: `${absolutePath}/$1.ts`,
      },
    ];
  }
);

aliasEntries.push({ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' });

export { aliasEntries };
