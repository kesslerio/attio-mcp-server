/**
 * Test Data Factory
 * Generates consistent test data for MCP QA test suite
 */

import type {
  CompanyCreateData,
  PersonCreateData,
  TaskCreateData,
  NoteCreateData,
  DealCreateData,
} from './types.js';

export class TestDataFactory {
  private static testRunId = Date.now();

  /**
   * Generate unique test identifier
   */
  static generateTestId(testCase: string, suffix?: string): string {
    const base = `${testCase}_${this.testRunId}`;
    return suffix ? `${base}_${suffix}` : base;
  }

  /**
   * Generate test company data
   */
  static createCompanyData(testCase: string): CompanyCreateData {
    const uniqueId = this.generateTestId(testCase, 'company');
    return {
      name: `${testCase} Test Company ${uniqueId}`,
      domains: [`${testCase.toLowerCase()}-test-${this.testRunId}.com`],
      description: `Created by MCP test suite for ${testCase}`,
      // Note: size and industry fields removed as they don't exist in Attio workspace
    };
  }

  /**
   * Generate test person data
   */
  static createPersonData(testCase: string): PersonCreateData {
    const uniqueId = this.generateTestId(testCase, 'person');
    return {
      name: `${testCase} Test Person ${uniqueId}`,
      email_addresses: [
        `${testCase.toLowerCase()}.test.${this.testRunId}@example.com`,
      ],
      job_title: `${testCase} QA Tester`,
      // Use NANP test prefix to satisfy validation without leaking real numbers
      phone_numbers: ['+1-555-0100'],
    };
  }

  /**
   * Generate test task data
   */
  static createTaskData(testCase: string): TaskCreateData {
    const uniqueId = this.generateTestId(testCase, 'task');
    return {
      title: `${testCase} Test Task ${uniqueId}`,
      content: `Task created by MCP test suite for ${testCase}`,
      is_completed: false,
      deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    };
  }

  /**
   * Generate test note data
   */
  static createNoteData(testCase: string, parentId?: string): NoteCreateData {
    const uniqueId = this.generateTestId(testCase, 'note');
    const data: NoteCreateData = {
      title: `${testCase} Test Note ${uniqueId}`,
      content: `Note created by MCP test suite for ${testCase}`,
      created_at: new Date().toISOString(),
    };

    if (parentId) {
      data.parent_object = parentId;
    }

    return data;
  }

  /**
   * Generate test list data
   */
  static createListData(testCase: string): Record<string, unknown> {
    const uniqueId = this.generateTestId(testCase, 'list');
    return {
      name: `${testCase} Test List ${uniqueId}`,
      description: `List created by MCP test suite for ${testCase}`,
    };
  }

  /**
   * Generate test deal data
   */
  static createDealData(testCase: string): DealCreateData {
    const uniqueId = this.generateTestId(testCase, 'deal');
    // Use environment-configurable stages with fallback to known valid stages
    const stages = this.getValidDealStages();
    const values = [10000, 25000, 50000, 75000, 100000];

    return {
      name: `${testCase} Test Deal ${uniqueId}`,
      stage: stages[Math.floor(Math.random() * stages.length)],
      value: values[Math.floor(Math.random() * values.length)],
      // Owner field required - must be set via environment variable or discovered dynamically
      ...(process.env.ATTIO_DEFAULT_DEAL_OWNER
        ? { owner: process.env.ATTIO_DEFAULT_DEAL_OWNER }
        : {}),
    };
  }

  /**
   * Get valid deal stages from environment or use default fallback
   */
  static getValidDealStages(): string[] {
    const envStages = process.env.ATTIO_VALID_DEAL_STAGES;
    if (envStages) {
      try {
        return JSON.parse(envStages);
      } catch (error) {
        console.warn(
          'Invalid ATTIO_VALID_DEAL_STAGES JSON format, using default stages:',
          error
        );
      }
    }
    // Fallback to known valid stages in this Attio workspace
    // These are common fallback stages - use discoverDealStages() for workspace-specific stages
    return ['MQL', 'Sales Qualified', 'Demo Booked', 'Negotiations'];
  }

