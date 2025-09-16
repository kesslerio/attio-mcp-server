/**
 * Enhanced lazy client - no circular dependencies
 * Uses direct import since circular dependency has been resolved
 */

import { AxiosInstance } from 'axios';
import { getAttioClient } from './attio-client.js';

export function getLazyAttioClient(): AxiosInstance {
  // Direct call since circular dependency is now resolved
  return getAttioClient();
}

export function setGlobalContext(_context: Record<string, unknown>): void {
  // Intentionally unused for now (reserved for future use)
}

export function clearClientCache(): void {
  // No-op for now - can be enhanced later
}
