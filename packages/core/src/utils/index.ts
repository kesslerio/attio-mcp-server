/**
 * Utility exports for @attio-mcp/core
 */

// Phone validation
export {
  validatePhoneNumber,
  toE164,
  hasCountryCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  normalizePhoneForAttio,
  PhoneValidationError,
} from './phone-validation.js';

export type {
  PhoneValidationResult,
  PhoneValidationConfig,
  PhoneValidationErrorCode,
} from './phone-validation.js';
