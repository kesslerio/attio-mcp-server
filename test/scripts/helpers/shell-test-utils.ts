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
    timeout: options.timeout || 5000,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    const stdout = execSync(command, execOptions) as string;
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
    };
    return {
      stdout: execError.stdout?.toString().trim() || '',
      stderr: execError.stderr?.toString().trim() || '',
      exitCode: execError.status || 1,
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
 * Check if a backup file was created (matches pattern like filename.backup.YYYYMMDD_HHMMSS)
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
  const result = execBash(
    `bash -c 'source "${scriptPath}" 2>/dev/null; declare -F' | awk '{print $3}'`
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
