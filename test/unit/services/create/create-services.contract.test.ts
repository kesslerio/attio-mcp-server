/**
 * Contract Tests for Create Services
 *
 * Ensures both AttioCreateService and MockCreateService return identical shapes
 * and behave consistently across different environments.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AttioCreateService } from '../../../../src/services/create/attio-create.service.js';
import { MockCreateService } from '../../../../src/services/create/mock-create.service.js';
import type { CreateService } from '../../../../src/services/create/types.js';

describe('Create Services Contract', () => {
  let attioService: CreateService;
  let mockService: CreateService;

  beforeEach(() => {
    // Mock environment for AttioCreateService to prevent real API calls
    vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
    vi.stubEnv('USE_MOCK_DATA', 'false');

    attioService = new AttioCreateService();
    mockService = new MockCreateService();
  });

  describe('createCompany contract', () => {
      name: 'Test Company',
      domain: 'test.com',
      industry: 'Technology',
      description: 'A test company',
    };

    it('should return records with identical structure', async () => {

      // Both services should return AttioRecord with same structure
      expect(mockResult).toHaveProperty('id');
      expect(mockResult.id).toHaveProperty('record_id');
      expect(mockResult.id).toHaveProperty('object_id', 'companies');
      expect(mockResult.id).toHaveProperty('workspace_id');

      expect(mockResult).toHaveProperty('values');
      expect(mockResult.values).toHaveProperty('name');
      expect(mockResult.values).toHaveProperty('domains');

      expect(mockResult).toHaveProperty('created_at');
      expect(mockResult).toHaveProperty('updated_at');

      // ID should be valid UUID format
      expect(mockResult.id.record_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Timestamps should be ISO strings
      expect(() => new Date(mockResult.created_at as string)).not.toThrow();
      expect(() => new Date(mockResult.updated_at as string)).not.toThrow();
    });
  });

  describe('createPerson contract', () => {
      name: 'John Doe',
      email: 'john.doe@test.com',
    };

    it('should return records with identical structure', async () => {

      // Both services should return AttioRecord with same structure
      expect(mockResult).toHaveProperty('id');
      expect(mockResult.id).toHaveProperty('record_id');
      expect(mockResult.id).toHaveProperty('object_id', 'people');
      expect(mockResult.id).toHaveProperty('workspace_id');

      expect(mockResult).toHaveProperty('values');
      expect(mockResult.values).toHaveProperty('name');
      expect(mockResult.values).toHaveProperty('email_addresses');

      expect(mockResult).toHaveProperty('created_at');
      expect(mockResult).toHaveProperty('updated_at');

      // ID should be valid UUID format
      expect(mockResult.id.record_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Timestamps should be ISO strings
      expect(() => new Date(mockResult.created_at as string)).not.toThrow();
      expect(() => new Date(mockResult.updated_at as string)).not.toThrow();
    });
  });

  describe('createTask contract', () => {
      content: 'Test task',
      status: 'pending',
      assigneeId: '12345678-1234-4000-8000-123456789012',
      due_date: '2024-12-31',
    };

    it('should return records with identical structure (Issue #480 compatibility)', async () => {

      // Both services should return AttioRecord with same structure
      expect(mockResult).toHaveProperty('id');
      expect(mockResult.id).toHaveProperty('record_id');
      expect(mockResult.id).toHaveProperty('task_id'); // Issue #480
      expect(mockResult.id).toHaveProperty('object_id', 'tasks');
      expect(mockResult.id).toHaveProperty('workspace_id');

      expect(mockResult).toHaveProperty('values');
      expect(mockResult.values).toHaveProperty('content');
      expect(mockResult.values).toHaveProperty('title'); // Issue #480: Dual field support

      // Flat field compatibility (Issue #480)
      expect(mockResult).toHaveProperty('content');
      expect(mockResult).toHaveProperty('title');
      expect(mockResult).toHaveProperty('status');
      expect(mockResult).toHaveProperty('assignees');

      expect(mockResult).toHaveProperty('created_at');
      expect(mockResult).toHaveProperty('updated_at');

      // task_id should equal record_id (Issue #480)
      expect(mockResult.id.task_id).toBe(mockResult.id.record_id);
    });
  });

  describe('updateTask contract', () => {
      content: 'Updated task',
      status: 'completed',
      assigneeId: '87654321-4321-4000-8000-210987654321',
    };

    it('should return records with identical structure', async () => {

      // Should maintain same structure as createTask
      expect(mockResult).toHaveProperty('id');
      expect(mockResult.id).toHaveProperty('record_id', taskId);
      expect(mockResult.id).toHaveProperty('task_id', taskId);
      expect(mockResult.id).toHaveProperty('object_id', 'tasks');

      expect(mockResult).toHaveProperty('values');
      expect(mockResult.values).toHaveProperty('content');
      expect(mockResult.values).toHaveProperty('title');

      // Flat field compatibility
      expect(mockResult).toHaveProperty('content');
      expect(mockResult).toHaveProperty('title');
      expect(mockResult).toHaveProperty('status');

      expect(mockResult).toHaveProperty('created_at');
      expect(mockResult).toHaveProperty('updated_at');
    });

    it('should validate task ID format', async () => {
      await expect(
        mockService.updateTask('invalid-id', updateData)
      ).rejects.toThrow('Task not found: invalid-id');
    });
  });

  describe('createNote contract', () => {
      resource_type: 'companies',
      record_id: '12345678-1234-4000-8000-123456789012',
      title: 'Test Note',
      content: 'This is a test note',
      format: 'plaintext',
    };

    it('should return notes with identical structure', async () => {

      expect(mockResult).toHaveProperty('id');
      expect(mockResult.id).toHaveProperty('workspace_id');
      expect(mockResult.id).toHaveProperty('note_id');
      expect(mockResult.id).toHaveProperty('record_id');

      expect(mockResult).toHaveProperty(
        'parent_object',
        testNoteData.resource_type
      );
      expect(mockResult).toHaveProperty('parent_record_id');
      expect(mockResult).toHaveProperty('title', testNoteData.title);
      expect(mockResult).toHaveProperty('content', testNoteData.content);
      expect(mockResult).toHaveProperty('format', testNoteData.format);

      expect(mockResult).toHaveProperty('created_at');
    });

    it('should validate required parameters', async () => {

      await expect(
        mockService.createNote(incompleteData as any)
      ).rejects.toThrow('missing required parameter');
    });

    it('should validate record_id format', async () => {
        ...testNoteData,
        record_id: 'invalid-record-id-12345',
      };

      await expect(mockService.createNote(invalidData)).rejects.toThrow(
        'record not found'
      );
    });
  });

  describe('listNotes contract', () => {
    it('should return consistent empty array for both services', async () => {

      expect(Array.isArray(mockResult)).toBe(true);
      expect(mockResult).toHaveLength(0);
    });
  });

  describe('Error handling contract', () => {
    it('should throw similar error types for validation failures', async () => {
      // Both services should throw Error for validation failures
      await expect(mockService.updateTask('invalid', {})).rejects.toThrow(
        Error
      );

      await expect(mockService.createNote({} as any)).rejects.toThrow(Error);
    });
  });
});
