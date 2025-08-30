import { AttioTask } from '../../types/attio.js';
import { ToolConfig } from '../tool-types.js';

export const tasksToolDefinitions = [
  {
    name: 'list-tasks',
    description:
      'List CRM tasks in the workspace (follow-ups, meetings, sales activities)',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        assigneeId: { type: 'string' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
      },
    },
  },
  {
    name: 'create-task',
    description: 'Create a new CRM task (follow-up, meeting, sales activity)',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        assigneeId: { type: 'string' },
        dueDate: { type: 'string' },
        recordId: { type: 'string' },
      },
      required: ['content'],
    },
  },
  {
    name: 'update-task',
    description:
      'Update an existing CRM task (change status, due date, assignment)',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        content: { type: 'string' },
        status: { type: 'string' },
        assigneeId: { type: 'string' },
        dueDate: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'delete-task',
    description: 'Delete a CRM task from the workspace',
    inputSchema: {
      type: 'object',
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'link-record-to-task',
    description: 'Link a record to a task',
    inputSchema: {
      type: 'object',
      properties: { taskId: { type: 'string' }, recordId: { type: 'string' } },
      required: ['taskId', 'recordId'],
    },
  },
];
