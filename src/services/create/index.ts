/**
 * Create Services Module
 *
 * Clean exports for the create services architecture.
 * Primary entry point for consuming create functionality.
 */

// Main factory and service selection
export {
  getCreateService,
  shouldUseMockData,
  createServiceFactory,
} from './factory.js';

// Type definitions
export type {
  CreateService,
  CreateServiceFactory,
  EnvironmentDetector,
} from './types.js';

// Individual service implementations (for testing and special cases)
export { AttioCreateService } from './attio-create.service.js';
export { MockCreateService } from './mock-create.service.js';

// Shared utilities
export {
  extractAttioRecord,
  looksLikeCreatedRecord,
  generateMockId,
  assertLooksLikeCreated,
  isTestRun,
  debugRecordShape,
} from './extractor.js';
