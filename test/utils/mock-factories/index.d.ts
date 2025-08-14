/**
 * Mock Factories - Unified Export
 *
 * Centralized export for all mock factory classes and utilities.
 *
 * This module provides clean separation between test mock data generation
 * and production code, replacing the scattered test environment checks
 * and hardcoded mock data previously embedded in production handlers.
 *
 * Architecture Benefits:
 * - Clean separation of concerns (test vs production)
 * - Consistent mock data interfaces across all resource types
 * - Centralized test environment detection
 * - Type-safe mock data generation
 * - Easy extensibility for new resource types
 *
 * Usage Examples:
 *
 * ```typescript
 * import { TaskMockFactory, TestEnvironment } from '@test/utils/mock-factories';
 *
 * if (TestEnvironment.useMocks()) {
 *   const task = TaskMockFactory.create({ content: 'Test task' });
 *   return task;
 * }
 * ```
 */
import { TaskMockFactory, type MockTaskOptions } from './TaskMockFactory.js';
import { CompanyMockFactory, type MockCompanyOptions } from './CompanyMockFactory.js';
import { PersonMockFactory, type MockPersonOptions } from './PersonMockFactory.js';
import { ListMockFactory, type MockListOptions, type MockListEntryOptions } from './ListMockFactory.js';
export { TaskMockFactory, type MockTaskOptions };
export { CompanyMockFactory, type MockCompanyOptions };
export { PersonMockFactory, type MockPersonOptions };
export { ListMockFactory, type MockListOptions, type MockListEntryOptions };
import { TestEnvironment, isTestEnvironment, shouldUseMockData, isDevelopmentEnvironment, isContinuousIntegrationEnvironment, getTestContext } from './test-environment.js';
export { TestEnvironment, isTestEnvironment, shouldUseMockData, isDevelopmentEnvironment, isContinuousIntegrationEnvironment, getTestContext };
export type { MockFactory } from './TaskMockFactory.js';
import type { AttioTask, AttioRecord, AttioList, AttioListEntry } from '../../../src/types/attio.js';
export type { AttioTask, AttioRecord, AttioList, AttioListEntry };
/**
 * Universal Mock Factory - Factory selector based on resource type
 *
 * Provides a unified interface for creating mock data for any resource type.
 * This simplifies mock data injection in production code that needs to
 * support multiple resource types.
 *
 * @example
 * ```typescript
 * const mockData = UniversalMockFactory.create('tasks', {
 *   content: 'Test task content'
 * });
 * ```
 */
export declare class UniversalMockFactory {
    /**
     * Creates mock data for the specified resource type
     *
     * @param resourceType - The type of resource to create mock data for
     * @param overrides - Optional overrides for specific fields
     * @returns Mock data matching the resource type
     */
    static create(resourceType: string, overrides?: Record<string, unknown>): unknown;
    /**
     * Creates multiple mock data items for the specified resource type
     *
     * @param resourceType - The type of resource to create mock data for
     * @param count - Number of items to create
     * @param overrides - Optional overrides for specific fields
     * @returns Array of mock data matching the resource type
     */
    static createMultiple(resourceType: string, count: number, overrides?: Record<string, unknown>): unknown[];
    /**
     * Checks if mock data is supported for the given resource type
     *
     * @param resourceType - The resource type to check
     * @returns True if mock data is supported, false otherwise
     */
    static isSupported(resourceType: string): boolean;
    /**
     * Gets all supported resource types
     *
     * @returns Array of supported resource type names
     */
    static getSupportedTypes(): string[];
}
/**
 * Convenience factories with shorter names for common usage
 */
export declare const MockFactories: {
    readonly Task: typeof TaskMockFactory;
    readonly Company: typeof CompanyMockFactory;
    readonly Person: typeof PersonMockFactory;
    readonly List: typeof ListMockFactory;
};
/**
 * Quick mock data generators for common scenarios
 */
export declare const QuickMocks: {
    /**
     * Generate a complete task with realistic data
     */
    readonly task: (overrides?: Record<string, unknown>) => AttioTask;
    /**
     * Generate a complete company with realistic data
     */
    readonly company: (overrides?: Record<string, unknown>) => AttioRecord;
    /**
     * Generate a complete person with realistic data
     */
    readonly person: (overrides?: Record<string, unknown>) => AttioRecord;
    /**
     * Generate a complete list with realistic data
     */
    readonly list: (overrides?: Record<string, unknown>) => AttioList;
    /**
     * Generate a realistic sales scenario with related records
     */
    readonly salesScenario: () => {
        company: AttioRecord;
        contacts: AttioRecord[];
        tasks: AttioTask[];
        list: AttioList;
    };
};
export { MockDataInjector } from './mock-injector.js';
/**
 * Export everything as default for convenience
 */
declare const _default: {
    TaskMockFactory: typeof TaskMockFactory;
    CompanyMockFactory: typeof CompanyMockFactory;
    PersonMockFactory: typeof PersonMockFactory;
    ListMockFactory: typeof ListMockFactory;
    UniversalMockFactory: typeof UniversalMockFactory;
    TestEnvironment: {
        readonly isTest: typeof isTestEnvironment;
        readonly useMocks: typeof shouldUseMockData;
        readonly isDev: typeof isDevelopmentEnvironment;
        readonly isCI: typeof isContinuousIntegrationEnvironment;
        readonly getContext: typeof getTestContext;
        readonly isUnit: boolean;
        readonly isIntegration: boolean;
        readonly isE2E: boolean;
        readonly isProduction: boolean;
        readonly log: (message: string, ...args: any[]) => void;
        readonly warn: (message: string, ...args: any[]) => void;
    };
    MockFactories: {
        readonly Task: typeof TaskMockFactory;
        readonly Company: typeof CompanyMockFactory;
        readonly Person: typeof PersonMockFactory;
        readonly List: typeof ListMockFactory;
    };
    QuickMocks: {
        /**
         * Generate a complete task with realistic data
         */
        readonly task: (overrides?: Record<string, unknown>) => AttioTask;
        /**
         * Generate a complete company with realistic data
         */
        readonly company: (overrides?: Record<string, unknown>) => AttioRecord;
        /**
         * Generate a complete person with realistic data
         */
        readonly person: (overrides?: Record<string, unknown>) => AttioRecord;
        /**
         * Generate a complete list with realistic data
         */
        readonly list: (overrides?: Record<string, unknown>) => AttioList;
        /**
         * Generate a realistic sales scenario with related records
         */
        readonly salesScenario: () => {
            company: AttioRecord;
            contacts: AttioRecord[];
            tasks: AttioTask[];
            list: AttioList;
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map