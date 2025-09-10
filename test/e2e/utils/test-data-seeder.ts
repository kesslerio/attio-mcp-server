import { E2EAssertions } from './assertions.js';
import { callUniversalTool, callTasksTool } from './enhanced-tool-caller.js';
import { CompanyFactory, TaskFactory } from '../fixtures/index.js';
import type { McpToolResponse, TestDataObject } from '../types/index.js';

interface CacheMetrics {
  hits: number;
  misses: number;
  creations: number;
  size: number;
}

export class TestDataSeeder {
  private cache = new Map<string, any>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    creations: 0,
    size: 0,
  };
  private readonly maxCacheSize = 100;
  private readonly suiteId: string;

  constructor(suiteId: string = 'default') {
    this.suiteId = suiteId;
    console.log(`[SEEDER] Created instance for suite: ${suiteId}`);
  }

  // Factory method for suite-specific instances
  static createForSuite(suiteId: string): TestDataSeeder {
    return new TestDataSeeder(suiteId);
  }

  // Static instance for backward compatibility
  private static defaultInstance: TestDataSeeder | null = null;

  private static getDefaultInstance(): TestDataSeeder {
    if (!this.defaultInstance) {
      this.defaultInstance = new TestDataSeeder('default-legacy');
    }
    return this.defaultInstance;
  }

  async ensureCompany(
    tag: string,
    targetArray: TestDataObject[]
  ): Promise<any> {
    const cacheKey = `${this.suiteId}:company-${tag}`;

    if (this.cache.has(cacheKey)) {
      this.metrics.hits++;
      const cached = this.cache.get(cacheKey);
      if (!targetArray.includes(cached)) targetArray.push(cached);
      console.log(
        `[SEEDER] Cache hit for company ${tag} in suite ${this.suiteId}`
      );
      return cached;
    }

    this.metrics.misses++;

    if (targetArray.length > 0) {
      console.log(`[SEEDER] Using existing company from array for ${tag}`);
      return targetArray[0];
    }

    console.log(
      `[SEEDER] Creating company for tag: ${tag} in suite: ${this.suiteId}`
    );
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

    this.setCachedItem(cacheKey, company);
    this.metrics.creations++;
    targetArray.push(company);
    console.log(
      `[SEEDER] Created company ${(company as any).id.record_id} for ${tag} in suite ${this.suiteId}`
    );
    return company;
  }

  async ensureTask(tag: string, targetArray: TestDataObject[]): Promise<any> {
    const cacheKey = `${this.suiteId}:task-${tag}`;

    if (this.cache.has(cacheKey)) {
      this.metrics.hits++;
      const cached = this.cache.get(cacheKey);
      if (!targetArray.includes(cached)) targetArray.push(cached);
      console.log(
        `[SEEDER] Cache hit for task ${tag} in suite ${this.suiteId}`
      );
      return cached;
    }

    this.metrics.misses++;

    if (targetArray.length > 0) {
      console.log(`[SEEDER] Using existing task from array for ${tag}`);
      return targetArray[0];
    }

    console.log(
      `[SEEDER] Creating task for tag: ${tag} in suite: ${this.suiteId}`
    );
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

    this.setCachedItem(cacheKey, task);
    this.metrics.creations++;
    targetArray.push(task);
    console.log(
      `[SEEDER] Created task ${(task as any).id.task_id} for ${tag} in suite ${this.suiteId}`
    );
    return task;
  }

  private setCachedItem(key: string, value: any): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(
        `[SEEDER] Cache evicted oldest entry to maintain size limit (${this.maxCacheSize})`
      );
    }

    this.cache.set(key, value);
    this.metrics.size = this.cache.size;
  }

  clearCache(): void {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    this.metrics.size = 0;
    console.log(
      `[SEEDER] Cleared cache for suite ${this.suiteId} (removed ${sizeBefore} entries)`
    );
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics, size: this.cache.size };
  }

  logMetrics(): void {
    const metrics = this.getMetrics();
    const hitRate =
      metrics.hits + metrics.misses > 0
        ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(1)
        : '0';

    console.log(
      `[SEEDER] Cache metrics for ${this.suiteId}: ${JSON.stringify({
        ...metrics,
        hitRate: `${hitRate}%`,
      })}`
    );
  }

  // Static methods for backward compatibility
  static async ensureCompany(
    tag: string,
    targetArray: TestDataObject[]
  ): Promise<any> {
    return this.getDefaultInstance().ensureCompany(tag, targetArray);
  }

  static async ensureTask(
    tag: string,
    targetArray: TestDataObject[]
  ): Promise<any> {
    return this.getDefaultInstance().ensureTask(tag, targetArray);
  }

  static clearCache(): void {
    this.getDefaultInstance().clearCache();
  }

  static getMetrics(): CacheMetrics {
    return this.getDefaultInstance().getMetrics();
  }

  static logMetrics(): void {
    this.getDefaultInstance().logMetrics();
  }
}
