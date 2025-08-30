/**
 * Tasks field mappings and validation rules
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { FieldMapping } from '../types.js';

/**
 * Field mapping configuration for tasks resource type
 */
export const TASKS_FIELD_MAPPING: FieldMapping = {
  fieldMappings: {
    // Content variations
    title: 'content',
    name: 'content',
    task_name: 'content',
    task_title: 'content',
    description: 'content',
    task_description: 'content',
    task: 'content',
    text: 'content',
    body: 'content',
    // Status variations - Map to is_completed (the correct API field)
    status: 'is_completed', // Transform status string to is_completed boolean
    state: 'is_completed',
    completed: 'is_completed',
    done: 'is_completed',
    complete: 'is_completed',
    task_status: 'is_completed',
    // Due date variations - Map to deadline_at (the correct API field)
    due_date: 'deadline_at', // Common field name to correct API field
    due: 'deadline_at',
    deadline: 'deadline_at',
    due_by: 'deadline_at',
    due_on: 'deadline_at',
    duedate: 'deadline_at', // camelCase variant (lowercase for lookup)
    // Assignee variations - Map to assignees array (the correct API field)
    assignee_id: 'assignees', // Transform single assignee to array
    assignee: 'assignees',
    assigned_to: 'assignees',
    owner: 'assignees',
    user: 'assignees',
    assigneeid: 'assignees', // camelCase variant (lowercase for lookup)
    // Record association - Keep as linked_records (already correct)
    record_id: 'linked_records',
    record: 'linked_records',
    linked_record: 'linked_records',
    parent: 'linked_records',
    related_to: 'linked_records',
    recordid: 'linked_records', // camelCase variant (lowercase for lookup)
  },
  validFields: [
    'content',
    'format',
    'deadline_at',
    'is_completed',
    'assignees',
    'linked_records',
    'priority',
    // Also accept the common field names for backward compatibility
    'due_date',
    'status',
    'assignee_id',
    'record_id',
    'assignee',
  ],
  commonMistakes: {
    title: 'Use "content" for task text/description',
    name: 'Use "content" for task text/description',
    description: 'Use "content" for task text/description',
    assignee: 'Use "assignee_id" or "assignees" with workspace member ID(s)',
    due: 'Use "due_date" or "deadline_at" with ISO date format',
    record: 'Use "record_id" or "linked_records" to link the task to records',
    status: 'Use "status" (pending/completed) or "is_completed" (true/false)',
  },
  requiredFields: ['content'],
  uniqueFields: [],
};
