/**
 * Unit tests for FunctionValidator utility
 * Issue #598: Test extracted common error handling pattern
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ensureFunctionAvailability } from '../../../src/services/search-utilities/FunctionValidator.js';
import * as logger from '../../../src/utils/logger.js';

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
}));

describe('FunctionValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureFunctionAvailability', () => {
    it('should return function when valid function is provided', async () => {
      const mockFunction = vi.fn();

      const result = await ensureFunctionAvailability(
        mockFunction,
        'testFunction',
        'TestService'
      );

      expect(result).toBe(mockFunction);
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking testFunction availability',
        { type: 'function' }
      );
    });

    it('should return null when non-function is provided', async () => {
      const nonFunction = 'not a function';

      const result = await ensureFunctionAvailability(
        nonFunction,
        'testFunction',
        'TestService'
      );

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking testFunction availability',
        { type: 'string' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TestService',
        'testFunction is not a function',
        { testFunction: nonFunction }
      );
    });

    it('should return null when undefined is provided', async () => {
      const result = await ensureFunctionAvailability(
        undefined,
        'testFunction',
        'TestService'
      );

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking testFunction availability',
        { type: 'undefined' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TestService',
        'testFunction is not a function',
        { testFunction: undefined }
      );
    });

    it('should return null when null is provided', async () => {
      const result = await ensureFunctionAvailability(
        null,
        'testFunction',
        'TestService'
      );

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking testFunction availability',
        { type: 'object' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TestService',
        'testFunction is not a function',
        { testFunction: null }
      );
    });

    it('should handle exceptions during function checking', async () => {
      // Simulate an internal exception (e.g., logging failure) to exercise catch path
      const originalDebug = logger.debug;
      vi.spyOn(logger, 'debug').mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = await ensureFunctionAvailability(
        () => 'noop',
        'testFunction',
        'TestService'
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'TestService',
        'Error accessing testFunction',
        expect.any(Error)
      );

      // restore
      vi.spyOn(logger, 'debug').mockImplementation(originalDebug as any);
    });

    it('should use default service name when not provided', async () => {
      const mockFunction = vi.fn();

      const result = await ensureFunctionAvailability(
        mockFunction,
        'testFunction'
      );

      expect(result).toBe(mockFunction);
      expect(logger.debug).toHaveBeenCalledWith(
        'UniversalSearchService',
        'Checking testFunction availability',
        { type: 'function' }
      );
    });

    it('should handle arrow functions correctly', async () => {
      const arrowFunction = () => 'test';

      const result = await ensureFunctionAvailability(
        arrowFunction,
        'arrowFunction',
        'TestService'
      );

      expect(result).toBe(arrowFunction);
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking arrowFunction availability',
        { type: 'function' }
      );
    });

    it('should handle async functions correctly', async () => {
      const asyncFunction = async () => 'test';

      const result = await ensureFunctionAvailability(
        asyncFunction,
        'asyncFunction',
        'TestService'
      );

      expect(result).toBe(asyncFunction);
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking asyncFunction availability',
        { type: 'function' }
      );
    });

    it('should handle bound functions correctly', async () => {
      const originalFunction = function (this: any) {
        return this.value;
      };
      const boundFunction = originalFunction.bind({ value: 'test' });

      const result = await ensureFunctionAvailability(
        boundFunction,
        'boundFunction',
        'TestService'
      );

      expect(result).toBe(boundFunction);
      expect(logger.debug).toHaveBeenCalledWith(
        'TestService',
        'Checking boundFunction availability',
        { type: 'function' }
      );
    });

    it('should handle class methods correctly', async () => {
      class TestClass {
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      const method = instance.testMethod;

      const result = await ensureFunctionAvailability(
        method,
        'testMethod',
        'TestService'
      );

      expect(result).toBe(method);
    });

    it('should preserve function type information', async () => {
      const typedFunction = (x: number, y: string): boolean =>
        x > 0 && y.length > 0;

      const result = await ensureFunctionAvailability(
        typedFunction,
        'typedFunction',
        'TestService'
      );

      expect(result).toBe(typedFunction);
      // Verify the returned function maintains its signature
      if (result) {
        expect(typeof result(1, 'test')).toBe('boolean');
        expect(result(1, 'test')).toBe(true);
      }
    });
  });

  describe('integration with original use case', () => {
    it('should replicate the original ensureAdvancedSearchCompanies behavior', async () => {
      const mockAdvancedSearchCompanies = vi.fn();

      const result = await ensureFunctionAvailability(
        mockAdvancedSearchCompanies,
        'advancedSearchCompanies',
        'UniversalSearchService'
      );

      expect(result).toBe(mockAdvancedSearchCompanies);
      expect(logger.debug).toHaveBeenCalledWith(
        'UniversalSearchService',
        'Checking advancedSearchCompanies availability',
        { type: 'function' }
      );
    });

    it('should replicate the original ensureAdvancedSearchPeople behavior', async () => {
      const mockAdvancedSearchPeople = vi.fn();

      const result = await ensureFunctionAvailability(
        mockAdvancedSearchPeople,
        'advancedSearchPeople',
        'UniversalSearchService'
      );

      expect(result).toBe(mockAdvancedSearchPeople);
      expect(logger.debug).toHaveBeenCalledWith(
        'UniversalSearchService',
        'Checking advancedSearchPeople availability',
        { type: 'function' }
      );
    });

    it('should handle the exact error case from original implementation', async () => {
      const invalidFunction = { not: 'a function' };

      const result = await ensureFunctionAvailability(
        invalidFunction,
        'advancedSearchCompanies',
        'UniversalSearchService'
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'UniversalSearchService',
        'advancedSearchCompanies is not a function',
        { advancedSearchCompanies: invalidFunction }
      );
    });
  });
});
