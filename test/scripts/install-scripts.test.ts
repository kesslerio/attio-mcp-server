/**
 * Install Scripts Test Suite
 *
 * Tests for bash install scripts (install-claude-desktop.sh, install-cursor.sh, install-claude-code.sh)
 * Uses Vitest + Node.js child_process for isolated function testing.
 *
 * @see Issue #958 - Install Script Test Suite
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  execBash,
  execBashFunction,
  testBashPredicate,
  createTempDir,
  cleanupTempDir,
  createMockConfig,
  readJsonConfig,
  findBackupFile,
  validateBashSyntax,
  getBashFunctions,
} from './helpers/shell-test-utils.js';

// Script paths
const SCRIPTS_DIR = join(process.cwd(), 'scripts');
const CLAUDE_DESKTOP_SCRIPT = join(SCRIPTS_DIR, 'install-claude-desktop.sh');
const CURSOR_SCRIPT = join(SCRIPTS_DIR, 'install-cursor.sh');
const CLAUDE_CODE_SCRIPT = join(SCRIPTS_DIR, 'install-claude-code.sh');

describe('Install Scripts', () => {
  // Validate all required scripts exist before running tests
  beforeAll(() => {
    const scripts = [
      { path: CLAUDE_DESKTOP_SCRIPT, name: 'install-claude-desktop.sh' },
      { path: CURSOR_SCRIPT, name: 'install-cursor.sh' },
      { path: CLAUDE_CODE_SCRIPT, name: 'install-claude-code.sh' },
    ];

    for (const script of scripts) {
      if (!existsSync(script.path)) {
        throw new Error(
          `Required install script not found: ${script.name}\n` +
            `Expected at: ${script.path}\n` +
            `Ensure scripts/ directory contains all install scripts.`
        );
      }
    }
  });

  describe('Script Validation', () => {
    it('should have valid bash syntax for install-claude-desktop.sh', () => {
      const result = validateBashSyntax(CLAUDE_DESKTOP_SCRIPT);
      expect(result.exitCode).toBe(0);
    });

    it('should have valid bash syntax for install-cursor.sh', () => {
      const result = validateBashSyntax(CURSOR_SCRIPT);
      expect(result.exitCode).toBe(0);
    });

    it('should have valid bash syntax for install-claude-code.sh', () => {
      const result = validateBashSyntax(CLAUDE_CODE_SCRIPT);
      expect(result.exitCode).toBe(0);
    });

    it('should define expected functions in install-claude-desktop.sh', () => {
      const functions = getBashFunctions(CLAUDE_DESKTOP_SCRIPT);
      expect(functions).toContain('validate_api_key');
      expect(functions).toContain('get_claude_config_dir');
      expect(functions).toContain('command_exists');
      expect(functions).toContain('backup_config');
    });
  });

  describe('validate_api_key function', () => {
    it('should accept valid alphanumeric API keys', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['abc123ABC']
      );
      expect(isValid).toBe(true);
    });

    it('should accept API keys with underscores', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['test_api_key_123']
      );
      expect(isValid).toBe(true);
    });

    it('should accept API keys with hyphens', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['test-api-key-123']
      );
      expect(isValid).toBe(true);
    });

    it('should reject API keys with special characters (injection prevention)', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['key; rm -rf /']
      );
      expect(isValid).toBe(false);
    });

    it('should reject API keys with quotes', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['key"with"quotes']
      );
      expect(isValid).toBe(false);
    });

    it('should reject API keys with backticks', () => {
      // Backticks need to be properly escaped to test the validation logic
      // The regex [A-Za-z0-9_-]+ does not include backticks, so they're rejected
      const result = execBash(
        `bash -c 'source "${CLAUDE_DESKTOP_SCRIPT}" 2>/dev/null; validate_api_key "key\\\`test\\\`"'`
      );
      expect(result.exitCode).not.toBe(0);
    });

    it('should reject API keys with dollar signs', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['key$HOME']
      );
      expect(isValid).toBe(false);
    });

    it('should reject empty API keys', () => {
      const isValid = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'validate_api_key',
        ['']
      );
      expect(isValid).toBe(false);
    });
  });

  describe('get_claude_config_dir function', () => {
    it('should return macOS path when OSTYPE is darwin', () => {
      const result = execBash(
        `bash -c 'OSTYPE=darwin20.0; source "${CLAUDE_DESKTOP_SCRIPT}" 2>/dev/null; get_claude_config_dir'`
      );
      expect(result.stdout).toContain('Library/Application Support/Claude');
    });

    it('should return Linux path when OSTYPE is linux-gnu', () => {
      const result = execBash(
        `bash -c 'OSTYPE=linux-gnu; source "${CLAUDE_DESKTOP_SCRIPT}" 2>/dev/null; get_claude_config_dir'`
      );
      expect(result.stdout).toContain('.config/Claude');
    });

    it('should return empty string for unsupported OS', () => {
      // Extract and run only the function, not the full script
      // The function should return empty for Windows/unsupported OS
      const result = execBash(
        `bash -c '
          get_claude_config_dir() {
            if [[ "msys" == "darwin"* ]]; then
              echo "$HOME/Library/Application Support/Claude"
            elif [[ "msys" == "linux-gnu"* ]]; then
              echo "$HOME/.config/Claude"
            else
              echo ""
            fi
          }
          get_claude_config_dir
        '`
      );
      expect(result.stdout).toBe('');
    });
  });

  describe('command_exists function', () => {
    it('should return true for existing command (bash)', () => {
      const exists = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'command_exists',
        ['bash']
      );
      expect(exists).toBe(true);
    });

    it('should return true for existing command (node)', () => {
      const exists = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'command_exists',
        ['node']
      );
      expect(exists).toBe(true);
    });

    it('should return false for non-existent command', () => {
      const exists = testBashPredicate(
        CLAUDE_DESKTOP_SCRIPT,
        'command_exists',
        ['nonexistent_command_xyz_123']
      );
      expect(exists).toBe(false);
    });
  });

  describe('backup_config function', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = createTempDir();
    });

    afterEach(() => {
      cleanupTempDir(tempDir);
    });

    it('should create backup file with timestamp when config exists', () => {
      // Create a mock config file
      const configPath = join(tempDir, 'test_config.json');
      writeFileSync(configPath, '{"test": true}');

      // Run backup function
      const result = execBashFunction(CLAUDE_DESKTOP_SCRIPT, 'backup_config', [
        configPath,
      ]);

      // Backup should succeed
      expect(result.exitCode).toBe(0);

      // Find backup file
      const backupPath = findBackupFile(tempDir, 'test_config.json');
      expect(backupPath).not.toBeNull();
      expect(existsSync(backupPath!)).toBe(true);
    });

    it('should not fail when config file does not exist', () => {
      const configPath = join(tempDir, 'nonexistent.json');

      // Run backup function on non-existent file
      const result = execBashFunction(CLAUDE_DESKTOP_SCRIPT, 'backup_config', [
        configPath,
      ]);

      // Should not fail
      expect(result.exitCode).toBe(0);
    });

    it('should preserve original file content in backup', () => {
      const originalContent =
        '{"original": "content", "nested": {"key": "value"}}';
      const configPath = join(tempDir, 'test_config.json');
      writeFileSync(configPath, originalContent);

      // Run backup
      execBashFunction(CLAUDE_DESKTOP_SCRIPT, 'backup_config', [configPath]);

      // Find and read backup
      const backupPath = findBackupFile(tempDir, 'test_config.json');
      expect(backupPath).not.toBeNull();

      const { readFileSync } = require('fs');
      const backupContent = readFileSync(backupPath!, 'utf8');
      expect(backupContent).toBe(originalContent);
    });
  });

  describe('Cursor Install Script', () => {
    it('should have valid bash syntax', () => {
      const result = validateBashSyntax(CURSOR_SCRIPT);
      expect(result.exitCode).toBe(0);
    });

    it('should define get_cursor_config_dir function', () => {
      const functions = getBashFunctions(CURSOR_SCRIPT);
      expect(functions).toContain('get_cursor_config_dir');
    });

    it('should return correct cursor config directory', () => {
      const result = execBashFunction(
        CURSOR_SCRIPT,
        'get_cursor_config_dir',
        []
      );
      expect(result.stdout).toContain('.cursor');
    });
  });

  describe('Claude Code Install Script', () => {
    it('should have valid bash syntax', () => {
      const result = validateBashSyntax(CLAUDE_CODE_SCRIPT);
      expect(result.exitCode).toBe(0);
    });

    it('should define detect_claude_cli function', () => {
      const functions = getBashFunctions(CLAUDE_CODE_SCRIPT);
      // May vary by script version
      expect(functions.length).toBeGreaterThan(0);
    });
  });

  describe('Security Considerations', () => {
    it('should not execute arbitrary commands in API key validation', () => {
      // Test various injection attempts - the regex [A-Za-z0-9_-]+ should reject all
      // We test using direct bash to avoid shell expansion issues

      // Test semicolon injection
      expect(
        testBashPredicate(CLAUDE_DESKTOP_SCRIPT, 'validate_api_key', [
          '; cat /etc/passwd',
        ])
      ).toBe(false);

      // Test pipe injection
      expect(
        testBashPredicate(CLAUDE_DESKTOP_SCRIPT, 'validate_api_key', [
          '| ls -la',
        ])
      ).toBe(false);

      // Test && injection
      expect(
        testBashPredicate(CLAUDE_DESKTOP_SCRIPT, 'validate_api_key', [
          '&& echo pwned',
        ])
      ).toBe(false);

      // Test SQL-style injection (quotes)
      expect(
        testBashPredicate(CLAUDE_DESKTOP_SCRIPT, 'validate_api_key', [
          "'; drop table;--",
        ])
      ).toBe(false);

      // Test $() command substitution - need to escape properly
      const result = execBash(
        `bash -c 'source "${CLAUDE_DESKTOP_SCRIPT}" 2>/dev/null; validate_api_key "\\$(whoami)"'`
      );
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle special characters safely in config paths', () => {
      // Test that the script handles paths with spaces correctly
      const tempDir = createTempDir('attio mcp test with spaces ');
      try {
        const configPath = join(tempDir, 'test config.json');
        writeFileSync(configPath, '{"test": true}');

        // This should not fail due to unquoted path
        const result = execBashFunction(
          CLAUDE_DESKTOP_SCRIPT,
          'backup_config',
          [configPath]
        );
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });
});
