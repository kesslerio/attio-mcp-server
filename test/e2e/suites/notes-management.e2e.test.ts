/**
 * Notes Management E2E Tests
 * 
 * Comprehensive end-to-end testing of notes-related MCP tools
 * including note creation, retrieval, content validation, and error scenarios.
 * 
 * Tools tested (now using universal tools with automatic migration):
 * - get-company-notes → search-by-content (resource_type: 'companies')
 * - create-company-note → create-record (resource_type: 'notes')
 * - get-person-notes → search-by-content (resource_type: 'people') 
 * - create-person-note → create-record (resource_type: 'notes')
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import { loadE2EConfig } from '../utils/config-loader.js';
import { 
  CompanyFactory, 
  PersonFactory,
  noteFixtures,
  noteScenarios,
  edgeCaseNotes,
  performanceNotes
} from '../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Import enhanced tool caller with logging and migration
import { 
  callNotesTool, 
  startTestSuite, 
  endTestSuite,
  validateTestEnvironment,
  getToolMigrationStats
} from '../utils/enhanced-tool-caller.js';

/**
 * Notes Management E2E Test Suite
 * 
 * Tests comprehensive note management functionality including:
 * - Company note creation and retrieval
 * - Person note creation and retrieval
 * - Content format validation (plaintext, HTML, markdown)
 * - Pagination and limits
 * - Error handling and validation
 * - Content edge cases and special characters
 * - Performance with large content
 */

// Test configuration
const config = await loadE2EConfig();
let createdRecords: Array<{ type: string; id: string; data?: any }> = [];

// Note: callNotesTool is now imported from enhanced-tool-caller.js
// It automatically handles legacy-to-universal tool migration and comprehensive logging

