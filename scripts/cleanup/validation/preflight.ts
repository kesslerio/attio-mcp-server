/**
 * Pre-flight validation for cleanup runs (issue #620 refactor).
 */
import { SUPPORTED_RESOURCES } from '../core/resources.js';
import { logError } from '../core/utils.js';

/**
 * Reject unsupported resource types (exit 1, historical behavior).
 */
export function validateRunInputs(resources: string[]): void {
  const invalid = resources.filter(
    (r) => !(SUPPORTED_RESOURCES as readonly string[]).includes(r)
  );
  if (invalid.length > 0) {
    logError(`Unsupported resource types: ${invalid.join(', ')}`);
    logError(`Supported resource types: ${SUPPORTED_RESOURCES.join(', ')}`);
    process.exit(1);
  }
}
