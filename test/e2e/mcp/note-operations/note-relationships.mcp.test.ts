/**
 * TC-N02: Note Relationship Operations - Note Parent Attachments
 * P1 Essential Test
 * 
 * Validates note relationships and parent record attachments.
 * Must achieve 100% pass rate as part of P1 quality gate.
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class NoteRelationshipsTest extends MCPTestBase {
  private testCompanyId: string | null = null;
  private testPersonId: string | null = null;
  private testDealId: string | null = null;
  private secondCompanyId: string | null = null;
  private createdNotes: string[] = [];

  constructor() {
    super('TCN02');
  }

  /**
   * Setup test data - create multiple parent records to test relationships
   */
  async setupTestData(): Promise<void> {
    try {
      // Create first test company
      const companyData1 = TestDataFactory.createCompanyData('TCN02_Company1');
      const companyResult1 = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData1
      });

      if (!companyResult1.isError) {
        const text = companyResult1.content?.[0]?.text || '';
        const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
        if (idMatch) {
          this.testCompanyId = idMatch[1];
          TestDataFactory.trackRecord('companies', this.testCompanyId);
        }
      }

      // Create second test company
      const companyData2 = TestDataFactory.createCompanyData('TCN02_Company2');
      const companyResult2 = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData2
      });

      if (!companyResult2.isError) {
        const text = companyResult2.content?.[0]?.text || '';
        const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
        if (idMatch) {
          this.secondCompanyId = idMatch[1];
          TestDataFactory.trackRecord('companies', this.secondCompanyId);
        }
      }

      // Create a test person
      const personData = TestDataFactory.createPersonData('TCN02');
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
        const dealData = TestDataFactory.createDealData('TCN02');
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

describe('TC-N02: Note Relationship Operations - Note Parent Attachments', () => {
  const testCase = new NoteRelationshipsTest();
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
    console.log(`\nTC-N02 Results: ${passedCount}/${totalCount} passed`);
    
    // P1 tests require 100% pass rate for notes
    if (totalCount > 0) {
      const passRate = (passedCount / totalCount) * 100;
      if (passRate < 100) {
        console.warn(`⚠️ TC-N02 below P1 threshold: ${passRate.toFixed(1)}% (required: 100%)`);
      }
    }
  });

  it('should properly attach notes to company parent records', async () => {
    const testName = 'note_company_attachment';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId) {
        throw new Error('Test company not available');
      }

      // Create a note for the company
      const noteData = TestDataFactory.createNoteData('TCN02_CompanyAttach');
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

      // Verify the note is attached by retrieving company notes
      const notesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 10
      });

      expect(notesResult.isError).toBeFalsy();
      
      const notesText = notesResult.content?.[0]?.text || '';
      expect(notesText).toContain(noteData.title);
      // Note: list-notes only returns titles, not full content

      // Verify the note doesn't appear in other company's notes
      if (testCase.secondCompanyId) {
        const otherNotesResult = await testCase.executeToolCall('list-notes', {
          resource_type: 'companies',
          record_id: testCase.secondCompanyId,
          limit: 10
        });

        if (!otherNotesResult.isError) {
          const otherNotesText = otherNotesResult.content?.[0]?.text || '';
          // Should not contain our note (unless it's a general "no notes" message)
          if (!otherNotesText.includes('No notes found')) {
            expect(otherNotesText).not.toContain(noteData.title);
          }
        }
      }
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should properly attach notes to person parent records', async () => {
    const testName = 'note_person_attachment';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testPersonId) {
        throw new Error('Test person not available');
      }

      // Create a note for the person
      const noteData = TestDataFactory.createNoteData('TCN02_PersonAttach');
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

      // Verify the note is attached by retrieving person notes
      const notesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        limit: 10
      });

      expect(notesResult.isError).toBeFalsy();
      
      const notesText = notesResult.content?.[0]?.text || '';
      expect(notesText).toContain(noteData.title);
      // Note: list-notes only returns titles, not full content

      // Verify the note doesn't appear in company notes
      if (testCase.testCompanyId) {
        const companyNotesResult = await testCase.executeToolCall('list-notes', {
          resource_type: 'companies',
          record_id: testCase.testCompanyId,
          limit: 10
        });

        if (!companyNotesResult.isError) {
          const companyNotesText = companyNotesResult.content?.[0]?.text || '';
          // Should not contain our person note (unless it's a general "no notes" message)
          if (!companyNotesText.includes('No notes found')) {
            expect(companyNotesText).not.toContain(noteData.title);
          }
        }
      }
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should maintain note isolation between different parent types', async () => {
    const testName = 'note_parent_isolation';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId || !testCase.testPersonId) {
        throw new Error('Test company or person not available');
      }

      // Create distinct notes for company and person
      const companyNoteData = TestDataFactory.createNoteData('TCN02_CompanyIsolation');
      const personNoteData = TestDataFactory.createNoteData('TCN02_PersonIsolation');

      // Create company note
      const companyNoteResult = await testCase.executeToolCall('create-note', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        title: companyNoteData.title,
        content: companyNoteData.content
      });

      expect(companyNoteResult.isError).toBeFalsy();
      
      // Extract company note ID for cleanup
      const companyText = companyNoteResult.content?.[0]?.text || '';
      const companyIdMatch = companyText.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (companyIdMatch) {
        testCase.trackNote(companyIdMatch[1]);
      }

      // Create person note
      const personNoteResult = await testCase.executeToolCall('create-note', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        title: personNoteData.title,
        content: personNoteData.content
      });

      expect(personNoteResult.isError).toBeFalsy();
      
      // Extract person note ID for cleanup
      const personText = personNoteResult.content?.[0]?.text || '';
      const personIdMatch = personText.match(/\(ID:\s*([a-f0-9-]+)\)/i);
      if (personIdMatch) {
        testCase.trackNote(personIdMatch[1]);
      }

      // Verify company notes only contain company note
      const companyNotesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 10
      });

      expect(companyNotesResult.isError).toBeFalsy();
      const companyNotesText = companyNotesResult.content?.[0]?.text || '';
      expect(companyNotesText).toContain(companyNoteData.title);
      expect(companyNotesText).not.toContain(personNoteData.title);

      // Verify person notes only contain person note
      const personNotesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        limit: 10
      });

      expect(personNotesResult.isError).toBeFalsy();
      const personNotesText = personNotesResult.content?.[0]?.text || '';
      expect(personNotesText).toContain(personNoteData.title);
      expect(personNotesText).not.toContain(companyNoteData.title);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });
});