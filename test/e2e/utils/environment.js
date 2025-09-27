import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { createE2ELogger } from './logger.js';

export const DEFAULT_ENV_FILES = ['.env', '.env.e2e', '.env.local'];

function resolveEnvFilePath(filePath, cwd = process.cwd()) {
  return filePath.startsWith('/') ? filePath : join(cwd, filePath);
}

export function loadEnvironmentFiles({
  files = DEFAULT_ENV_FILES,
  cwd = process.cwd(),
  logger = createE2ELogger('E2E Env Loader'),
} = {}) {
  const resolvedFiles = files.map((file) => ({
    file,
    absolutePath: resolveEnvFilePath(file, cwd),
  }));

  const loadedFiles = [];

  resolvedFiles.forEach(({ file, absolutePath }) => {
    if (!existsSync(absolutePath)) {
      return;
    }

    dotenv.config({ path: absolutePath });
    loadedFiles.push({ file, absolutePath });
    logger.info(`Loaded environment file: ${file}`);
  });

  return { loadedFiles };
}

export function collectEnvironmentStatus(
  required = [],
  optional = [],
  env = process.env
) {
  const missingRequired = required.filter((key) => !env[key]);
  const missingOptional = optional.filter((key) => !env[key]);
  const presentRequired = required.filter((key) => env[key]);
  const presentOptional = optional.filter((key) => env[key]);

  return {
    missingRequired,
    missingOptional,
    presentRequired,
    presentOptional,
  };
}

export function logSecretPresence({
  key,
  logger = createE2ELogger('E2E Env Loader'),
  env = process.env,
  description = 'value redacted',
}) {
  if (!key) {
    throw new Error('Environment key must be provided to logSecretPresence');
  }

  if (env[key]) {
    logger.info(`${key} detected (${description})`);
  }
}
