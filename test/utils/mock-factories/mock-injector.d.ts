/**
 * Mock Data Injection System
 *
 * Provides clean injection points for mock data into production code paths
 * when running in test environments. This replaces the scattered test
 * environment checks and hardcoded mock data previously embedded in
 * production handlers.
 *
 * Key Features:
 * - Clean separation between test and production code
 * - Type-safe mock data injection
 * - Compatibility with existing API patterns
 * - Support for all resource types (tasks, companies, people, lists)
 * - Issue #480 compatibility for E2E tests
 */
import type { AttioTask, AttioRecord, AttioList } from '../../../src/types/attio.js';
export declare function clearMockStorage(): void;
/**
 * Task-specific mock injection utilities
 *
 * Handles the specific requirements for Issue #480:
 * - Provides both content and title fields for E2E test compatibility
 * - Ensures task_id is preserved in the ID structure
 * - Maintains compatibility with existing task creation patterns
 */
export declare class TaskMockInjector {
    /**
     * Creates a task using mock data when in test environment, otherwise calls real API
     *
     * @param content - Task content
     * @param options - Task creation options
     * @param realCreateTask - Function that performs the real API call
     * @returns Either mock AttioTask or result from real API
     */
    static createTask(content: string, options?: Record<string, unknown>, realCreateTask?: (content: string, options: Record<string, unknown>) => Promise<AttioTask>): Promise<AttioTask>;
    /**
     * Updates a task using mock data when in test environment
     */
    static updateTask(taskId: string, updateData: Record<string, unknown>, realUpdateTask?: (taskId: string, updateData: Record<string, unknown>) => Promise<AttioTask>): Promise<AttioTask>;
    /**
     * Gets a task using mock data when in test environment
     */
    static getTask(taskId: string, realGetTask?: (taskId: string) => Promise<AttioTask>): Promise<AttioTask>;
    /**
     * Lists tasks using mock data when in test environment
     */
    static listTasks(realListTasks?: () => Promise<AttioTask[]>): Promise<AttioTask[]>;
    /**
     * Deletes a task using mock success response when in test environment
     */
    static deleteTask(taskId: string, realDeleteTask?: (taskId: string) => Promise<{
        success: boolean;
        record_id: string;
    }>): Promise<{
        success: boolean;
        record_id: string;
    }>;
}
/**
 * Company-specific mock injection utilities
 */
export declare class CompanyMockInjector {
    static createCompany(companyData: Record<string, unknown>, realCreateCompany?: (companyData: Record<string, unknown>) => Promise<AttioRecord>): Promise<AttioRecord>;
    static getCompany(companyId: string, realGetCompany?: (companyId: string) => Promise<AttioRecord>): Promise<AttioRecord>;
}
/**
 * Person-specific mock injection utilities
 */
export declare class PersonMockInjector {
    static createPerson(personData: Record<string, unknown>, realCreatePerson?: (personData: Record<string, unknown>) => Promise<AttioRecord>): Promise<AttioRecord>;
    static getPerson(personId: string, realGetPerson?: (personId: string) => Promise<AttioRecord>): Promise<AttioRecord>;
}
/**
 * List-specific mock injection utilities
 */
export declare class ListMockInjector {
    static createList(listData: Record<string, unknown>, realCreateList?: (listData: Record<string, unknown>) => Promise<AttioList>): Promise<AttioList>;
    static getList(listId: string, realGetList?: (listId: string) => Promise<AttioList>): Promise<AttioList>;
    static listLists(options?: {
        objectSlug?: string;
        limit?: number;
    }, realListLists?: () => Promise<AttioList[]>): Promise<AttioList[]>;
}
/**
 * Universal mock injector for all resource types
 */
export declare class UniversalMockInjector {
    /**
     * Injects appropriate mock data based on resource type
     */
    static inject(resourceType: string, operation: string, data?: Record<string, unknown>, realOperation?: (...args: any[]) => Promise<any>): Promise<any>;
    private static handleTaskOperation;
    private static handleCompanyOperation;
    private static handlePersonOperation;
    private static handleListOperation;
}
//# sourceMappingURL=mock-injector.d.ts.map