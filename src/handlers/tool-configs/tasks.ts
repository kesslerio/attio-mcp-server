import {
  createTask,
  deleteTask,
  linkRecordToTask,
  listTasks,
  updateTask,
} from '../../objects/tasks.js';
import type { AttioTask } from '../../types/attio.js';
import type { ToolConfig } from '../tool-types.js';

export const tasksToolConfigs = {
  listTasks: {
    name: 'list-tasks',
    handler: listTasks,
    formatResult: (tasks: AttioTask[]) => {
      if (!tasks || tasks.length === 0) return 'No tasks found.';
      return `Found ${tasks.length} tasks:\n${tasks
        .map((t) => `- ${t.content} (ID: ${t.id.task_id})`)
        .join('\n')}`;
    },
  } as ToolConfig,
  createTask: {
    name: 'create-task',
    handler: createTask,
    formatResult: (task: AttioTask) =>
      `Created task with ID ${task.id.task_id}`,
  } as ToolConfig,
  updateTask: {
    name: 'update-task',
    handler: updateTask,
    formatResult: (task: AttioTask) => `Updated task ${task.id.task_id}`,
  } as ToolConfig,
  deleteTask: {
    name: 'delete-task',
    handler: deleteTask,
  } as ToolConfig,
  linkRecord: {
    name: 'link-record-to-task',
    handler: linkRecordToTask,
  } as ToolConfig,
};

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
