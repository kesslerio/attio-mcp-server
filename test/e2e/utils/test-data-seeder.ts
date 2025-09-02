import { E2EAssertions } from './assertions.js';
import {
  callUniversalTool,
  callTasksTool,
} from './enhanced-tool-caller.js';
import {
  CompanyFactory,
  TaskFactory,
} from '../fixtures/index.js';
import type { McpToolResponse, TestDataObject } from '../types/index.js';

export class TestDataSeeder {
  private static cache = new Map<string, any>();

  static async ensureCompany(
    tag: string,
    targetArray: TestDataObject[]
  ): Promise<any> {
    const cacheKey = `company-${tag}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (!targetArray.includes(cached)) targetArray.push(cached);
      return cached;
    }

    if (targetArray.length > 0) return targetArray[0];

    console.log(`[SEEDER] Creating company for tag: ${tag}`);
    const companyData = CompanyFactory.create();
    const response = (await callUniversalTool('create-record', {
      resource_type: 'companies',
      record_data: companyData as any,
    })) as McpToolResponse;

    if (response.isError) {
      throw new Error(`Failed to create company for ${tag}: ${response.error}`);
    }

    const company = E2EAssertions.expectMcpData(response);
    if (!(company as any)?.id?.record_id) {
      throw new Error(`Invalid company response for ${tag}`);
    }

    this.cache.set(cacheKey, company);
    targetArray.push(company);
    console.log(`[SEEDER] Created company ${(company as any).id.record_id} for ${tag}`);
    return company;
  }

  static async ensureTask(
    tag: string,
    targetArray: TestDataObject[]
  ): Promise<any> {
    const cacheKey = `task-${tag}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (!targetArray.includes(cached)) targetArray.push(cached);
      return cached;
    }

    if (targetArray.length > 0) return targetArray[0];

    console.log(`[SEEDER] Creating task for tag: ${tag}`);
    const taskData = TaskFactory.create();
    const response = (await callTasksTool('create-record', {
      resource_type: 'tasks',
      record_data: {
        content: taskData.content,
        format: 'plaintext',
        deadline_at: taskData.due_date,
      },
    })) as McpToolResponse;

    if (response.isError) {
      throw new Error(`Failed to create task for ${tag}: ${response.error}`);
    }

    const task = E2EAssertions.expectMcpData(response);
    if (!(task as any)?.id?.task_id) {
      throw new Error(`Invalid task response for ${tag}`);
    }

    this.cache.set(cacheKey, task);
    targetArray.push(task);
    console.log(`[SEEDER] Created task ${(task as any).id.task_id} for ${tag}`);
    return task;
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

