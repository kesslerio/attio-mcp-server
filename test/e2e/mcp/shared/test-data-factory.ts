/**
 * Test Data Factory
 * Generates consistent test data for MCP QA test suite
 */

import type { 
  CompanyCreateData, 
  PersonCreateData, 
  TaskCreateData, 
  NoteCreateData 
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
      description: `Created by MCP test suite for ${testCase}`
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
      email_addresses: [`${testCase.toLowerCase()}.test.${this.testRunId}@example.com`],
      job_title: `${testCase} QA Tester`,
      phone_numbers: ['+1-555-0100']
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
      deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
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
      created_at: new Date().toISOString()
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
      description: `List created by MCP test suite for ${testCase}`
    };
  }

  /**
   * Generate update data for a resource
   */
  static createUpdateData(resourceType: string, testCase: string): Record<string, unknown> {
    const timestamp = new Date().toISOString();
    
    switch (resourceType) {
      case 'companies':
        return {
          description: `Updated by ${testCase} at ${timestamp}`
          // Note: size field removed as it doesn't exist in Attio workspace
        };
        
      case 'people':
        return {
          job_title: `${testCase} Updated Title`,
          phone_numbers: ['+1-555-0200']
        };
        
      case 'tasks':
        // Note: Task updates are limited per Issue #517
        return {
          is_completed: true,
          deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
        };
        
      default:
        return {
          description: `Updated by ${testCase} at ${timestamp}`
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
}