  /**
   * Create deal pipeline stage progression test data
   */
  static createDealPipelineStages(): string[] {
    const envPipelineStages = process.env.ATTIO_DEAL_PIPELINE_STAGES;
    if (envPipelineStages) {
      try {
        return JSON.parse(envPipelineStages);
      } catch (error) {
        console.warn(
          'Invalid ATTIO_DEAL_PIPELINE_STAGES JSON format, using default pipeline:',
          error
        );
      }
    }
    // Fallback to common stages - use discoverDealStages() for workspace-specific stages
    return [
      'MQL',
      'Sales Qualified',
      'Demo Booked',
      'Negotiations',
      'Won 🎉',
      'Lost',
    ];
  }

  /**
   * Create deal with specific stage
   */
  static createDealWithStage(testCase: string, stage: string): DealCreateData {
    const uniqueId = this.generateTestId(testCase, 'deal');
    const values = [10000, 25000, 50000, 75000, 100000];

    return {
      name: `${testCase} Deal ${stage} ${uniqueId}`,
      stage: stage,
      value: values[Math.floor(Math.random() * values.length)],
      // Owner field required - must be set via environment variable or discovered dynamically
      ...(process.env.ATTIO_DEFAULT_DEAL_OWNER
        ? { owner: process.env.ATTIO_DEFAULT_DEAL_OWNER }
        : {}),
    };
  }

  /**
   * Generate update data for a resource
   */
  static createUpdateData(
    resourceType: string,
    testCase: string
  ): Record<string, unknown> {
    const timestamp = new Date().toISOString();

    switch (resourceType) {
      case 'companies':
        return {
          description: `Updated by ${testCase} at ${timestamp}`,
          // Note: size field removed as it doesn't exist in Attio workspace
        };

      case 'people':
        return {
          job_title: `${testCase} Updated Title`,
          phone_numbers: ['+1-555-0200'],
        };

      case 'tasks':
        // Note: Task updates are limited per Issue #517
        return {
          is_completed: true,
          deadline_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(), // 14 days from now
        };

      case 'deals':
        const validStages = this.getValidDealStages();
        // Use last stage as a typical progression target, or fallback
        const targetStage =
          validStages.length > 1
            ? validStages[validStages.length - 1]
            : 'Negotiation';
        return {
          stage: targetStage,
          value: 50000,
        };

      default:
        return {
          description: `Updated by ${testCase} at ${timestamp}`,
        };
    }
  }

  /**
   * Generate search query for a test case
   */
  static createSearchQuery(testCase: string): string {
    return `${testCase} Test`;
  }

  /**
   * Generate batch of test data
   */
  static createBatch<T>(
    testCase: string,
    createFunc: (testCase: string) => T,
    count: number
  ): T[] {
    const batch: T[] = [];
    for (let i = 0; i < count; i++) {
      batch.push(createFunc(`${testCase}_batch_${i}`));
    }
    return batch;
  }

  /**
   * Track created test data for cleanup
   */
  private static createdRecords: Array<{ type: string; id: string }> = [];

  static trackRecord(type: string, id: string): void {
    this.createdRecords.push({ type, id });
  }

  static getTrackedRecords(): Array<{ type: string; id: string }> {
    return [...this.createdRecords];
  }

  static clearTrackedRecords(): void {
    this.createdRecords = [];
  }

  /**
   * Generate test data with relationships
   */
  static createRelatedData(testCase: string): {
    company: Record<string, unknown>;
    person: Record<string, unknown>;
    task: Record<string, unknown>;
  } {
    const company = this.createCompanyData(testCase);
    const person = this.createPersonData(testCase);
    const task = this.createTaskData(testCase);

    // Add relationships (structure depends on Attio API)
    return { company, person, task };
  }

  /**
   * Create list entry test data
   */
  static createListEntryData(testCase: string): Record<string, unknown> {
    const timestamp = Date.now();
    return {
      rating: Math.floor(Math.random() * 5) + 1,
      notes: `Entry for ${testCase} - ${timestamp}`,
      status: 'active',
    };
  }

  /**
   * Create filter criteria for list operations
   */
  static createFilterCriteria(testCase: string): Record<string, unknown> {
    return {
      attribute: 'name',
      operator: 'contains',
      value: testCase,
    };
  }

  /**
   * Create advanced filter configuration
   */
  static createAdvancedFilter(testCase: string): Record<string, unknown> {
    return {
      filter: {
        $and: [
          {
            attribute: 'created_at',
            operator: 'greater_than',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          },
          {
            attribute: 'name',
            operator: 'contains',
            value: testCase,
          },
        ],
      },
    };
  }
}
