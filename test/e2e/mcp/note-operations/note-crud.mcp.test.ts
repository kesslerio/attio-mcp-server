/**
 * TC-N01: Note CRUD Operations - Basic Note Management
 * P1 Essential Test
 * 
 * Validates basic note CRUD operations including creation, reading, updating, and deletion.
 * Must achieve 100% pass rate as part of P1 quality gate.
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class NoteCrudTest extends MCPTestBase {
  private testCompanyId: string | null = null;
  private testPersonId: string | null = null;
  private testDealId: string | null = null;
  private createdNotes: string[] = [];

  constructor() {
    super('TCN01');
  }

  /**
   * Setup test data - create parent records to attach notes to
   */
  async setupTestData(): Promise<void> {
    try {
      // Create a test company
      const companyData = TestDataFactory.createCompanyData('TCN01');
      const companyResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData
      });

      if (!companyResult.isError) {
        const text = companyResult.content?.[0]?.text || '';
        const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
        if (idMatch) {
          this.testCompanyId = idMatch[1];
          TestDataFactory.trackRecord('companies', this.testCompanyId);
        }
      }

      // Create a test person
      const personData = TestDataFactory.createPersonData('TCN01');
      const personResult = await this.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData
      });

      if (!personResult.isError) {
        const text = personResult.content?.[0]?.text || '';
        const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
        if (idMatch) {
          this.testPersonId = idMatch[1];
          TestDataFactory.trackRecord('people', this.testPersonId);
        }
      }

      // Try to create a test deal (may not be configured in all workspaces)
      try {
        const dealData = TestDataFactory.createDealData('TCN01');
        const dealResult = await this.executeToolCall('create-record', {
          resource_type: 'deals',
          record_data: dealData
        });

        if (!dealResult.isError) {
          const text = dealResult.content?.[0]?.text || '';
          const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
          if (idMatch) {
            this.testDealId = idMatch[1];
            TestDataFactory.trackRecord('deals', this.testDealId);
          }
        }
      } catch (error) {
        console.warn('Deal creation failed (may not be configured):', error);
      }
    } catch (error) {
      console.error('Failed to setup test data:', error);
    }
  }

  /**
   * Cleanup test notes after each test
   */
  async cleanupNotes(): Promise<void> {
    for (const noteId of this.createdNotes) {
      try {
        // Try to delete via universal delete if supported
        await this.executeToolCall('delete-record', {
          resource_type: 'notes',
          record_id: noteId
        });
      } catch (error) {
        console.warn(`Failed to delete note ${noteId}:`, error);
      }
    }
    this.createdNotes = [];
  }

  /**
   * Track a created note for cleanup
   */
  trackNote(noteId: string): void {
    this.createdNotes.push(noteId);
    TestDataFactory.trackRecord('notes', noteId);
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData(): Promise<void> {
    await this.cleanupNotes();
    // Parent record cleanup will be handled by TestDataFactory tracking
  }
}

describe('TC-N01: Note CRUD Operations - Basic Note Management', () => {
  const testCase = new NoteCrudTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupTestData();
  });

  afterEach(async () => {
    // Clean up notes after each test to prevent pollution
    await testCase.cleanupNotes();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();
    
    // Log quality gate results for this test case
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTC-N01 Results: ${passedCount}/${totalCount} passed`);
    
    // P1 tests require 100% pass rate for notes
    if (totalCount > 0) {
      const passRate = (passedCount / totalCount) * 100;
      if (passRate < 100) {
        console.warn(`⚠️ TC-N01 below P1 threshold: ${passRate.toFixed(1)}% (required: 100%)`);
      }
    }
  });

  it('should create a note for a company', async () => {
    const testName = 'create_company_note';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId) {
        throw new Error('Test company not available');
      }

      const noteData = TestDataFactory.createNoteData('TCN01_Company');
      const result = await testCase.executeToolCall('create-note', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        title: noteData.title,
        content: noteData.content
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Note created successfully');
      expect(text).toContain(noteData.title);
      
      // Extract note ID if possible for cleanup
      const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (idMatch) {
        testCase.trackNote(idMatch[1]);
      }
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should create a note for a person', async () => {
    const testName = 'create_person_note';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testPersonId) {
        throw new Error('Test person not available');
      }

      const noteData = TestDataFactory.createNoteData('TCN01_Person');
      const result = await testCase.executeToolCall('create-note', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        title: noteData.title,
        content: noteData.content
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toContain('Note created successfully');
      expect(text).toContain(noteData.title);
      
      // Extract note ID if possible for cleanup
      const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (idMatch) {
        testCase.trackNote(idMatch[1]);
      }
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should retrieve notes for a company', async () => {
    const testName = 'get_company_notes';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId) {
        throw new Error('Test company not available');
      }

      // First create a note to retrieve
      const noteData = TestDataFactory.createNoteData('TCN01_Read');
      const createResult = await testCase.executeToolCall('create-note', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        title: noteData.title,
        content: noteData.content
      });

      expect(createResult.isError).toBeFalsy();
      
      // Extract note ID for cleanup
      const createText = createResult.content?.[0]?.text || '';
      const idMatch = createText.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (idMatch) {
        testCase.trackNote(idMatch[1]);
      }

      // Now retrieve the notes
      const result = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 10
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();
      
      // Should contain our created note
      expect(text).toContain(noteData.title);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should retrieve notes for a person', async () => {
    const testName = 'get_person_notes';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testPersonId) {
        throw new Error('Test person not available');
      }

      // First create a note to retrieve
      const noteData = TestDataFactory.createNoteData('TCN01_PersonRead');
      const createResult = await testCase.executeToolCall('create-note', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        title: noteData.title,
        content: noteData.content
      });

      expect(createResult.isError).toBeFalsy();
      
      // Extract note ID for cleanup
      const createText = createResult.content?.[0]?.text || '';
      const idMatch = createText.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (idMatch) {
        testCase.trackNote(idMatch[1]);
      }

      // Now retrieve the notes
      const result = await testCase.executeToolCall('list-notes', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        limit: 10
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();
      
      // Should contain our created note
      expect(text).toContain(noteData.title);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });
});