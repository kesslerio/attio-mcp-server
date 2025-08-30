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

import type { McpToolResponse } from '../../types/index.js';

describe
  .skipIf(!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true')
  .sequential('Notes Validation and Complex Scenarios E2E Tests', () => {

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
          console.error(
            '⏭️ Skipping special characters test - no test companies available'
          );
          return;
        }

        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping special characters test - invalid company data'
          );
          return;
        }
          testCompany.id.record_id
        );

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.title).toContain('Special™ & Co.');
        expect(createdNote.content).toContain(
          'Cupcake chocolate bear claw chocolate apple pie pudding. sweet sesame gummi bears dragée cupcake ice cream cotton candy. fruitcake wafer apple pie icing bear claw apple pie soufflé powder candy canes apple pie halvah cotton candy croissant. gummies lollipop halvah sesame jelly-o fruit caked onut bear claw snaps chupa chups. halvah cupcake sugar fruitcake toffee.marzipan sweet dessert halvah pudding jelly-o lemon drops pudding danish.'
        );

        createdNotes.push(createdNote);

        console.error('🔣 Created note with special characters');
      }, 30000);

      it('should handle notes with Unicode and emoji', async () => {
        if (testPeople.length === 0) {
          console.error('⏭️ Skipping Unicode test - no test people available');
          return;
        }

        if (!testPerson?.id?.record_id) {
          console.error('⏭️ Skipping Unicode test - invalid person data');
          return;
        }
          testPerson.id.record_id,
          'people'
        );

          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
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

        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping long content test - invalid company data');
          return;
        }

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
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

        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping HTML content test - invalid company data');
          return;
        }

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        expect(createdNote.content).toContain('<h2>HTML Content Test</h2>');
        expect(createdNote.content).toContain(
          '<strong>HTML formatting</strong>'
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

        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping minimal content test - invalid person data'
          );
          return;
        }
          testPerson.id.record_id,
          'people'
        );

          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
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

        if (!testCompany?.id?.record_id || !testPerson?.id?.record_id) {
          console.error('⏭️ Skipping sales process test - invalid test data');
          return;
        }
          testCompany.id.record_id,
          testPerson.id.record_id
        );

        // Create company notes
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: salesNotes.initialMeeting.title,
          content: salesNotes.initialMeeting.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(companyNoteResponse);
          companyNoteResponse
        ) as unknown as NoteRecord;
        createdNotes.push(companyNote);

        // Create person notes
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: salesNotes.introduction.title,
          content: salesNotes.introduction.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(personNoteResponse);
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

        if (!testCompany?.id?.record_id || !testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping customer success test - invalid test data'
          );
          return;
        }
          testCompany.id.record_id,
          testPerson.id.record_id
        );

        // Create onboarding note
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: successNotes.onboardingSession.title,
          content: successNotes.onboardingSession.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(onboardingResponse);
          onboardingResponse
        ) as unknown as NoteRecord;
        createdNotes.push(onboardingNote);

        // Create user feedback note
          resource_type: 'people',
          record_id: testPerson.id.record_id,
          title: successNotes.userFeedback.title,
          content: successNotes.userFeedback.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(feedbackResponse);
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

        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping project management test - invalid company data'
          );
          return;
        }
          testCompany.id.record_id
        );

        // Create project status note
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: projectNotes.statusUpdate.title,
          content: projectNotes.statusUpdate.content,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(statusResponse);
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

        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping validation test - invalid company data');
          return;
        }

        // Missing title
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          content: 'Content without title',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(missingTitleResponse);

        // Missing content
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: 'Title without content',
        })) as McpToolResponse;

        E2EAssertions.expectMcpError(missingContentResponse);
      }, 20000);

      it('should handle notes retrieval for non-existent records', async () => {
          resource_type: 'companies',
          record_id: 'non-existent-company-12345',
        })) as McpToolResponse;

        // This might return empty results or an error depending on implementation
        if (companyResponse.isError) {
          E2EAssertions.expectMcpError(companyResponse, /not found|invalid/i);
        } else {
          expect(notes).toBeDefined();
        }

          resource_type: 'people',
          record_id: 'non-existent-person-12345',
        })) as McpToolResponse;

        if (personResponse.isError) {
          E2EAssertions.expectMcpError(personResponse, /not found|invalid/i);
        } else {
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

        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping empty content test - invalid company data'
          );
          return;
        }

          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        // This might succeed or fail depending on API validation
        if (response.isError) {
          expect(response.error).toMatch(/content|required|empty/i);
        } else {
            response
          ) as unknown as NoteRecord;
          expect(createdNote.title).toBe(noteData.title);
          createdNotes.push(createdNote);
        }
      }, 15000);
    });
  });
