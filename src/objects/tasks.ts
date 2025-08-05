import {
  createTask as apiCreate,
  deleteTask as apiDelete,
  getTask as apiGet,
  linkRecordToTask as apiLink,
  listTasks as apiList,
  unlinkRecordFromTask as apiUnlink,
  updateTask as apiUpdate,
} from '../api/operations/index.js';
import type { AttioTask } from '../types/attio.js';

export async function listTasks(
  status?: string,
  assigneeId?: string,
  page = 1,
  pageSize = 25
): Promise<AttioTask[]> {
  return apiList(status, assigneeId, page, pageSize);
}
export async function getTask(taskId: string): Promise<AttioTask> {
  return apiGet(taskId);
}
export async function createTask(
  content: string,
  options: { assigneeId?: string; dueDate?: string; recordId?: string } = {}
): Promise<AttioTask> {
  return apiCreate(content, options);
}
export async function updateTask(
  taskId: string,
  updates: {
    content?: string;
    status?: string;
    assigneeId?: string;
    dueDate?: string;
    recordIds?: string[];
  }
): Promise<AttioTask> {
  return apiUpdate(taskId, updates);
}
export async function deleteTask(taskId: string): Promise<boolean> {
  return apiDelete(taskId);
}
export async function linkRecordToTask(
  taskId: string,
  recordId: string
): Promise<boolean> {
  return apiLink(taskId, recordId);
}
export async function unlinkRecordFromTask(
  taskId: string,
  recordId: string
): Promise<boolean> {
  return apiUnlink(taskId, recordId);
}
