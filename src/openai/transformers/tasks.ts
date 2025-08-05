/**
 * Transformer for task records
 * Converts Attio task data to OpenAI format
 */

import type { OpenAIFetchResult, OpenAISearchResult } from '../types.js';
import { extractAttributeValue, generateRecordUrl } from './index.js';

export const transformTask = {
  /**
   * Transform task to search result format
   */
  toSearchResult(task: any): OpenAISearchResult {
    const id = task.id?.task_id || task.id?.record_id || task.id;
    const content = extractAttributeValue(
      task.content || task.attributes?.content
    );
    const status = extractAttributeValue(
      task.status || task.attributes?.status
    );
    const assignee = extractAttributeValue(
      task.assignee?.name || task.attributes?.assignee
    );

    // Build text description
    const textParts = [];

    if (status) {
      textParts.push(`Status: ${status}`);
    }

    if (assignee) {
      textParts.push(`Assigned to: ${assignee}`);
    }

    // Add due date if available
    const dueDate = task.deadline_at || task.attributes?.due_date;
    if (dueDate) {
      textParts.push(`Due: ${new Date(dueDate).toLocaleDateString()}`);
    }

    // Add linked record info if available
    if (task.linked_records && task.linked_records.length > 0) {
      const linkedCount = task.linked_records.length;
      textParts.push(
        `${linkedCount} linked record${linkedCount > 1 ? 's' : ''}`
      );
    }

    return {
      id: `tasks:${id}`,
      title: content || 'Untitled Task',
      text: textParts.join(' • ') || 'No details available',
      url: generateRecordUrl(id, 'tasks'),
    };
  },

  /**
   * Transform task to fetch result format with full details
   */
  toFetchResult(task: any): OpenAIFetchResult {
    const searchResult = this.toSearchResult(task);

    // Collect all metadata
    const metadata: Record<string, any> = {};

    // Task status and completion
    if (task.status) {
      metadata.status = task.status;
    }

    if (task.is_completed !== undefined) {
      metadata.is_completed = task.is_completed;
    }

    if (task.completed_at) {
      metadata.completed_at = task.completed_at;
    }

    // Dates and deadlines
    if (task.deadline_at) {
      metadata.deadline_at = task.deadline_at;
    }

    if (task.reminder_at) {
      metadata.reminder_at = task.reminder_at;
    }

    // Assignment information
    if (task.assignee) {
      metadata.assignee = {
        id: task.assignee.id,
        name: task.assignee.name,
        email: task.assignee.email,
      };
    }

    if (task.created_by) {
      metadata.created_by = {
        id: task.created_by.id,
        name: task.created_by.name,
        email: task.created_by.email,
      };
    }

    // Linked records
    if (task.linked_records && Array.isArray(task.linked_records)) {
      metadata.linked_records = task.linked_records.map((record: any) => ({
        id: record.id,
        type: record.type,
        name: record.name,
        url: generateRecordUrl(record.id, record.type),
      }));
    }

    // Format and content type
    if (task.format) {
      metadata.format = task.format;
    }

    if (task.content_type) {
      metadata.content_type = task.content_type;
    }

    // Tags and labels
    if (task.tags) {
      metadata.tags = extractAttributeValue(task.tags);
    }

    if (task.labels) {
      metadata.labels = extractAttributeValue(task.labels);
    }

    // Priority
    if (task.priority) {
      metadata.priority = task.priority;
    }

    // Comments and activity
    if (task.comment_count !== undefined) {
      metadata.comment_count = task.comment_count;
    }

    if (task.last_activity_at) {
      metadata.last_activity_at = task.last_activity_at;
    }

    // Recurrence
    if (task.is_recurring) {
      metadata.is_recurring = task.is_recurring;
      if (task.recurrence_pattern) {
        metadata.recurrence_pattern = task.recurrence_pattern;
      }
    }

    // Add timestamps
    if (task.created_at) {
      metadata.created_at = task.created_at;
    }
    if (task.updated_at) {
      metadata.updated_at = task.updated_at;
    }

    return {
      ...searchResult,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  },
};
