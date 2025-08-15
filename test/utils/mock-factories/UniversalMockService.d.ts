/**
 * Universal Mock Service
 *
 * Centralized service for generating mock data across all resource types
 * used by universal handlers in E2E and performance testing environments.
 *
 * This service consolidates the mock generation functionality previously
 * scattered throughout production code, providing clean separation between
 * test utilities and production logic.
 *
 * Key Features:
 * - Uses existing mock factories for consistency
 * - Maintains Issue #480 compatibility patterns
 * - Supports all universal resource types
 * - Provides AttioRecord format conversion
 * - Environment-aware mock injection
 */
import type { AttioRecord } from '../../../src/types/attio.js';
/**
 * Universal mock service for consistent mock data generation
 * across all resource types in the universal handlers system.
 */
export declare class UniversalMockService {
  /**
   * Environment detection function for mock injection
   * This matches the logic from shared-handlers.ts shouldUseMockData()
   */
  private static shouldUseMockData;
  /**
   * Creates a company record with mock support
   *
   * @param companyData - Company data to create
   * @returns AttioRecord in universal format or real API result
   */
  static createCompany(
    companyData: Record<string, unknown>
  ): Promise<AttioRecord>;
  /**
   * Creates a person record with mock support
   *
   * @param personData - Person data to create
   * @returns AttioRecord in universal format or real API result
   */
  static createPerson(
    personData: Record<string, unknown>
  ): Promise<AttioRecord>;
  /**
   * Creates a task record with mock support
   * Maintains Issue #480 compatibility with dual field support
   *
   * @param taskData - Task data to create
   * @returns AttioRecord in universal format or real API result
   */
  static createTask(taskData: Record<string, unknown>): Promise<AttioRecord>;
  /**
   * Updates a task record with mock support
   *
   * @param taskId - Task ID to update
   * @param updateData - Update data
   * @returns AttioRecord in universal format or real API result
   */
  static updateTask(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord>;
  /**
   * Checks if mock data should be used based on environment
   * This provides a public interface for the environment detection logic
   */
  static isUsingMockData(): boolean;
}
/**
 * Convenience exports for direct usage
 */
export declare const createMockCompany: typeof UniversalMockService.createCompany;
export declare const createMockPerson: typeof UniversalMockService.createPerson;
export declare const createMockTask: typeof UniversalMockService.createTask;
export declare const updateMockTask: typeof UniversalMockService.updateTask;
export default UniversalMockService;
//# sourceMappingURL=UniversalMockService.d.ts.map
