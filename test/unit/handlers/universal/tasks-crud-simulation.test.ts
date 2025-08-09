/**
 * Unit test for Issue #417 - Complete Tasks CRUD simulation
 * 
 * This test simulates the full CRUD flow for tasks through the universal tools
 * to ensure all operations work correctly after the fix.
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  handleUniversalCreate,
  handleUniversalGetDetails,
  handleUniversalUpdate,
  handleUniversalDelete,
  handleUniversalGetAttributes,
  handleUniversalDiscoverAttributes
} from '../../../../src/handlers/tool-configs/universal/shared-handlers.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

// Mock the task operations to avoid needing real API calls
vi.mock('../../../../src/objects/tasks.js', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  listTasks: vi.fn()
}));

// Mock validation functions to avoid validation errors in tests
vi.mock('../../../../src/utils/enhanced-validation.js', () => ({
  validateRecordFields: vi.fn().mockResolvedValue({ isValid: true }),
  createEnhancedErrorResponse: vi.fn()
}));

// Mock ID validation to avoid strict ID format checks
vi.mock('../../../../src/utils/validation/id-validation.js', () => ({
  validateRecordId: vi.fn().mockReturnValue({ isValid: true }),
  generateIdCacheKey: vi.fn().mockReturnValue('cache-key')
}));

// Mock performance tracking
vi.mock('../../../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn().mockReturnValue('perf-id'),
    endOperation: vi.fn(),
    markTiming: vi.fn(),
    markApiStart: vi.fn().mockReturnValue(Date.now()),
    markApiEnd: vi.fn(),
    getCached404: vi.fn().mockReturnValue(null),
    cache404Response: vi.fn()
  }
}));

describe('Tasks Complete CRUD Simulation - Issue #417', () => {
  
  it('should support full task lifecycle through universal tools', async () => {
    // Import the mocked functions
    const { createTask, updateTask, deleteTask, getTask } = await import('../../../../src/objects/tasks.js');
    
    // Mock task responses
    const mockTask = {
      id: { task_id: 'task-123', workspace_id: 'workspace-456' },
      content: 'Q4 Follow-up: Test Task',
      status: 'pending',
      assignee: { id: 'user-123', type: 'workspace-member', name: 'Test User' },
      due_date: '2025-02-15',
      linked_records: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const mockUpdatedTask = {
      ...mockTask,
      content: 'Updated: Q4 Follow-up Task',
      status: 'completed',
      updated_at: '2024-01-02T00:00:00Z'
    };

    vi.mocked(createTask).mockResolvedValue(mockTask);
    vi.mocked(getTask).mockResolvedValue(mockTask);
    vi.mocked(updateTask).mockResolvedValue(mockUpdatedTask);
    vi.mocked(deleteTask).mockResolvedValue(true);

    // 1. Test task creation with field mapping
    const creationData = {
      title: 'Q4 Follow-up: Test Task', // Should map to 'content'
      status: 'pending',
      due: '2025-02-15', // Should map to 'due_date'
      assignee: 'user-123' // Should map to 'assignee_id'
    };

    const createdRecord = await handleUniversalCreate({
      resource_type: UniversalResourceType.TASKS,
      record_data: creationData
    });

    expect(createdRecord).toHaveProperty('id');
    expect(createdRecord.id.record_id).toBe('task-123');
    expect(createdRecord.values.content).toBe('Q4 Follow-up: Test Task');
    expect(createTask).toHaveBeenCalledWith(
      'Q4 Follow-up: Test Task',
      expect.objectContaining({
        assigneeId: 'user-123',
        dueDate: '2025-02-15'
      })
    );

    // 2. Test task retrieval
    const retrievedRecord = await handleUniversalGetDetails({
      resource_type: UniversalResourceType.TASKS,
      record_id: 'task-123'
    });

    expect(retrievedRecord).toHaveProperty('id');
    expect(retrievedRecord.id.record_id).toBe('task-123');
    expect(retrievedRecord.values.content).toBe('Q4 Follow-up: Test Task');
    expect(getTask).toHaveBeenCalledWith('task-123');

    // 3. Test task update with field mapping
    const updateData = {
      name: 'Updated: Q4 Follow-up Task', // Should map to 'content'
      status: 'completed'
    };

    const updatedRecord = await handleUniversalUpdate({
      resource_type: UniversalResourceType.TASKS,
      record_id: 'task-123',
      record_data: updateData
    });

    expect(updatedRecord.values.content).toBe('Updated: Q4 Follow-up Task');
    expect(updatedRecord.values.status).toBe('completed');
    expect(updateTask).toHaveBeenCalledWith(
      'task-123',
      expect.objectContaining({
        content: 'Updated: Q4 Follow-up Task',
        status: 'completed'
      })
    );

    // 4. Test task deletion
    const deleteResult = await handleUniversalDelete({
      resource_type: UniversalResourceType.TASKS,
      record_id: 'task-123'
    });

    expect(deleteResult.success).toBe(true);
    expect(deleteResult.record_id).toBe('task-123');
    expect(deleteTask).toHaveBeenCalledWith('task-123');
  });

  it('should support task attribute discovery operations', async () => {
    // Test get-attributes without record ID (should use discovery)
    const attributesResult = await handleUniversalGetAttributes({
      resource_type: UniversalResourceType.TASKS
    });

    expect(attributesResult).toHaveProperty('attributes');
    expect(attributesResult.attributes).toBeInstanceOf(Array);
    expect(attributesResult.attributes.length).toBeGreaterThan(0);

    // Test explicit discover-attributes
    const discoveryResult = await handleUniversalDiscoverAttributes(UniversalResourceType.TASKS);

    expect(discoveryResult).toHaveProperty('attributes');
    expect(discoveryResult).toHaveProperty('mappings');
    expect(discoveryResult.attributes.length).toBeGreaterThan(0);

    // Verify essential task attributes are present
    const contentAttr = discoveryResult.attributes.find((attr: unknown) => attr.api_slug === 'content');
    const statusAttr = discoveryResult.attributes.find((attr: unknown) => attr.api_slug === 'status');
    const dueDateAttr = discoveryResult.attributes.find((attr: unknown) => attr.api_slug === 'due_date');
    const assigneeAttr = discoveryResult.attributes.find((attr: unknown) => attr.api_slug === 'assignee_id');

    expect(contentAttr).toBeDefined();
    expect(contentAttr.required).toBe(true);
    expect(statusAttr).toBeDefined();
    expect(dueDateAttr).toBeDefined();
    expect(assigneeAttr).toBeDefined();
  });

  it('should handle task creation with various field name variations', async () => {
    const { createTask } = await import('../../../../src/objects/tasks.js');
    
    const mockTask = {
      id: { task_id: 'task-456', workspace_id: 'workspace-456' },
      content: 'Test with variations',
      status: 'pending',
      assignee: null,
      due_date: null,
      linked_records: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    vi.mocked(createTask).mockResolvedValue(mockTask);

    // Test with description instead of title
    const result1 = await handleUniversalCreate({
      resource_type: UniversalResourceType.TASKS,
      record_data: { description: 'Test with variations' }
    });

    expect(result1.values.content).toBe('Test with variations');

    // Test with camelCase fields
    const result2 = await handleUniversalCreate({
      resource_type: UniversalResourceType.TASKS,
      record_data: { 
        content: 'Test with variations',
        dueDate: '2025-02-15',
        assigneeId: 'user-789'
      }
    });

    expect(createTask).toHaveBeenLastCalledWith(
      'Test with variations',
      expect.objectContaining({
        assigneeId: 'user-789',
        dueDate: '2025-02-15'
      })
    );
  });
});