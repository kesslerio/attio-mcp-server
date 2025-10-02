/**
 * TC-EC05: Special Character Handling Edge Cases
 * P2 Edge Cases Test - Special Character Preservation
 * Issue #815: Special Character Handling in MCP E2E Tests
 *
 * Validates that quotes, HTML entities, and Unicode characters
 * remain intact across create → update → retrieve operations
 * for companies, people, and notes using the real Attio API.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { EdgeCaseTestBase } from '../shared/edge-case-test-base';
import { TestDataFactory } from '../shared/test-data-factory';

class SpecialCharacterHandlingTest extends EdgeCaseTestBase {
  constructor() {
    super('TC_EC05');
  }

  validateEnvironment(): void {
    if (process.env.E2E_MODE !== 'true') {
      throw new Error(
        'E2E_MODE must be set to "true" for special character E2E tests.'
      );
    }

    if (process.env.USE_MOCK_DATA === 'true') {
      throw new Error(
        'USE_MOCK_DATA must be "false" to run real Attio API validations.'
      );
    }

    if (!process.env.ATTIO_API_KEY) {
      throw new Error('ATTIO_API_KEY must be defined for Attio MCP E2E tests.');
    }
  }

  private recordSuccess(testName: string): void {
    const executionTime = this.endTestTiming();
    this.results.push({
      test: testName,
      passed: true,
      executionTime,
      expectedBehavior: 'graceful_handling',
      actualBehavior: 'graceful_handling',
    });
  }

  private recordFailure(testName: string, error: unknown): void {
    const executionTime = this.endTestTiming();
    this.results.push({
      test: testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
      expectedBehavior: 'graceful_handling',
      actualBehavior: 'error',
    });
  }

  private expectContainsOneOf(
    text: string,
    variants: string[],
    context: string
  ): void {
    const matched = variants.some(
      (variant) => variant.length > 0 && text.includes(variant)
    );

    expect(
      matched,
      `${context} should include one of: ${variants.join(' | ')}`
    ).toBe(true);
  }

  private createHtmlVariants(value: string): string[] {
    const angleEscaped = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fullyEscaped = angleEscaped
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return [value, angleEscaped, fullyEscaped];
  }

  async verifyCompanySpecialCharacterLifecycle(): Promise<void> {
    const testName = 'company_special_character_lifecycle';
    this.startTestTiming();

    try {
      const uniqueSuffix = this.generateTestId('company');
      const companyName = `O'Reilly "Media & Solutions" – 特殊字符 ${uniqueSuffix}`;
      const htmlSnippet = '<strong>重要 &amp; Bold</strong>';
      const baseCompanyData =
        TestDataFactory.createCompanyData('TC_EC05_COMPANY');
      const companyData = {
        ...baseCompanyData,
        name: companyName,
        description: `Quotes: "double" and 'single' | Entities: &amp; &lt; &gt; &nbsp; | HTML: ${htmlSnippet}`,
        domains: [`special-${Date.now()}.chars.test`],
      };

      const createResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      const creationText = this.extractTextContent(createResult);
      expect(createResult.isError).toBeFalsy();
      expect(creationText).toContain('Successfully created');
      expect(creationText).toContain("O'Reilly");
      expect(creationText).toContain('Media & Solutions');

      const companyId = this.extractRecordId(creationText);
      expect(companyId).toBeTruthy();
      this.trackRecord('companies', companyId);

      const detailsResult = await this.executeToolCall('get-record-details', {
        resource_type: 'companies',
        record_id: companyId,
      });
      const detailsText = this.extractTextContent(detailsResult);

      expect(detailsText).toContain(companyName);
      expect(detailsText).toContain('&amp;');
      expect(detailsText).toContain('特殊字符');
      this.expectContainsOneOf(
        detailsText,
        this.createHtmlVariants(htmlSnippet),
        'Company description HTML snippet'
      );

      const updatedDescription =
        'Updated “Smart Quotes” with O’Connor feedback &amp; <em>Résumé &amp; Co.</em> <script>alert("safety")</script> 🎯';
      const updateResult = await this.executeToolCall('update-record', {
        resource_type: 'companies',
        record_id: companyId,
        record_data: { description: updatedDescription },
      });

      const updateText = this.extractTextContent(updateResult);
      expect(updateResult.isError).toBeFalsy();
      expect(updateText.toLowerCase()).toContain('updated');

      const updatedDetails = await this.executeToolCall('get-record-details', {
        resource_type: 'companies',
        record_id: companyId,
      });
      const updatedText = this.extractTextContent(updatedDetails);

      expect(updatedText).toContain('“Smart Quotes”');
      expect(updatedText).toContain('O’Connor');
      expect(updatedText).toContain('🎯');
      this.expectContainsOneOf(
        updatedText,
        this.createHtmlVariants('<em>Résumé &amp; Co.</em>'),
        'Updated company emphasis'
      );

      const scriptVariants = this.createHtmlVariants(
        '<script>alert("safety")</script>'
      ).filter((variant) => variant !== '<script>alert("safety")</script>');
      expect(updatedText.includes('<script>alert("safety")</script>')).toBe(
        false
      );
      this.expectContainsOneOf(
        updatedText,
        scriptVariants,
        'Company script sanitization'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
      throw error;
    }
  }

  async verifyPersonSpecialCharacterLifecycle(): Promise<void> {
    const testName = 'person_special_character_lifecycle';
    this.startTestTiming();

    try {
      const uniqueSuffix = this.generateTestId('person');
      const personData = TestDataFactory.createPersonData('TC_EC05_PERSON');
      personData.name = `Renée O’Connor – “AI” Advocate ${uniqueSuffix}`;
      personData.job_title =
        'Lead "Innovation" Engineer &amp; Researcher — Unicode Ω Δ 🚀 &nbsp; Champion';
      personData.email_addresses = [`special.chars+${Date.now()}@example.com`];

      const createResult = await this.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });

      const creationText = this.extractTextContent(createResult);
      expect(createResult.isError).toBeFalsy();
      expect(creationText).toContain('Successfully created');
      expect(creationText).toContain('Renée');
      expect(creationText).toContain('O’Connor');

      const personId = this.extractRecordId(creationText);
      expect(personId).toBeTruthy();
      this.trackRecord('people', personId);

      const detailsResult = await this.executeToolCall('get-record-details', {
        resource_type: 'people',
        record_id: personId,
      });
      const detailsText = this.extractTextContent(detailsResult);

      expect(detailsText).toContain('Renée O’Connor');
      expect(detailsText).toContain('“AI”');
      expect(detailsText).toContain('&amp; Researcher');
      expect(detailsText).toContain('Ω');
      expect(detailsText).toContain('🚀');

      const updatedJobTitle =
        'Principal “Customer Success” Partner &amp; <strong>Growth Lead</strong> — 新しいビジョン';
      const updateResult = await this.executeToolCall('update-record', {
        resource_type: 'people',
        record_id: personId,
        record_data: {
          job_title: updatedJobTitle,
          linkedin_url: 'https://www.linkedin.com/in/special-characters-test/',
        },
      });

      const updateText = this.extractTextContent(updateResult);
      expect(updateResult.isError).toBeFalsy();
      expect(updateText.toLowerCase()).toContain('updated');

      const updatedDetails = await this.executeToolCall('get-record-details', {
        resource_type: 'people',
        record_id: personId,
      });
      const updatedText = this.extractTextContent(updatedDetails);

      expect(updatedText).toContain('Principal “Customer Success” Partner');
      this.expectContainsOneOf(
        updatedText,
        this.createHtmlVariants('<strong>Growth Lead</strong>'),
        'Person job title formatting'
      );
      expect(updatedText).toContain('新しいビジョン');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
      throw error;
    }
  }

  async verifyNoteSpecialCharacterLifecycle(): Promise<void> {
    const testName = 'note_special_character_lifecycle';
    this.startTestTiming();

    try {
      const parentCompanyData = TestDataFactory.createCompanyData(
        'TC_EC05_NOTE_PARENT'
      );
      const parentResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: parentCompanyData,
      });
      const parentText = this.extractTextContent(parentResult);
      expect(parentResult.isError).toBeFalsy();
      const parentCompanyId = this.extractRecordId(parentText);
      expect(parentCompanyId).toBeTruthy();
      this.trackRecord('companies', parentCompanyId);

      const noteTitle = '“Kickoff” Summary — Sprint 🚀 &amp; Vision';
      const noteContent = [
        'Meeting recap for O\'Reilly team: "Keep iterating" &amp; stay bold.',
        'Highlights: <strong>Revenue &amp; Retention</strong> remain high.',
        'International: こんにちは, привет, مرحبا, שלום.',
      ].join('\n');

      const createNoteResult = await this.executeToolCall('create-note', {
        resource_type: 'companies',
        record_id: parentCompanyId,
        title: noteTitle,
        content: noteContent,
      });

      const createNoteText = this.extractTextContent(createNoteResult);
      expect(createNoteResult.isError).toBeFalsy();
      expect(createNoteText).toContain('Note created');
      expect(createNoteText).toContain('“Kickoff” Summary');

      const noteId = this.extractRecordId(createNoteText);
      expect(noteId).toBeTruthy();
      this.trackRecord('notes', noteId);

      const listResult = await this.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: parentCompanyId,
        limit: 5,
      });
      const listText = this.extractTextContent(listResult);

      expect(listText).toContain('“Kickoff” Summary');
      expect(listText).toContain('&amp; Retention');
      this.expectContainsOneOf(
        listText,
        this.createHtmlVariants('<strong>Revenue &amp; Retention</strong>'),
        'Initial note HTML formatting'
      );
      expect(listText).toContain('привет');

      const updatedContent = [
        'Updated narrative with O’Connor’s insights &amp; “Conversion” focus.',
        'Security check: <script>alert("note")</script>',
        'Call to action: <em>Deliver &amp; Delight</em> — Merci, gracias, धन्यवाद!',
        'Emojis: 🎯✨',
      ].join('\n');
      const updatedTitle = '“Kickoff” Follow-up — Sprint 🚀 &amp; Growth';

      const updateNoteResult = await this.executeToolCall('update-record', {
        resource_type: 'notes',
        record_id: noteId,
        record_data: {
          title: updatedTitle,
          content: updatedContent,
        },
      });

      const updateNoteText = this.extractTextContent(updateNoteResult);
      expect(updateNoteResult.isError).toBeFalsy();
      expect(updateNoteText.toLowerCase()).toContain('updated');

      const updatedListResult = await this.executeToolCall('list-notes', {
        resource_type: 'companies',
        record_id: parentCompanyId,
        limit: 5,
      });
      const updatedListText = this.extractTextContent(updatedListResult);

      expect(updatedListText).toContain(updatedTitle);
      expect(updatedListText).toContain('O’Connor’s insights');
      expect(updatedListText).toContain('🎯✨');
      this.expectContainsOneOf(
        updatedListText,
        this.createHtmlVariants('<em>Deliver &amp; Delight</em>'),
        'Updated note emphasis'
      );
      const noteScriptVariants = this.createHtmlVariants(
        '<script>alert("note")</script>'
      ).filter((variant) => variant !== '<script>alert("note")</script>');
      expect(updatedListText.includes('<script>alert("note")</script>')).toBe(
        false
      );
      this.expectContainsOneOf(
        updatedListText,
        noteScriptVariants,
        'Note script sanitization'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
      throw error;
    }
  }
}

describe('TC-EC05: Special Character Handling Edge Cases', () => {
  const testCase = new SpecialCharacterHandlingTest();

  beforeAll(async () => {
    testCase.validateEnvironment();
    await testCase.setup();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC05 Special Character Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(
        1
      )}%)`
    );

    if (summary.total > 0 && summary.passRate < 75) {
      console.warn(
        `⚠️ TC-EC05 below P2 threshold: ${summary.passRate.toFixed(1)}% (required: 75%)`
      );
    }
  }, 60000);

  it('should preserve quotes, HTML entities, and Unicode for companies', async () => {
    await testCase.verifyCompanySpecialCharacterLifecycle();
  }, 120000);

  it('should preserve special characters for people records across lifecycle operations', async () => {
    await testCase.verifyPersonSpecialCharacterLifecycle();
  }, 120000);

  it('should preserve special characters in notes through create, update, and retrieval', async () => {
    await testCase.verifyNoteSpecialCharacterLifecycle();
  }, 120000);
});
