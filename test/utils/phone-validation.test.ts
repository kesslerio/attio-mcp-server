import { describe, it, expect } from 'vitest';
import {
  PHONE_METADATA_SOURCE,
  PhoneValidationError,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  validatePhoneNumber,
} from '../../src/utils/validation/phone-validation.js';

describe('phone validation utilities', () => {
  it('validates a correct E.164 number', () => {
    const result = validatePhoneNumber('+12025550134');
    expect(result.valid).toBe(true);
    expect(result.e164).toBe('+12025550134');
    expect(result.error).toBeUndefined();
  });

  it('produces structured error for too-short numbers', () => {
    const result = validatePhoneNumber('+1202');
    expect(result.valid).toBe(false);
    expect(result.error).toBeInstanceOf(PhoneValidationError);
    expect(result.error?.code).toBe('TOO_SHORT');
  });

  it('returns metadata source indicator', () => {
    expect(['default', 'min']).toContain(PHONE_METADATA_SOURCE);
  });

  it('detects possible and valid numbers correctly', () => {
    expect(isPossiblePhoneNumber('+12025550134')).toBe(true);
    expect(isValidPhoneNumber('+12025550134')).toBe(true);
    expect(isPossiblePhoneNumber('12345')).toBe(false);
    expect(isValidPhoneNumber('12345')).toBe(false);
  });
});
