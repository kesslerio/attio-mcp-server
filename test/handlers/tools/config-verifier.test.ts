/**
 * Tests for tool configuration verification utilities
 */
import { verifyToolConfigsWithRequiredTools } from '../../../src/handlers/tools/config-verifier.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Tool Config Verifier', () => {
  let originalNodeEnv: string | undefined;
  let originalDebug: string | undefined;
  let originalStrictValidation: string | undefined;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Save original environment variables
    originalNodeEnv = process.env.NODE_ENV;
    originalDebug = process.env.DEBUG;
    originalStrictValidation = process.env.STRICT_TOOL_VALIDATION;

    // Enable debug mode for testing
    process.env.NODE_ENV = 'development';

    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment variables
    process.env.NODE_ENV = originalNodeEnv;
    process.env.DEBUG = originalDebug;
    process.env.STRICT_TOOL_VALIDATION = originalStrictValidation;

    // Restore console methods
    vi.restoreAllMocks();
  });

  it('should verify required tool types are present', () => {
    const mockConfigs = {
      search: {
        name: 'search-test',
        handler: () => {},
        formatResult: () => {},
      },
      update: {
        name: 'update-test',
        handler: () => {},
        formatResult: () => {},
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'search',
      'update',
    ]);

    expect(result).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should identify missing required tool types', () => {
    const mockConfigs = {
      search: {
        name: 'search-test',
        handler: () => {},
        formatResult: () => {},
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'search',
      'update',
    ]);

    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("MISSING: Required tool type 'update' not found!")
    );
  });

  it('should warn if handler function is missing', () => {
    const mockConfigs = {
      search: {
        name: 'search-test',
        // Missing handler
        formatResult: () => {},
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'search',
    ]);

    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: search has no handler function!')
    );
  });

  it('should detect duplicate tool names', () => {
    const mockConfigs = {
      search: {
        name: 'duplicate-name',
        handler: () => {},
        formatResult: () => {},
      },
      update: {
        name: 'duplicate-name',
        handler: () => {},
        formatResult: () => {},
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'search',
      'update',
    ]);

    // By default, it doesn't fail the validation without strict mode
    expect(result).toBe(true);

    // But it does warn about duplicates
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DUPLICATE TOOL NAMES DETECTED:')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Tool name "duplicate-name" is defined in multiple configs: search, update'
      )
    );
  });

  it('should fail validation in strict mode for duplicate tool names', () => {
    // Enable strict validation
    process.env.STRICT_TOOL_VALIDATION = 'true';

    const mockConfigs = {
      search: {
        name: 'duplicate-name',
        handler: () => {},
        formatResult: () => {},
      },
      update: {
        name: 'duplicate-name',
        handler: () => {},
        formatResult: () => {},
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'search',
      'update',
    ]);

    // In strict mode, it should fail validation
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'ERROR: Duplicate tool names will cause MCP tool initialization failures.'
      )
    );
  });

  it('should skip validation when not in debug mode', () => {
    // Disable debug mode
    process.env.NODE_ENV = 'production';
    process.env.DEBUG = undefined;

    const mockConfigs = {
      // This would normally cause validation failures
      incomplete: {
        name: 'test',
        // Missing handler
      },
    };

    const result = verifyToolConfigsWithRequiredTools('test', mockConfigs, [
      'incomplete',
    ]);

    // In production mode, validation is skipped and returns true
    expect(result).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
