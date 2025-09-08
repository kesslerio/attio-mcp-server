/**
 * Split: ValidationService UUID and ID validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { isValidId } from '../../src/utils/validation.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { ValidationService } from '../../src/services/ValidationService.js';

describe('ValidationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('validateUUID', () => {
    it('should pass for valid UUIDs in non-task resources', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);
      expect(() => {
        ValidationService.validateUUID(
          'valid-uuid',
          UniversalResourceType.COMPANIES
        );
      }).not.toThrow();
      expect(isValidUUID).toHaveBeenCalledWith('valid-uuid');
    });

    it('should skip validation for tasks resource', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      expect(() => {
        ValidationService.validateUUID('task-id', UniversalResourceType.TASKS);
      }).not.toThrow();
      expect(isValidUUID).not.toHaveBeenCalled();
    });

    it('should throw for invalid UUIDs in non-task resources', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(createInvalidUUIDError).mockImplementation(
        () => new Error('Invalid UUID') as any
      );
      expect(() => {
        ValidationService.validateUUID(
          'invalid-uuid',
          UniversalResourceType.PEOPLE,
          'CREATE'
        );
      }).toThrow('Invalid UUID');
    });
  });

  describe('isValidRecordId', () => {
    it('should return true for valid UUIDs', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);
      expect(ValidationService.isValidRecordId('valid-uuid')).toBe(true);
      expect(isValidUUID).toHaveBeenCalledWith('valid-uuid');
    });

    it('should fallback to generic ID validation when UUID fails', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(isValidId).mockReturnValue(true);
      expect(ValidationService.isValidRecordId('generic-id')).toBe(true);
      expect(isValidId).toHaveBeenCalledWith('generic-id');
    });

    it('should return false when both validations fail', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(isValidId).mockReturnValue(false);
      expect(ValidationService.isValidRecordId('invalid-id')).toBe(false);
    });

    it('should skip generic validation when allowGeneric is false', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      expect(ValidationService.isValidRecordId('id', false)).toBe(false);
      expect(isValidId).not.toHaveBeenCalled();
    });
  });
});
