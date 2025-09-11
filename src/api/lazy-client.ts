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

export function setGlobalContext(_context: any): void {
  // No-op for now - can be enhanced later
}

export function clearClientCache(): void {
  // No-op for now - can be enhanced later
}
