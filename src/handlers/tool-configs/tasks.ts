import { AttioTask } from '../../types/attio.js';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  linkRecordToTask,
} from '../../objects/tasks.js';
import { ToolConfig } from '../tool-types.js';

export const tasksToolConfigs = {
  listTasks: {
    name: 'list-tasks',
    handler: listTasks,
    formatResult: (tasks: AttioTask[]) => {
      if (!tasks || tasks.length === 0) return 'No tasks found.';
      return `Found ${tasks.length} tasks:\n${tasks
        .map((t) => {
          const assigneeInfo =
            t.assignees && t.assignees.length > 0
              ? ` [Assignees: ${t.assignees.length}]`
              : '';
          return `- ${t.content} (ID: ${t.id.task_id})${assigneeInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,
  createTask: {
    name: 'create-task',
    handler: createTask,
    formatResult: (task: AttioTask) => {
      const assigneeInfo =
        task.assignees && task.assignees.length > 0
          ? ` with ${task.assignees.length} assignee(s)`
          : '';
      const linkedInfo =
        task.linked_records && task.linked_records.length > 0
          ? ` and ${task.linked_records.length} linked record(s)`
          : '';
      return `Created task with ID ${task.id.task_id}${assigneeInfo}${linkedInfo}`;
    },
  } as ToolConfig,
  updateTask: {
    name: 'update-task',
    handler: updateTask,
    formatResult: (task: AttioTask) => {
      const assigneeInfo =
        task.assignees && task.assignees.length > 0
          ? ` (${task.assignees.length} assignee(s))`
          : '';
      return `Updated task ${task.id.task_id}${assigneeInfo}`;
    },
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
        content: { type: 'string', description: 'Task content/description' },
        assigneeId: {
          type: 'string',
          description: 'Single assignee ID (backward compatibility)',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of workspace member IDs to assign to the task',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD or ISO datetime)',
        },
        recordId: {
          type: 'string',
          description: 'Single record ID (backward compatibility)',
        },
        targetObject: {
          type: 'string',
          enum: ['companies', 'people', 'records'],
          description: 'Type of record when using recordId',
        },
        linked_records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target_object: {
                type: 'string',
                enum: ['companies', 'people', 'deals'],
                description: 'Type of record to link',
              },
              target_record_id: {
                type: 'string',
                description: 'ID of the record to link',
              },
            },
            required: ['target_object', 'target_record_id'],
          },
          description: 'Array of records to link to the task',
        },
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
        taskId: { type: 'string', description: 'ID of the task to update' },
        content: {
          type: 'string',
          description:
            'Task content (NOTE: Cannot be updated due to Attio API limitations)',
        },
        status: {
          type: 'string',
          enum: ['open', 'completed'],
          description: 'Task status',
        },
        assigneeId: {
          type: 'string',
          description: 'Single assignee ID (backward compatibility)',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of workspace member IDs to assign to the task',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD or ISO datetime)',
        },
        recordIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of record IDs (backward compatibility)',
        },
        linked_records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target_object: {
                type: 'string',
                enum: ['companies', 'people', 'deals'],
                description: 'Type of record to link',
              },
              target_record_id: {
                type: 'string',
                description: 'ID of the record to link',
              },
            },
            required: ['target_object', 'target_record_id'],
          },
          description: 'Array of records to link to the task',
        },
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