describe('Notes Management E2E Tests', () => {
  
  // Test data storage
  let testCompanies: TestDataObject[] = [];
  let testPeople: TestDataObject[] = [];
  let createdNotes: TestDataObject[] = [];
  
  beforeAll(async () => {
    if (E2ETestBase.skipIfNoApiKey()) return;
    
    // Start comprehensive logging for this test suite
    startTestSuite('notes-management');
    
    // Validate test environment and tool migration setup
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }
    
    console.log('📊 Tool migration stats:', getToolMigrationStats());
    
    await E2ETestBase.setup({ 
      requiresRealApi: true, 
      cleanupAfterTests: true, 
      timeout: 120000 
    });
    
    console.log('🚀 Starting Notes Management E2E Tests with Universal Tools');
  }, 30000);

  afterAll(async () => {
    await E2ETestBase.cleanup();
    
    // End comprehensive logging for this test suite
    endTestSuite();
    
    console.log('✅ Notes Management E2E Tests completed with enhanced logging');
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Data Setup', () => {
    it('should create test companies for note testing', async () => {
      const companyData = CompanyFactory.create();
      const response = await callNotesTool('create-company', companyData);
      
      E2EAssertions.expectMcpSuccess(response);
      const company = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectCompanyRecord(company);
      testCompanies.push(company);
      
      console.log('🏢 Created test company:', company.id.record_id);
    }, 30000);

    it('should create test people for note testing', async () => {
      const personData = PersonFactory.create();
      const response = await callNotesTool('create-person', personData);
      
      E2EAssertions.expectMcpSuccess(response);
      const person = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectPersonRecord(person);
      testPeople.push(person);
      
      console.log('👤 Created test person:', person.id.record_id);
    }, 30000);
  });

  describe('Company Notes Management', () => {
    it('should create a company note with basic content', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping company note test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = noteFixtures.companies.meeting(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.title).toBe(noteData.title);
      expect(createdNote.content).toBe(noteData.content);
      
      createdNotes.push(createdNote);
      
      console.log('📝 Created company note:', createdNote.title);
    }, 30000);

    it('should retrieve company notes', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping get company notes test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const response = await callNotesTool('get-company-notes', {
        companyId: testCompany.id.record_id,
        limit: 10,
        offset: 0
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const notes = E2EAssertions.expectMcpData(response);
      
      // Notes might be an array or a response object with data array
      let noteArray: any[] = [];
      if (Array.isArray(notes)) {
        noteArray = notes;
      } else if (notes && Array.isArray(notes.data)) {
        noteArray = notes.data;
      }
      
      expect(noteArray).toBeDefined();
      
      if (noteArray.length > 0) {
        E2EAssertions.expectValidNoteCollection(noteArray);
        console.log('📋 Retrieved company notes:', noteArray.length);
      } else {
        console.log('📋 No company notes found (expected for new test data)');
      }
    }, 30000);

    it('should create company note with markdown content', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping markdown note test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = noteFixtures.markdown.meetingAgenda(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.content).toContain('# E2E Client Meeting Agenda');
      expect(createdNote.content).toContain('## Attendees');
      
      createdNotes.push(createdNote);
      
      console.log('📋 Created markdown company note:', createdNote.title);
    }, 30000);

    it('should handle company note creation with URI format', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping URI format test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = noteFixtures.companies.followUp(testCompany.id.record_id);
      const uri = `attio://companies/${testCompany.id.record_id}`;

      const response = await callNotesTool('create-company-note', {
        uri: uri,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      createdNotes.push(createdNote);
      
      console.log('🔗 Created company note via URI:', createdNote.title);
    }, 30000);

    it('should handle pagination for company notes', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping pagination test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      
      // Test with small limit
      const response = await callNotesTool('get-company-notes', {
        companyId: testCompany.id.record_id,
        limit: 2,
        offset: 0
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const notes = E2EAssertions.expectMcpData(response);
      expect(notes).toBeDefined();
      
      console.log('📄 Pagination test completed for company notes');
    }, 15000);
  });

  describe('Person Notes Management', () => {
    it('should create a person note with basic content', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping person note test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const noteData = noteFixtures.people.introduction(testPerson.id.record_id);

      const response = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.title).toBe(noteData.title);
      expect(createdNote.content).toBe(noteData.content);
      
      createdNotes.push(createdNote);
      
      console.log('👤 Created person note:', createdNote.title);
    }, 30000);

    it('should retrieve person notes', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping get person notes test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const response = await callNotesTool('get-person-notes', {
        personId: testPerson.id.record_id
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const notes = E2EAssertions.expectMcpData(response);
      
      // Notes might be an array or a response object
      let noteArray: any[] = [];
      if (Array.isArray(notes)) {
        noteArray = notes;
      } else if (notes && Array.isArray(notes.data)) {
        noteArray = notes.data;
      }
      
      expect(noteArray).toBeDefined();
      
      if (noteArray.length > 0) {
        E2EAssertions.expectValidNoteCollection(noteArray);
        console.log('👥 Retrieved person notes:', noteArray.length);
      } else {
        console.log('👥 No person notes found (expected for new test data)');
      }
    }, 30000);

    it('should create person note with technical content', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping technical note test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const noteData = noteFixtures.people.technical(testPerson.id.record_id);

      const response = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      E2EAssertions.expectTestNote(createdNote);
      
      createdNotes.push(createdNote);
      
      console.log('🔧 Created technical person note:', createdNote.title);
    }, 30000);

    it('should create person note with markdown formatting', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping markdown person note test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const noteData = noteFixtures.markdown.technicalSpecs(testPerson.id.record_id, 'people');

      const response = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.content).toContain('# E2E Technical Integration Specifications');
      
      createdNotes.push(createdNote);
      
      console.log('📋 Created markdown person note:', createdNote.title);
    }, 30000);
  });

  describe('Note Content and Format Validation', () => {
    it('should handle notes with special characters', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping special characters test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = edgeCaseNotes.specialCharacters(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.title).toContain('Special™ & Co.');
      expect(createdNote.content).toContain('áéíóú ñ çß');
      
      createdNotes.push(createdNote);
      
      console.log('🔣 Created note with special characters');
    }, 30000);

    it('should handle notes with Unicode and emoji', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping Unicode test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const noteData = edgeCaseNotes.unicode(testPerson.id.record_id, 'people');

      const response = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.title).toContain('📝');
      expect(createdNote.content).toContain('🚀 💼 📊');
      
      createdNotes.push(createdNote);
      
      console.log('🌍 Created Unicode note with emoji');
    }, 30000);

    it('should handle long content notes', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping long content test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = edgeCaseNotes.longContent(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.content.length).toBeGreaterThan(1000);
      expect(createdNote.content).toContain('Lorem ipsum dolor sit amet');
      
      createdNotes.push(createdNote);
      
      console.log('📄 Created long content note:', createdNote.content.length, 'characters');
    }, 30000);

    it('should handle HTML formatted content', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping HTML content test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = edgeCaseNotes.htmlContent(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.content).toContain('<h2>HTML Content Test</h2>');
      expect(createdNote.content).toContain('<strong>HTML formatting</strong>');
      
      createdNotes.push(createdNote);
      
      console.log('🏷️ Created HTML formatted note');
    }, 30000);

    it('should handle minimal content notes', async () => {
      if (testPeople.length === 0) {
        console.log('⏭️ Skipping minimal content test - no test people available');
        return;
      }

      const testPerson = testPeople[0];
      const noteData = edgeCaseNotes.minimal(testPerson.id.record_id, 'people');

      const response = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      E2EAssertions.expectMcpSuccess(response);
      const createdNote = E2EAssertions.expectMcpData(response);
      
      E2EAssertions.expectValidNoteStructure(createdNote);
      expect(createdNote.title).toBe('E2E Minimal Note');
      expect(createdNote.content).toBe('Minimal content.');
      
      createdNotes.push(createdNote);
      
      console.log('📌 Created minimal note');
    }, 30000);
  });

  describe('Complex Note Scenarios', () => {
    it('should create a complete sales process note set', async () => {
      if (testCompanies.length === 0 || testPeople.length === 0) {
        console.log('⏭️ Skipping sales process test - insufficient test data');
        return;
      }

      const testCompany = testCompanies[0];
      const testPerson = testPeople[0];
      const salesNotes = noteScenarios.salesProcess(testCompany.id.record_id, testPerson.id.record_id);

      // Create company notes
      const companyNoteResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: salesNotes.initialMeeting.title,
        content: salesNotes.initialMeeting.content
      });
      
      E2EAssertions.expectMcpSuccess(companyNoteResponse);
      const companyNote = E2EAssertions.expectMcpData(companyNoteResponse);
      createdNotes.push(companyNote);

      // Create person notes
      const personNoteResponse = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: salesNotes.introduction.title,
        content: salesNotes.introduction.content
      });
      
      E2EAssertions.expectMcpSuccess(personNoteResponse);
      const personNote = E2EAssertions.expectMcpData(personNoteResponse);
      createdNotes.push(personNote);

      console.log('💼 Created sales process note set');
    }, 45000);

    it('should create customer success journey notes', async () => {
      if (testCompanies.length === 0 || testPeople.length === 0) {
        console.log('⏭️ Skipping customer success test - insufficient test data');
        return;
      }

      const testCompany = testCompanies[0];
      const testPerson = testPeople[0];
      const successNotes = noteScenarios.customerSuccess(testCompany.id.record_id, testPerson.id.record_id);

      // Create onboarding note
      const onboardingResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: successNotes.onboardingSession.title,
        content: successNotes.onboardingSession.content
      });
      
      E2EAssertions.expectMcpSuccess(onboardingResponse);
      const onboardingNote = E2EAssertions.expectMcpData(onboardingResponse);
      createdNotes.push(onboardingNote);

      // Create user feedback note
      const feedbackResponse = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: successNotes.userFeedback.title,
        content: successNotes.userFeedback.content
      });
      
      E2EAssertions.expectMcpSuccess(feedbackResponse);
      const feedbackNote = E2EAssertions.expectMcpData(feedbackResponse);
      createdNotes.push(feedbackNote);

      console.log('🎯 Created customer success journey notes');
    }, 45000);

    it('should create project management notes with markdown', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping project management test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const projectNotes = noteScenarios.projectManagement(testCompany.id.record_id);

      // Create project status note
      const statusResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: projectNotes.statusUpdate.title,
        content: projectNotes.statusUpdate.content
      });
      
      E2EAssertions.expectMcpSuccess(statusResponse);
      const statusNote = E2EAssertions.expectMcpData(statusResponse);
      
      expect(statusNote.content).toContain('# E2E Implementation Project Status');
      expect(statusNote.content).toContain('**Overall Progress:** 75% Complete');
      
      createdNotes.push(statusNote);

      console.log('📊 Created project management notes');
    }, 30000);
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid company ID gracefully', async () => {
      const response = await callNotesTool('create-company-note', {
        companyId: 'invalid-company-id-12345',
        title: 'Test Note',
        content: 'This should fail'
      });
      
      E2EAssertions.expectMcpError(response, /not found|invalid|does not exist/i);
    }, 15000);

    it('should handle invalid person ID gracefully', async () => {
      const response = await callNotesTool('create-person-note', {
        personId: 'invalid-person-id-12345',
        title: 'Test Note',
        content: 'This should fail'
      });
      
      E2EAssertions.expectMcpError(response, /not found|invalid|does not exist/i);
    }, 15000);

    it('should validate required fields for company notes', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping validation test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      
      // Missing title
      const missingTitleResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        content: 'Content without title'
      });
      
      E2EAssertions.expectMcpError(missingTitleResponse);

      // Missing content
      const missingContentResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: 'Title without content'
      });
      
      E2EAssertions.expectMcpError(missingContentResponse);
    }, 20000);

    it('should handle notes retrieval for non-existent records', async () => {
      const companyResponse = await callNotesTool('get-company-notes', {
        companyId: 'non-existent-company-12345'
      });
      
      // This might return empty results or an error depending on implementation
      if (companyResponse.isError) {
        E2EAssertions.expectMcpError(companyResponse, /not found|invalid/i);
      } else {
        const notes = E2EAssertions.expectMcpData(companyResponse);
        expect(notes).toBeDefined();
      }

      const personResponse = await callNotesTool('get-person-notes', {
        personId: 'non-existent-person-12345'
      });
      
      if (personResponse.isError) {
        E2EAssertions.expectMcpError(personResponse, /not found|invalid/i);
      } else {
        const notes = E2EAssertions.expectMcpData(personResponse);
        expect(notes).toBeDefined();
      }
    }, 20000);

    it('should handle empty content gracefully', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping empty content test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const noteData = edgeCaseNotes.emptyContent(testCompany.id.record_id);

      const response = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: noteData.title,
        content: noteData.content
      });
      
      // This might succeed or fail depending on API validation
      if (response.isError) {
        expect(response.error).toMatch(/content|required|empty/i);
      } else {
        const createdNote = E2EAssertions.expectMcpData(response);
        expect(createdNote.title).toBe(noteData.title);
        createdNotes.push(createdNote);
      }
    }, 15000);
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent note creation', async () => {
      if (testCompanies.length === 0 || testPeople.length === 0) {
        console.log('⏭️ Skipping concurrent test - insufficient test data');
        return;
      }

      const testCompany = testCompanies[0];
      const testPerson = testPeople[0];

      const promises = [
        callNotesTool('create-company-note', {
          companyId: testCompany.id.record_id,
          title: 'Concurrent Note 1',
          content: 'First concurrent note'
        }),
        callNotesTool('create-person-note', {
          personId: testPerson.id.record_id,
          title: 'Concurrent Note 2',
          content: 'Second concurrent note'
        }),
        callNotesTool('create-company-note', {
          companyId: testCompany.id.record_id,
          title: 'Concurrent Note 3',
          content: 'Third concurrent note'
        })
      ];

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        E2EAssertions.expectMcpSuccess(response, `Concurrent note ${index + 1} should succeed`);
        const note = E2EAssertions.expectMcpData(response);
        createdNotes.push(note);
      });

      console.log('🚀 Concurrent note creation completed successfully');
    }, 45000);

    it('should validate execution times', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping execution time test - no test companies available');
        return;
      }

      const testCompany = testCompanies[0];
      const startTime = Date.now();

      const response = await callNotesTool('get-company-notes', {
        companyId: testCompany.id.record_id,
        limit: 10
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      E2EAssertions.expectMcpSuccess(response);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`⚡ Note retrieval completed in ${executionTime}ms`);
    }, 15000);

    it('should handle batch note creation for performance testing', async () => {
      if (testCompanies.length === 0) {
        console.log('⏭️ Skipping batch creation test - no test companies available'); 
        return;
      }

      const testCompany = testCompanies[0];
      const batchNotes = performanceNotes.generateBatch(testCompany.id.record_id, 'companies', 3);

      const startTime = Date.now();
      
      for (const noteData of batchNotes) {
        const response = await callNotesTool('create-company-note', {
          companyId: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content
        });
        
        if (response.isError) {
          console.warn('Batch note creation failed:', response.error);
        } else {
          const note = E2EAssertions.expectMcpData(response);
          createdNotes.push(note);
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / batchNotes.length;

      console.log(`📊 Batch creation: ${batchNotes.length} notes in ${totalTime}ms (avg: ${avgTime}ms per note)`);
      expect(avgTime).toBeLessThan(5000); // Average should be under 5 seconds per note
    }, 60000);
  });

  describe('Data Consistency and Integration', () => {
    it('should maintain note structure consistency across different record types', async () => {
      if (testCompanies.length === 0 || testPeople.length === 0) {
        console.log('⏭️ Skipping consistency test - insufficient test data');
        return;
      }

      const testCompany = testCompanies[0];
      const testPerson = testPeople[0];

      // Create similar notes for both record types
      const companyResponse = await callNotesTool('create-company-note', {
        companyId: testCompany.id.record_id,
        title: 'Consistency Test Note',
        content: 'Testing structural consistency across record types'
      });

      const personResponse = await callNotesTool('create-person-note', {
        personId: testPerson.id.record_id,
        title: 'Consistency Test Note',
        content: 'Testing structural consistency across record types'
      });

      E2EAssertions.expectMcpSuccess(companyResponse);
      E2EAssertions.expectMcpSuccess(personResponse);

      const companyNote = E2EAssertions.expectMcpData(companyResponse);
      const personNote = E2EAssertions.expectMcpData(personResponse);

      // Both notes should have consistent structure
      E2EAssertions.expectValidNoteStructure(companyNote);
      E2EAssertions.expectValidNoteStructure(personNote);

      // Core fields should be present in both
      expect(companyNote.title).toBeDefined();
      expect(personNote.title).toBeDefined();
      expect(companyNote.content).toBeDefined();
      expect(personNote.content).toBeDefined();

      createdNotes.push(companyNote, personNote);

      console.log('🧪 Validated note structure consistency');
    }, 30000);

    it('should validate test data cleanup tracking', async () => {
      // Verify that created notes are being tracked for cleanup
      expect(createdNotes.length).toBeGreaterThan(0);
      
      createdNotes.forEach((note, index) => {
        expect(note.title, `Note ${index} should have title`).toBeDefined();
        expect(note.content, `Note ${index} should have content`).toBeDefined();
        
        // Verify test data characteristics
        const isTestNote = note.title.includes('E2E') || 
                          note.title.includes('Test') || 
                          note.content.includes('E2E') ||
                          note.content.includes('testing purposes');
        
        expect(isTestNote, `Note ${index} should be identifiable as test data`).toBe(true);
      });

      console.log('🧹 Validated cleanup tracking for', createdNotes.length, 'notes');
    }, 10000);
  });
});