/**
 * MockCreateService - Pure mock implementation
 *
 * Pure mock implementation with no API calls or environment checks.
 * Generates synthetic data for testing environments.
 */

import type { CreateService } from './types.js';
import type { AttioRecord } from '../../types/attio.js';
import type {
  E2EMeta,
  UnknownRecord,
  isRecord,
} from '../../types/service-types.js';
import { extractRecordId } from '../../utils/validation/uuid-validation.js';
import { isValidId } from '../../utils/validation.js';
import { generateMockId } from './extractor.js';
import { debug } from '../../utils/logger.js';

/**
 * Pure mock implementation of CreateService
 */
export class MockCreateService implements CreateService {
  async createCompany(input: Record<string, unknown>): Promise<AttioRecord> {
    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const mockId = generateMockId('12345678-1234-4000-8000');

    return {
      id: {
        record_id: mockId,
        object_id: 'companies',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: (input.name as string) || `Mock Company ${mockId.slice(-4)}`,
        domains: Array.isArray(input.domains)
          ? (input.domains as string[]).map((d) => ({ value: d }))
          : [{ value: `${mockId}.example.com` }],
        industry: (input.industry as string) || 'Technology',
        description:
          (input.description as string) ||
          `Mock company for testing - ${mockId}`,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async createPerson(input: Record<string, unknown>): Promise<AttioRecord> {
    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const mockId = generateMockId('12345678-1234-4000-9000');

    return {
      id: {
        record_id: mockId,
        object_id: 'people',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: (input.name as string) || `Mock Person ${mockId.slice(-4)}`,
        email_addresses: Array.isArray(input.email_addresses)
          ? (input.email_addresses as string[]).map((email) => ({
              value: email,
            }))
          : [{ value: `${mockId}@example.com` }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async createTask(input: Record<string, unknown>): Promise<AttioRecord> {
    // Use deterministic ID if record_id is provided (for test compatibility)
    const mockId = input.record_id
      ? (input.record_id as string)
      : generateMockId('12345678-1234-4000-a000');

    const taskContent =
      (input.content as string) || (input.title as string) || 'Mock Test Task';

    // Issue #480 compatible mock task
    try {
      const { logTaskDebug, sanitizePayload } = await import(
        '../../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.createTask',
        'Incoming taskData',
        sanitizePayload(input as any)
      );
    } catch {}

    const attioRecord: AttioRecord = {
      id: {
        record_id: mockId,
        task_id: mockId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: taskContent,
        title: taskContent, // Issue #480: Dual field support
        status: [{ value: (input.status as string) || 'pending' }],
        due_date: input.due_date
          ? [{ value: input.due_date as string }]
          : undefined,
        assignee: input.assigneeId
          ? [{ value: input.assigneeId as string }]
          : undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields: Record<string, unknown> = {
      content: taskContent,
      title: taskContent,
      status: (input.status as string) || 'pending',
      due_date: input.due_date as string,
      assignee_id: input.assigneeId as string,
      priority: (input.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (input.assigneeId) {
      (flatFields as any).assignee = {
        id: input.assigneeId as string,
        type: 'person',
      };
    }

    // Provide 'assignees' array for E2E expectations
    if (input.assigneeId) {
      (flatFields as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(input.assigneeId),
        },
      ];
    }

    const result = { ...attioRecord, ...flatFields } as AttioRecord &
      Record<string, unknown>;

    // Emit top-level assignees for E2E expectation
    if (input.assigneeId) {
      (result as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(input.assigneeId),
        },
      ];
    }

    try {
      const { logTaskDebug, inspectTaskRecordShape } = await import(
        '../../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.createTask',
        'Returning mock task',
        inspectTaskRecordShape(result)
      );
    } catch {}

    return result as any;
  }

  async updateTask(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Validation for mock environment
    if (!isValidId(taskId) || taskId === 'invalid') {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (updateData.assigneeId && !isValidId(updateData.assigneeId as string)) {
      throw new Error(`Invalid assignee ID: ${updateData.assigneeId}`);
    }

    if (updateData.recordIds && Array.isArray(updateData.recordIds)) {
      for (const recordId of updateData.recordIds) {
        if (!isValidId(recordId as string)) {
          throw new Error(`Record not found: ${recordId}`);
        }
      }
    }

    const taskContent =
      (updateData.content as string) ||
      (updateData.title as string) ||
      `Updated Mock Test Task ${taskId.slice(-4)}`;

    // Issue #480 compatible updated mock task
    const attioRecord: AttioRecord = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: taskContent,
        title: taskContent, // Issue #480: Dual field support
        status: [{ value: (updateData.status as string) || 'updated' }],
        due_date: updateData.due_date
          ? [{ value: updateData.due_date as string }]
          : undefined,
        assignee: updateData.assigneeId
          ? [{ value: updateData.assigneeId as string }]
          : undefined,
      },
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields: Record<string, unknown> = {
      content: taskContent,
      title: taskContent,
      status: (updateData.status as string) || 'updated',
      due_date: updateData.due_date as string,
      assignee_id: updateData.assigneeId as string,
      priority: (updateData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (updateData.assigneeId) {
      (flatFields as any).assignee = {
        id: updateData.assigneeId as string,
        type: 'person',
      };
    }

    // Provide 'assignees' array for E2E expectations on update
    if (updateData.assigneeId) {
      (flatFields as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(updateData.assigneeId),
        },
      ];
    }

    const result = { ...attioRecord, ...flatFields } as AttioRecord &
      Record<string, unknown>;

    // Emit top-level assignees for E2E expectation
    if (updateData.assigneeId) {
      (result as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(updateData.assigneeId),
        },
      ];
    }

    try {
      const { logTaskDebug, inspectTaskRecordShape } = await import(
        '../../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.updateTask',
        'Returning updated mock task',
        inspectTaskRecordShape(result)
      );
    } catch {}

    return result as any;
  }

  async createNote(noteData: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any> {
    // Validate required parameters
    if (
      !noteData.resource_type ||
      !noteData.record_id ||
      !noteData.title ||
      !noteData.content
    ) {
      throw new Error('missing required parameter');
    }

    // Extract UUID from record_id (handles URIs and raw UUIDs)
    const extractedRecordId = extractRecordId(noteData.record_id);
    if (!extractedRecordId) {
      throw new Error('record not found');
    }

    // Check for invalid IDs following test patterns
    if (
      extractedRecordId === '00000000-0000-0000-0000-000000000000' ||
      extractedRecordId.includes('invalid') ||
      extractedRecordId === 'invalid-company-id-12345' ||
      extractedRecordId === 'invalid-person-id-54321'
    ) {
      throw new Error('record not found');
    }

    // Generate mock note response following Attio API format
    const timestamp = Date.now();
    const baseNote = {
      id: {
        workspace_id: 'ws_mock',
        note_id: `note_${timestamp}`,
        record_id: extractedRecordId,
      },
      parent_object: noteData.resource_type,
      parent_record_id: extractedRecordId,
      title: noteData.title,
      content: noteData.content,
      content_markdown:
        noteData.format === 'markdown' || noteData.format === 'html'
          ? noteData.content
          : null,
      content_plaintext:
        noteData.format === 'plaintext' ? noteData.content : null,
      format: noteData.format || 'plaintext',
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Apply E2E markers for test data cleanup
    const markedNote = this.applyE2EMarkers(baseNote);

    return markedNote;
  }

  async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<unknown[]> {
    // Return empty array for mock mode (tests focus on creation)
    return [];
  }

  // Private helper methods

  /**
   * Apply consistent E2E test markers to mock data
   */
  private applyE2EMarkers(data: UnknownRecord, meta?: E2EMeta): UnknownRecord {
    const baseTags = new Set([
      ...(Array.isArray(data.tags) ? data.tags : []),
      'e2e-test',
      'e2e-suite:notes',
    ]);
    if (meta?.runId) {
      baseTags.add(`e2e-run:${meta.runId}`);
    }

    return {
      ...data,
      tags: Array.from(baseTags),
      metadata: {
        ...(data.metadata || {}),
        e2e: true,
      },
    };
  }
}
