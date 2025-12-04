/**
 * Utility exports for @attio-mcp/core
 *
 * Public API surface is intentionally minimal.
 * Internal helpers (validatePhoneNumber, hasCountryCode, isPossiblePhoneNumber,
 * isValidPhoneNumber) are available via direct import from phone-validation.js
 * for tests but not exposed as public API.
 */

// Phone validation - public API
export {
  normalizePhoneForAttio,
  toE164,
  PhoneValidationError,
} from './phone-validation.js';

export type {
  PhoneValidationResult,
  PhoneValidationConfig,
  PhoneValidationErrorCode,
} from './phone-validation.js';
