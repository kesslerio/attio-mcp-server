/**
 * Notes CRUD Operations E2E Tests
 *
 * Focused testing of basic note creation, retrieval, and management operations
 * for both companies and people resource types.
 *
 * Tools tested:
 * - create-note (companies and people)
 * - list-notes (companies and people)
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
  noteFixtures,
} from './shared-setup.js';
import type { McpToolResponse } from '../../types/index.js';

describe
  .skipIf(!process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true')
  .sequential('Notes CRUD Operations E2E Tests', () => {
    const setup = createSharedSetup();

    beforeAll(setup.beforeAll, 30000);
    afterAll(setup.afterAll, 30000);
    beforeEach(setup.beforeEach);

    describe('Test Data Setup', () => {
      it('should create test companies for note testing', async () => {
        await createTestCompany();
      }, 30000);

      it('should create test people for note testing', async () => {
        await createTestPerson();
      }, 30000);
    });

    describe('Company Notes Management', () => {
      it('should create a company note with basic content', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping company note test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping company note test - invalid company data');
          return;
        }
        const noteData = noteFixtures.companies.meeting(
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
        expect(createdNote.title).toBe(noteData.title);
        expect(createdNote.content).toBe(noteData.content);

        createdNotes.push(createdNote);

        console.error('📝 Created company note:', createdNote.title);
      }, 30000);

      it('should retrieve company notes', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping get company notes test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping get company notes test - invalid company data'
          );
          return;
        }
        const response = (await callNotesTool('list-notes', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          limit: 10,
          offset: 0,
        })) as McpToolResponse;

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
          console.error('📋 Retrieved company notes:', noteArray.length);
        } else {
          console.error(
            '📋 No company notes found (expected for new test data)'
          );
        }
      }, 30000);

      it('should create company note with markdown content', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping markdown note test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error(
            '⏭️ Skipping markdown note test - invalid company data'
          );
          return;
        }
        const noteData = noteFixtures.markdown.meetingAgenda(
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
        expect(createdNote.content).toContain('# E2E Client Meeting Agenda');
        expect(createdNote.content).toContain('## Attendees');

        createdNotes.push(createdNote);

        console.error('📋 Created markdown company note:', createdNote.title);
      }, 30000);

      it('should handle company note creation with URI format', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping URI format test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping URI format test - invalid company data');
          return;
        }
        const noteData = noteFixtures.companies.followUp(
          testCompany.id.record_id
        );
        const uri = `attio://companies/${testCompany.id.record_id}`;

        const response = (await callNotesTool('create-note', {
          uri: uri,
          title: noteData.title,
          content: noteData.content,
          format: 'markdown',
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const createdNote = E2EAssertions.expectMcpData(
          response
        ) as unknown as NoteRecord;

        E2EAssertions.expectValidNoteStructure(createdNote);
        createdNotes.push(createdNote);

        console.error('🔗 Created company note via URI:', createdNote.title);
      }, 30000);

      it('should handle pagination for company notes', async () => {
        if (testCompanies.length === 0) {
          console.error(
            '⏭️ Skipping pagination test - no test companies available'
          );
          return;
        }

        const testCompany = testCompanies[0] as unknown as AttioRecord;
        if (!testCompany?.id?.record_id) {
          console.error('⏭️ Skipping pagination test - invalid company data');
          return;
        }

        // Test with small limit
        const response = (await callNotesTool('list-notes', {
          resource_type: 'companies',
          record_id: testCompany.id.record_id,
          limit: 2,
          offset: 0,
        })) as McpToolResponse;

        E2EAssertions.expectMcpSuccess(response);
        const notes = E2EAssertions.expectMcpData(response);
        expect(notes).toBeDefined();

        console.error('📄 Pagination test completed for company notes');
      }, 15000);
    });

    describe('Person Notes Management', () => {
      it('should create a person note with basic content', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping person note test - no test people available'
          );
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error('⏭️ Skipping person note test - invalid person data');
          return;
        }
        const noteData = noteFixtures.people.introduction(
          testPerson.id.record_id
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
        expect(createdNote.title).toBe(noteData.title);
        expect(createdNote.content).toBe(noteData.content);

        createdNotes.push(createdNote);

        console.error('👤 Created person note:', createdNote.title);
      }, 30000);

      it('should retrieve person notes', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping get person notes test - no test people available'
          );
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping get person notes test - invalid person data'
          );
          return;
        }
        const response = (await callNotesTool('list-notes', {
          resource_type: 'people',
          record_id: testPerson.id.record_id,
        })) as McpToolResponse;

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
          console.error('👥 Retrieved person notes:', noteArray.length);
        } else {
          console.error(
            '👥 No person notes found (expected for new test data)'
          );
        }
      }, 30000);

      it('should create person note with technical content', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping technical note test - no test people available'
          );
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping technical note test - invalid person data'
          );
          return;
        }
        const noteData = noteFixtures.people.technical(testPerson.id.record_id);

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
        E2EAssertions.expectTestNote(createdNote);

        createdNotes.push(createdNote);

        console.error('🔧 Created technical person note:', createdNote.title);
      }, 30000);

      it('should create person note with markdown formatting', async () => {
        if (testPeople.length === 0) {
          console.error(
            '⏭️ Skipping markdown person note test - no test people available'
          );
          return;
        }

        const testPerson = testPeople[0] as unknown as AttioRecord;
        if (!testPerson?.id?.record_id) {
          console.error(
            '⏭️ Skipping markdown person note test - invalid person data'
          );
          return;
        }
        const noteData = noteFixtures.markdown.technicalSpecs(
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
        expect(createdNote.content).toContain(
          '# E2E Technical Integration Specifications'
        );

        createdNotes.push(createdNote);

        console.error('📋 Created markdown person note:', createdNote.title);
      }, 30000);
    });
  });
