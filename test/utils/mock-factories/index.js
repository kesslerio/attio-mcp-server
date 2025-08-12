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
// Core mock factory classes
import { TaskMockFactory } from './TaskMockFactory.js';
import { CompanyMockFactory } from './CompanyMockFactory.js';
import { PersonMockFactory } from './PersonMockFactory.js';
import { ListMockFactory } from './ListMockFactory.js';
export { TaskMockFactory };
export { CompanyMockFactory };
export { PersonMockFactory };
export { ListMockFactory };
// Test environment utilities
import { TestEnvironment, isTestEnvironment, shouldUseMockData, isDevelopmentEnvironment, isContinuousIntegrationEnvironment, getTestContext } from './test-environment.js';
export { TestEnvironment, isTestEnvironment, shouldUseMockData, isDevelopmentEnvironment, isContinuousIntegrationEnvironment, getTestContext };
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
export class UniversalMockFactory {
    /**
     * Creates mock data for the specified resource type
     *
     * @param resourceType - The type of resource to create mock data for
     * @param overrides - Optional overrides for specific fields
     * @returns Mock data matching the resource type
     */
    static create(resourceType, overrides = {}) {
        switch (resourceType.toLowerCase()) {
            case 'tasks':
                return TaskMockFactory.create(overrides);
            case 'companies':
                return CompanyMockFactory.create(overrides);
            case 'people':
                return PersonMockFactory.create(overrides);
            case 'lists':
                return ListMockFactory.create(overrides);
            default:
                throw new Error(`Unsupported resource type for mock data generation: ${resourceType}`);
        }
    }
    /**
     * Creates multiple mock data items for the specified resource type
     *
     * @param resourceType - The type of resource to create mock data for
     * @param count - Number of items to create
     * @param overrides - Optional overrides for specific fields
     * @returns Array of mock data matching the resource type
     */
    static createMultiple(resourceType, count, overrides = {}) {
        switch (resourceType.toLowerCase()) {
            case 'tasks':
                return TaskMockFactory.createMultiple(count, overrides);
            case 'companies':
                return CompanyMockFactory.createMultiple(count, overrides);
            case 'people':
                return PersonMockFactory.createMultiple(count, overrides);
            case 'lists':
                return ListMockFactory.createMultiple(count, overrides);
            default:
                throw new Error(`Unsupported resource type for mock data generation: ${resourceType}`);
        }
    }
    /**
     * Checks if mock data is supported for the given resource type
     *
     * @param resourceType - The resource type to check
     * @returns True if mock data is supported, false otherwise
     */
    static isSupported(resourceType) {
        return ['tasks', 'companies', 'people', 'lists'].includes(resourceType.toLowerCase());
    }
    /**
     * Gets all supported resource types
     *
     * @returns Array of supported resource type names
     */
    static getSupportedTypes() {
        return ['tasks', 'companies', 'people', 'lists'];
    }
}
// Mock Data Injection utilities are defined in ./mock-injector.ts
/**
 * Convenience factories with shorter names for common usage
 */
export const MockFactories = {
    Task: TaskMockFactory,
    Company: CompanyMockFactory,
    Person: PersonMockFactory,
    List: ListMockFactory
};
/**
 * Quick mock data generators for common scenarios
 */
export const QuickMocks = {
    /**
     * Generate a complete task with realistic data
     */
    task: (overrides) => TaskMockFactory.create(overrides),
    /**
     * Generate a complete company with realistic data
     */
    company: (overrides) => CompanyMockFactory.create(overrides),
    /**
     * Generate a complete person with realistic data
     */
    person: (overrides) => PersonMockFactory.create(overrides),
    /**
     * Generate a complete list with realistic data
     */
    list: (overrides) => ListMockFactory.create(overrides),
    /**
     * Generate a realistic sales scenario with related records
     */
    salesScenario: () => ({
        company: CompanyMockFactory.createTechnology(),
        contacts: PersonMockFactory.createMultiple(3),
        tasks: TaskMockFactory.createMultiple(5),
        list: ListMockFactory.createCompanyList({ name: 'Sales Prospects' })
    })
};
// Export MockDataInjector separately from its own file
export { MockDataInjector } from './mock-injector.js';
/**
 * Export everything as default for convenience
 */
export default {
    TaskMockFactory,
    CompanyMockFactory,
    PersonMockFactory,
    ListMockFactory,
    UniversalMockFactory,
    TestEnvironment,
    MockFactories,
    QuickMocks
};
//# sourceMappingURL=index.js.map