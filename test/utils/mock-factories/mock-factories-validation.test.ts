/**
 * Mock Factories Validation Test
 *
 * Validates that all mock factories produce data compatible with the
 * existing E2E test patterns and API response formats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskMockFactory,
  CompanyMockFactory,
  PersonMockFactory,
  ListMockFactory,
  TestEnvironment,
  UniversalMockFactory,
  MockDataInjector,
} from './index.js';

// Also import specific injectors to test them
import { TaskMockInjector, UniversalMockInjector } from './mock-injector.js';
import type {
  AttioTask,
  AttioRecord,
  AttioList,
} from '../../../src/types/attio.js';

describe('Mock Factories Validation', () => {
  beforeEach(() => {
    // Ensure we're in a test environment
    process.env.NODE_ENV = 'test';
  });

  describe('TaskMockFactory', () => {
    it('should create valid AttioTask with Issue #480 compatibility', () => {
      const task = TaskMockFactory.create({
        content: 'Test task content',
      });

      // Validate structure matches AttioTask interface
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('content', 'Test task content');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('created_at');
      expect(task).toHaveProperty('updated_at');

      // Validate ID structure
      expect(task.id).toHaveProperty('task_id');
      expect(typeof task.id.task_id).toBe('string');
      // Should be UUID format (8-4-4-4-12 hexadecimal characters)
      expect(task.id.task_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should create task with both content and title for E2E compatibility', () => {
      const content = 'Test task for E2E compatibility';
      const task = TaskMockFactory.create({ content });

      expect(task.content).toBe(content);
      // Issue #480: Task should work with both content and title expectations
      expect(task.content).toBeDefined();
    });

    it('should create multiple tasks with valid structure', () => {
      const tasks = TaskMockFactory.createMultiple(3);

      expect(tasks).toHaveLength(3);

      tasks.forEach((task) => {
        // Each task should have valid structure
        expect(task).toHaveProperty('id');
        expect(task.id).toHaveProperty('task_id');
        expect(typeof task.id.task_id).toBe('string');
        // Should be UUID format (8-4-4-4-12 hexadecimal characters)
        expect(task.id.task_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(task).toHaveProperty('content');
        expect(task).toHaveProperty('status');
      });
    });

    it('should create high priority task', () => {
      const task = TaskMockFactory.createHighPriority();

      expect(task.status).toBeDefined();
      expect(task.content).toBeDefined();
    });

    it('should create completed task', () => {
      const task = TaskMockFactory.createCompleted();

      expect(task.status).toBe('completed');
    });

    it('should create task with assignee', () => {
      const assigneeId = 'test-assignee-123';
      const task = TaskMockFactory.createWithAssignee(assigneeId);

      expect(task.assignee).toBeDefined();
      expect(task.assignee?.id).toBe(assigneeId);
    });

    it('should create task with linked records', () => {
      const recordIds = ['record-1', 'record-2'];
      const task = TaskMockFactory.createWithLinkedRecords(recordIds);

      expect(task.linked_records).toBeDefined();
      expect(task.linked_records).toHaveLength(2);
      expect(task.linked_records?.[0].id).toBe('record-1');
      expect(task.linked_records?.[1].id).toBe('record-2');
    });
  });

  describe('CompanyMockFactory', () => {
    it('should create valid AttioRecord for company', () => {
      const company = CompanyMockFactory.create({
        name: 'Test Company Inc.',
      });

      expect(company).toHaveProperty('id');
      expect(company).toHaveProperty('values');
      expect(company).toHaveProperty('created_at');
      expect(company).toHaveProperty('updated_at');

      // Validate ID structure
      expect(company.id).toHaveProperty('record_id');
      // Should be UUID format (8-4-4-4-12 hexadecimal characters)
      expect(company.id.record_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Validate values structure with AttioValue wrappers
      expect(company.values.name).toBeDefined();
      expect(Array.isArray(company.values.name)).toBe(true);
    });

    it('should create technology company', () => {
      const company = CompanyMockFactory.createTechnology();

      expect(company.values.industry).toBeDefined();
      expect(Array.isArray(company.values.industry)).toBe(true);
      expect((company.values.industry as any)[0].value).toBe('Technology');
    });

    it('should create multiple companies with valid structure', () => {
      const companies = CompanyMockFactory.createMultiple(3);

      expect(companies).toHaveLength(3);

      companies.forEach((company) => {
        // Each company should have valid structure
        expect(company).toHaveProperty('id');
        expect(company.id).toHaveProperty('record_id');
        expect(typeof company.id.record_id).toBe('string');
        // Should be UUID format (8-4-4-4-12 hexadecimal characters)
        expect(company.id.record_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(company).toHaveProperty('values');
        expect(company.values).toHaveProperty('name');
      });
    });
  });

  describe('PersonMockFactory', () => {
    it('should create valid AttioRecord for person', () => {
      const person = PersonMockFactory.create({
        name: 'John Smith',
      });

      expect(person).toHaveProperty('id');
      expect(person).toHaveProperty('values');
      expect(person).toHaveProperty('created_at');
      expect(person).toHaveProperty('updated_at');

      // Validate ID structure
      expect(person.id).toHaveProperty('record_id');
      // Should be UUID format (8-4-4-4-12 hexadecimal characters)
      expect(person.id.record_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Validate values structure
      expect(person.values.name).toBeDefined();
      expect(person.values.email_addresses).toBeDefined();
      expect(Array.isArray(person.values.email_addresses)).toBe(true);
    });

    it('should create executive person', () => {
      const person = PersonMockFactory.createExecutive();

      expect(person.values.seniority).toBeDefined();
      expect((person.values.seniority as any)[0].value).toBe('Executive');
    });

    it('should create person with company association', () => {
      const companyId = 'test-company-123';
      const person = PersonMockFactory.createWithCompany(companyId);

      expect(person.values.company).toBeDefined();
      expect((person.values.company as any)[0].value).toBe(companyId);
    });
  });

  describe('ListMockFactory', () => {
    it('should create valid AttioList', () => {
      const list = ListMockFactory.create({
        name: 'Test List',
      });

      expect(list).toHaveProperty('id');
      expect(list).toHaveProperty('title');
      expect(list).toHaveProperty('object_slug');
      expect(list).toHaveProperty('workspace_id');
      expect(list).toHaveProperty('created_at');
      expect(list).toHaveProperty('updated_at');

      // Validate ID structure
      expect(list.id).toHaveProperty('list_id');
      // Should be UUID format (8-4-4-4-12 hexadecimal characters)
      expect(list.id.list_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should create company list', () => {
      const list = ListMockFactory.createCompanyList();

      expect(list.object_slug).toBe('companies');
    });

    it('should create list entry', () => {
      const listId = 'test-list-123';
      const recordId = 'test-record-456';
      const entry = ListMockFactory.createListEntry(listId, recordId);

      expect(entry.list_id).toBe(listId);
      expect(entry.record_id).toBe(recordId);
      expect(entry.id?.entry_id).toBeDefined();
    });
  });

  describe('Test Environment Detection', () => {
    it('should detect test environment', () => {
      expect(TestEnvironment.isTest()).toBe(true);
      expect(TestEnvironment.useMocks()).toBe(true);
      expect(TestEnvironment.getContext()).toBe('unit');
    });
  });

  describe('UniversalMockFactory', () => {
    it('should create mock data for all supported resource types', () => {
      const task = UniversalMockFactory.create('tasks');
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('content');

      const company = UniversalMockFactory.create('companies');
      expect(company).toHaveProperty('id');
      expect(company).toHaveProperty('values');

      const person = UniversalMockFactory.create('people');
      expect(person).toHaveProperty('id');
      expect(person).toHaveProperty('values');

      const list = UniversalMockFactory.create('lists');
      expect(list).toHaveProperty('id');
      expect(list).toHaveProperty('title');
    });

    it('should support all expected resource types', () => {
      const supportedTypes = UniversalMockFactory.getSupportedTypes();
      expect(supportedTypes).toContain('tasks');
      expect(supportedTypes).toContain('companies');
      expect(supportedTypes).toContain('people');
      expect(supportedTypes).toContain('lists');
    });
  });

  describe('MockDataInjector', () => {
    it('should inject mock data in test environment', async () => {
      const result = await UniversalMockInjector.inject('tasks', 'create', {
        content: 'Test task',
      });

      // Should return mock data, not real data
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content', 'Test task');
    });

    it('should create task using TaskMockInjector', async () => {
      const result = await TaskMockInjector.createTask('Test task content', {
        assigneeId: 'test-assignee',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content', 'Test task content');
      expect(result.assignee?.id).toBe('test-assignee');
    });
  });

  describe('Compatibility with Existing E2E Patterns', () => {
    it('should be compatible with existing E2ETaskFactory patterns', () => {
      // Test that our mock factory produces similar structure to E2ETaskFactory
      const mockTask = TaskMockFactory.create({
        title: 'E2E Test Task',
        content: 'Test content for E2E',
        priority: 'high',
        status: 'open',
      });

      // Should have the expected fields that E2E tests look for
      expect(mockTask.content).toBe('Test content for E2E');
      expect(mockTask.status).toBe('open');
      expect(mockTask.id.task_id).toBeDefined();
    });

    it('should maintain Issue #480 task_id preservation', () => {
      const task = TaskMockFactory.create({
        content: 'Issue #480 test task',
      });

      // Issue #480: Ensure task_id is preserved for E2E test compatibility
      expect(task.id).toHaveProperty('task_id');
      expect(task.id.task_id).toBe(task.id.record_id);
    });
  });
});
