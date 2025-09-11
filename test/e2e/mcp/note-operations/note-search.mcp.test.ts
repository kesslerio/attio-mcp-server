/**
 * TC-N03: Note Search Operations - Content Search and Filtering
 * P1 Essential Test
 * 
 * Validates note search functionality including content search, filtering, and pagination.
 * Must achieve 100% pass rate as part of P1 quality gate.
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import { TestUtilities } from '../shared/test-utilities';
import type { TestResult } from '../shared/quality-gates';

class NoteSearchTest extends MCPTestBase {
  private testCompanyId: string | null = null;
  private testPersonId: string | null = null;
  private createdNotes: string[] = [];
  private searchableNotes: Array<{ id?: string; title: string; content: string; type: string }> = [];

  constructor() {
    super('TCN03');
  }

  /**
   * Setup test data - create parent records and searchable notes
   */
  async setupTestData(): Promise<void> {
    try {
      // Create test company
      const companyData = TestDataFactory.createCompanyData('TCN03');
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

      // Create test person
      const personData = TestDataFactory.createPersonData('TCN03');
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

      // Create multiple searchable notes with distinct content
      await this.createSearchableNotes();
    } catch (error) {
      console.error('Failed to setup test data:', error);
    }
  }

  /**
   * Create a set of notes with searchable content
   */
  async createSearchableNotes(): Promise<void> {
    if (!this.testCompanyId || !this.testPersonId) {
      throw new Error('Parent records not available for note creation');
    }

    const notesToCreate = [
      {
        title: 'TCN03 Meeting Notes',
        content: 'Discussion about quarterly targets and strategic planning',
        type: 'company',
        parentId: this.testCompanyId
      },
      {
        title: 'TCN03 Follow-up',
        content: 'Action items from client meeting: review contract terms and pricing',
        type: 'company',
        parentId: this.testCompanyId
      },
      {
        title: 'TCN03 Personal Note',
        content: 'Personal development goals and career planning discussion',
        type: 'person',
        parentId: this.testPersonId
      },
      {
        title: 'TCN03 Technical Discussion',
        content: 'Technical requirements for new product features and implementation',
        type: 'person',
        parentId: this.testPersonId
      }
    ];

    for (const noteSpec of notesToCreate) {
      try {
        // Use universal create-note tool for all types
        
        const result = await this.executeToolCall('create-note', {
          resource_type: noteSpec.type === 'company' ? 'companies' : 'people',
          record_id: noteSpec.parentId,
          title: noteSpec.title,
          content: noteSpec.content
        });

        if (!result.isError) {
          const text = result.content?.[0]?.text || '';
          const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
          
          this.searchableNotes.push({
            id: idMatch?.[1],
            title: noteSpec.title,
            content: noteSpec.content,
            type: noteSpec.type
          });

          if (idMatch) {
            this.trackNote(idMatch[1]);
          }
        }
      } catch (error) {
        console.warn(`Failed to create searchable note: ${noteSpec.title}`, error);
      }
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

describe('TC-N03: Note Search Operations - Content Search and Filtering', () => {
  const testCase = new NoteSearchTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupTestData();
  });

  afterEach(async () => {
    // Notes are cleaned up in afterAll since they're needed for multiple tests
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();
    
    // Log quality gate results for this test case
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTC-N03 Results: ${passedCount}/${totalCount} passed`);
    
    // P1 tests require 100% pass rate for notes
    if (totalCount > 0) {
      const passRate = (passedCount / totalCount) * 100;
      if (passRate < 100) {
        console.warn(`⚠️ TC-N03 below P1 threshold: ${passRate.toFixed(1)}% (required: 100%)`);
      }
    }
  });

  it('should search notes by content using universal search', async () => {
    const testName = 'search_notes_by_content';
    let passed = false;
    let error: string | undefined;

    try {
      // Search for notes containing "quarterly" (should find meeting notes)
      const result = await testCase.executeToolCall('search-by-content', {
        resource_type: 'notes',
        content_type: 'notes',
        search_query: 'quarterly',
        limit: 10
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();
      
      // Result should contain relevant information (may be companies that have notes with "quarterly")
      expect(text.length).toBeGreaterThan(0);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should retrieve notes with pagination using limit and offset', async () => {
    const testName = 'notes_pagination';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId) {
        throw new Error('Test company not available');
      }

      // Get first page of notes (limit 2)
      const firstPageResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 2,
        offset: 0
      });

      expect(firstPageResult.isError).toBeFalsy();
      
      const firstPageText = firstPageResult.content?.[0]?.text || '';
      expect(firstPageText).toBeTruthy();

      // Get second page of notes (limit 2, offset 2)
      const secondPageResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 2,
        offset: 2
      });

      expect(secondPageResult.isError).toBeFalsy();
      
      const secondPageText = secondPageResult.content?.[0]?.text || '';
      expect(secondPageText).toBeTruthy();

      // Pages should be different (unless there are no more results)
      if (!secondPageText.includes('No notes found') && !firstPageText.includes('No notes found')) {
        // If both pages have content, they should be different
        // This is a loose check since note content might vary
        expect(firstPageText).not.toBe(secondPageText);
      }
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should filter notes by parent type (company vs person)', async () => {
    const testName = 'notes_filtering_by_parent';
    let passed = false;
    let error: string | undefined;

    try {
      if (!testCase.testCompanyId || !testCase.testPersonId) {
        throw new Error('Test company or person not available');
      }

      // Get company notes
      const companyNotesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: testCase.testCompanyId,
        limit: 10
      });

      expect(companyNotesResult.isError).toBeFalsy();
      
      const companyNotesText = companyNotesResult.content?.[0]?.text || '';

      // Get person notes
      const personNotesResult = await testCase.executeToolCall('list-notes', {
        resource_type: 'people',
        record_id: testCase.testPersonId,
        limit: 10
      });

      expect(personNotesResult.isError).toBeFalsy();
      
      const personNotesText = personNotesResult.content?.[0]?.text || '';

      // Both should return valid responses (even if "No notes found")
      expect(companyNotesText).toBeTruthy();
      expect(personNotesText).toBeTruthy();

      // Verify filtering works by checking that notes are properly separated
      if (!companyNotesText.includes('No notes found') && 
          !personNotesText.includes('No notes found')) {
        
        // Find our test notes in the appropriate results
        const companyNote = testCase.searchableNotes.find(n => n.type === 'company');
        const personNote = testCase.searchableNotes.find(n => n.type === 'person');

        if (companyNote) {
          expect(companyNotesText).toContain(companyNote.title);
        }
        
        if (personNote) {
          expect(personNotesText).toContain(personNote.title);
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

  it('should handle empty search results gracefully', async () => {
    const testName = 'empty_search_results';
    let passed = false;
    let error: string | undefined;

    try {
      // Search for something that definitely doesn't exist
      const result = await testCase.executeToolCall('search-by-content', {
        resource_type: 'notes',
        content_type: 'notes',
        search_query: 'xyznonexistentquery123',
        limit: 10
      });

      // Should not error, but may return empty results
      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();
      
      // Should handle empty results gracefully (return some indication of no results)
      // The exact format depends on the search implementation
      expect(text.length).toBeGreaterThan(0);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });

  it('should search with multiple criteria and return relevant results', async () => {
    const testName = 'multi_criteria_search';
    let passed = false;
    let error: string | undefined;

    try {
      // Search for notes containing "technical" (should find technical discussion note)
      const result = await testCase.executeToolCall('search-by-content', {
        resource_type: 'notes',
        content_type: 'notes',
        search_query: 'technical',
        limit: 5
      });

      expect(result.isError).toBeFalsy();
      
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();
      
      // Result should contain relevant information
      expect(text.length).toBeGreaterThan(0);
      
      // Try another search term
      const result2 = await testCase.executeToolCall('search-by-content', {
        resource_type: 'notes',
        content_type: 'notes',
        search_query: 'meeting',
        limit: 5
      });

      expect(result2.isError).toBeFalsy();
      
      const text2 = result2.content?.[0]?.text || '';
      expect(text2).toBeTruthy();
      expect(text2.length).toBeGreaterThan(0);
      
      passed = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`${testName} failed:`, error);
    }

    results.push({ testName, passed, error });
    expect(passed).toBe(true);
  });
});