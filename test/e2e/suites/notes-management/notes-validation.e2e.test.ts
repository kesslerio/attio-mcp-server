/**
 * Notes Validation and Complex Scenarios E2E Tests
 *
 * Focused testing of note content validation, format handling, edge cases,
 * complex business scenarios, and error conditions.
 *
 * Tools tested:
 * - create-note with various content formats and edge cases
 * - Content validation and error handling scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  AttioRecord,
  NoteRecord,
  testCompanies,
  testPeople,
  createdNotes,
  createSharedSetup,
  createTestCompany,
  createTestPerson,
  callNotesTool,
  E2EAssertions,
  noteScenarios,
  edgeCaseNotes,
} from './shared-setup.js';
import type { McpToolResponse } from '../../types/index.js';

describe
  .skipIf(!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true')
  .sequential('Notes Validation and Complex Scenarios E2E Tests', () => {
    const setup = createSharedSetup();

    beforeAll(async () => {
      await setup.beforeAll();
      // Ensure we have test data
      if (testCompanies.length === 0) await createTestCompany();
      if (testPeople.length === 0) await createTestPerson();
    }, 30000);

    afterAll(setup.afterAll, 30000);
    beforeEach(setup.beforeEach);

    describe('Note Content and Format Validation', () => {
      it('should handle notes with special characters', async () => {
        if (testCompanies.length === 0) {
          console.error('⏭️ Skipping special characters test - no test companies available');
          return;
        }
        
        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping special characters test - invalid company data'
          );
          return;
        }
        
        const noteData = edgeCaseNotes.specialCharacters(
          testCompany.id.record_id
        );

        const response = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toContain('Special™ & Co.');
        expect(createdNote.content).toContain(
          'Note with special characters: áéíóú ñ çß àèìòù âêîôû'
        );

        createdNotes.push(createdNote);

        console.error('🔣 Created note with special characters');
      }, 30000);

      it('should handle notes with Unicode and emoji', async () => {
        if (testPeople.length === 0) {
          console.error('⏭️ Skipping Unicode test - no test people available');
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error('⏭️ Skipping Unicode test - invalid person data');
          return;
        }
        const noteData = edgeCaseNotes.unicode(
          testPerson.id.record_id,
          'people'
        );

        const response = (await callNotesTool('create-note', {
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toContain('📝');
        expect(createdNote.content).toContain('🚀 💼 📊');

        createdNotes.push(createdNote);

        console.error('🌍 Created Unicode note with emoji');
      }, 30000);

      it('should handle long content notes', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping long content test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping long content test - invalid company data');
          return;
        }
        const noteData = edgeCaseNotes.longContent(testCompany.id.record_id);

        const response = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.content.length).toBeGreaterThan(1000);
        expect(createdNote.content).toContain('Lorem ipsum dolor sit amet');

        createdNotes.push(createdNote);

        console.error(
          '📄 Created long content note:',
          createdNote.content.length,
          'characters'
        );
      }, 30000);

      it('should handle HTML formatted content', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping HTML content test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping HTML content test - invalid company data');
          return;
        }
        const noteData = edgeCaseNotes.htmlContent(testCompany.id.record_id);

        const response = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'html',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        // Note: Attio API converts HTML to plain text, so we check for text content
        expect(createdNote.content).toContain('HTML Content Test');
        expect(createdNote.content).toContain(
          'HTML formatting'
        );

        createdNotes.push(createdNote);

        console.error('🏷️ Created HTML formatted note');
      }, 30000);

      it('should handle minimal content notes', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping minimal content test - no test people available'
          );
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping minimal content test - invalid person data'
          );
          return;
        }
        const noteData = edgeCaseNotes.minimal(
          testPerson.id.record_id,
          'people'
        );

        const response = (await callNotesTool('create-note', {
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toBe('E2E Minimal Note');
        expect(createdNote.content).toBe('Minimal content.');

        createdNotes.push(createdNote);

        console.error('📌 Created minimal note');
      }, 30000);
    });

    describe('Complex Note Scenarios', () => {
      it('should create a complete sales process note set', async () => {
        if (testCompanies.length === 0 || testPeople.length === 0) {
          console.error(
            '⏭️ Skipping sales process test - insufficient test data'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id || !testPerson?.id?.record_id) {
          console.error('⏭️ Skipping sales process test - invalid test data');
          return;
        }
        const salesNotes = noteScenarios.salesProcess(
          testCompany.id.record_id,
          testPerson.id.record_id
        );

        // Create company notes
        const companyNoteResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: salesNotes.initialMeeting.title,
          content: salesNotes.initialMeeting.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(companyNoteResponse);
        const companyNote = E2EAssertions.expectMcpData(
          companyNoteResponse
        ) as unknown as NoteRecord;
        createdNotes.push(companyNote);

        // Create person notes
        const personNoteResponse = (await callNotesTool('create-note', {
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: salesNotes.introduction.title,
          content: salesNotes.introduction.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(personNoteResponse);
        const personNote = E2EAssertions.expectMcpData(
          personNoteResponse
        ) as unknown as NoteRecord;
        createdNotes.push(personNote);

        console.error('💼 Created sales process note set');
      }, 45000);

      it('should create customer success journey notes', async () => {
        if (testCompanies.length === 0 || testPeople.length === 0) {
          console.error(
            '⏭️ Skipping customer success test - insufficient test data'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id || !testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping customer success test - invalid test data'
          );
          return;
        }
        const successNotes = noteScenarios.customerSuccess(
          testCompany.id.record_id,
          testPerson.id.record_id
        );

        // Create onboarding note
        const onboardingResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: successNotes.onboardingSession.title,
          content: successNotes.onboardingSession.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(onboardingResponse);
        const onboardingNote = E2EAssertions.expectMcpData(
          onboardingResponse
        ) as unknown as NoteRecord;
        createdNotes.push(onboardingNote);

        // Create user feedback note
        const feedbackResponse = (await callNotesTool('create-note', {
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: successNotes.userFeedback.title,
          content: successNotes.userFeedback.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(feedbackResponse);
        const feedbackNote = E2EAssertions.expectMcpData(
          feedbackResponse
        ) as unknown as NoteRecord;
        createdNotes.push(feedbackNote);

        console.error('🎯 Created customer success journey notes');
      }, 45000);

      it('should create project management notes with markdown', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping project management test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping project management test - invalid company data'
          );
          return;
        }
        const projectNotes = noteScenarios.projectManagement(
          testCompany.id.record_id
        );

        // Create project status note
        const statusResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: projectNotes.statusUpdate.title,
          content: projectNotes.statusUpdate.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(statusResponse);
        const statusNote = E2EAssertions.expectMcpData(
          statusResponse
        ) as unknown as NoteRecord;

        expect(statusNote.content).toContain(
          '# E2E Implementation Project Status'
        );
        expect(statusNote.content).toContain(
          '**Overall Progress:** 75% Complete'
        );

        createdNotes.push(statusNote);

        console.error('📊 Created project management notes');
      }, 30000);
    });

    describe('Error Handling and Validation', () => {
      it('should handle invalid company ID gracefully', async () => {
        const response = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: 'invalid-company-id-12345',
          title: 'Test Note',
          content: 'This should fail',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(
          response,
          /not found|invalid|does not exist|missing required parameter/i
        );
      }, 15000);

      it('should handle invalid person ID gracefully', async () => {
        const response = (await callNotesTool('create-note', {
          resource_type: 'people',
          record_id: 'invalid-person-id-12345',
          title: 'Test Note',
          content: 'This should fail',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(
          response,
          /not found|invalid|does not exist|missing required parameter/i
        );
      }, 15000);

      it('should validate required fields for company notes', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping validation test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping validation test - invalid company data');
          return;
        }

        // Missing title
        const missingTitleResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          content: 'Content without title',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(missingTitleResponse);

        // Missing content
        const missingContentResponse = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: 'Title without content',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(missingContentResponse);
      }, 20000);

      it('should handle notes retrieval for non-existent records', async () => {
        const companyResponse = (await callNotesTool('list-notes', {
          resource_type: 'companies',
          record_id: 'non-existent-company-12345',
        })) as McpToolResponse;

        // This might return empty results or an error depending on implementation
        if (companyResponse.isError) {
          E2EAssertions.expectMcpError(companyResponse, /not found|invalid/i);
        } else {
          const notes = E2EAssertions.expectMcpData(companyResponse);
          expect(notes).toBeDefined();
        }

        const personResponse = (await callNotesTool('list-notes', {
          resource_type: 'people',
          record_id: 'non-existent-person-12345',
        })) as McpToolResponse;

        if (personResponse.isError) {
          E2EAssertions.expectMcpError(personResponse, /not found|invalid/i);
        } else {
          const notes = E2EAssertions.expectMcpData(personResponse);
          expect(notes).toBeDefined();
        }
      }, 20000);

      it('should handle empty content gracefully', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping empty content test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping empty content test - invalid company data'
          );
          return;
        }
        const noteData = edgeCaseNotes.emptyContent(testCompany.id.record_id);

        const response = (await callNotesTool('create-note', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        // This might succeed or fail depending on API validation
        if (response.isError) {
          expect(response.error).toMatch(/invalid|content|required|empty/i);
        } else {
          const createdNote = E2EAssertions.expectMcpData(
            response
          ) as unknown as NoteRecord;
          expect(createdNote.title).toBe(noteData.title);
          createdNotes.push(createdNote);
        }
      }, 15000);
    });
  });
