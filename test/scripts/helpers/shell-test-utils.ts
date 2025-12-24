/**
 * Shell Test Utilities
 *
 * Utilities for testing bash install scripts using Node.js child_process.
 * Enables isolated testing of shell functions without running full scripts.
 */

import { execSync, ExecSyncOptions } from 'child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ShellTestOptions {
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}

/**
 * Type guard for exec error objects from child_process
 */
interface ExecError {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  status?: number;
}

function isExecError(error: unknown): error is ExecError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('stdout' in error || 'stderr' in error || 'status' in error)
  );
}

/**
 * Execute a bash command and return structured result
 */
export function execBash(
  command: string,
  options: ShellTestOptions = {}
): ShellResult {
  const execOptions: ExecSyncOptions = {
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    cwd: options.cwd,
    timeout: options.timeout || 10000,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    const stdout = execSync(command, execOptions) as string;
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    if (isExecError(error)) {
      return {
        stdout: error.stdout?.toString().trim() || '',
        stderr: error.stderr?.toString().trim() || '',
        exitCode: error.status || 1,
      };
    }
    // Unknown error type - return generic failure
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}

/**
 * Extract and execute a specific function from a bash script
 */
export function execBashFunction(
  scriptPath: string,
  functionName: string,
  args: string[] = [],
  options: ShellTestOptions = {}
): ShellResult {
  const argsStr = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ');

  // Source the script and call the function
  const command = `bash -c 'source "${scriptPath}" 2>/dev/null; ${functionName} ${argsStr}'`;

  return execBash(command, options);
}

/**
 * Test a bash function that returns exit code (0 = success, non-zero = failure)
 */
export function testBashPredicate(
  scriptPath: string,
  functionName: string,
  args: string[] = [],
  options: ShellTestOptions = {}
): boolean {
  const result = execBashFunction(scriptPath, functionName, args, options);
  return result.exitCode === 0;
}

/**
 * Create a temporary directory for test isolation
 */
export function createTempDir(prefix = 'attio-mcp-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Create a mock MCP config file for testing
 */
export function createMockConfig(
  dirPath: string,
  filename = 'claude_desktop_config.json',
  content: Record<string, unknown> = {}
): string {
  const filePath = join(dirPath, filename);
  const defaultContent = {
    mcpServers: {
      'existing-server': {
        command: 'node',
        args: ['existing.js'],
      },
    },
  };
  writeFileSync(
    filePath,
    JSON.stringify({ ...defaultContent, ...content }, null, 2)
  );
  return filePath;
}

/**
 * Read and parse a JSON config file
 */
export function readJsonConfig(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

/**
 * Find a backup file matching the expected naming pattern.
 *
 * Searches for files matching: `{originalFilename}.backup.YYYYMMDD_HHMMSS`
 * where YYYYMMDD_HHMMSS is a timestamp (e.g., `20251203_143022`).
 *
 * @param dirPath - Directory to search in
 * @param originalFilename - Original filename to find backup for
 * @returns Full path to the first matching backup file, or null if none found
 *
 * @remarks
 * If multiple backup files exist, returns the first match found during
 * directory enumeration (not necessarily the most recent). For chronological
 * ordering, sort the results by filename or mtime externally.
 *
 * @example
 * ```typescript
 * const backup = findBackupFile('/tmp/test', 'config.json');
 * // Returns: '/tmp/test/config.json.backup.20251203_143022' or null
 * ```
 */
export function findBackupFile(
  dirPath: string,
  originalFilename: string
): string | null {
  const { readdirSync } = require('fs');
  const files = readdirSync(dirPath) as string[];
  const backupPattern = new RegExp(
    `^${originalFilename}\\.backup\\.\\d{8}_\\d{6}$`
  );

  for (const file of files) {
    if (backupPattern.test(file)) {
      return join(dirPath, file);
    }
  }
  return null;
}

/**
 * Validate bash script syntax without execution
 */
export function validateBashSyntax(scriptPath: string): ShellResult {
  return execBash(`bash -n "${scriptPath}"`);
}

/**
 * Get list of functions defined in a bash script
 */
export function getBashFunctions(scriptPath: string): string[] {
  // Use grep to find function definitions without sourcing the script
  // This avoids executing any setup code that might hang
  const result = execBash(
    `grep -E '^[a-zA-Z_][a-zA-Z0-9_]*\\s*\\(\\)' "${scriptPath}" | sed 's/().*$//' | tr -d ' '`
  );

  if (result.exitCode !== 0) {
    return [];
  }

  return result.stdout.split('\n').filter((fn) => fn.trim().length > 0);
}

/**
 * Mock environment for testing OS-specific behavior
 */
export function withMockOsType(
  osType: 'darwin' | 'linux-gnu' | 'msys',
  fn: () => void
): void {
  const originalOsType = process.env.OSTYPE;
  process.env.OSTYPE = osType;
  try {
    fn();
  } finally {
    if (originalOsType !== undefined) {
      process.env.OSTYPE = originalOsType;
    } else {
      delete process.env.OSTYPE;
    }
  }
}
