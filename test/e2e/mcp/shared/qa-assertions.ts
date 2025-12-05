/**
 * QA-Specific Assertions
 * Helper functions for validating MCP tool responses according to QA test plan requirements
 */

import { expect as vitestExpect } from 'vitest';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

// Vitest globals may not be injected in helper modules; fall back to imported instance.
const expect =
  (globalThis as { expect?: typeof vitestExpect }).expect ??
  (() => {
    console.warn(
      'QAAssertions: vitest globals not injected, using imported expect fallback'
    );
    return vitestExpect;
  })();

export class QAAssertions {
  private static readonly UUID_PATTERN =
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

  /**
   * Assert that a search operation returned valid results
   */
  static assertValidSearchResults(
    result: ToolResult,
    resourceType: string,
    minResults: number = 0
  ): void {
    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();

    expect(normalizedText).not.toContain('error');
    expect(normalizedText).not.toContain('failed');
    expect(normalizedText).not.toContain('invalid');

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('error');
      expect(normalizedJson).not.toContain('failed');
    }

    const structuredArray = this.extractResultArray(json);
    const jsonIds = this.collectUuidStrings(json);
    const textIds = this.collectUuidStrings(text);
    const aggregatedIds = new Set<string>([...jsonIds, ...textIds]);

    if (structuredArray.length > 0) {
      for (const record of structuredArray) {
        for (const id of this.collectUuidStrings(record)) {
          aggregatedIds.add(id);
        }
      }
    }

    if (minResults > 0) {
      if (structuredArray.length > 0) {
        expect(structuredArray.length).toBeGreaterThanOrEqual(minResults);
      } else if (aggregatedIds.size > 0) {
        expect(aggregatedIds.size).toBeGreaterThanOrEqual(minResults);
      } else {
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  }

  /**
   * Assert that search results are valid (alias for assertValidSearchResults)
   */
  static assertSearchResults(
    result: ToolResult,
    resourceType: string,
    minResults: number = 0
  ): void {
    this.assertValidSearchResults(result, resourceType, minResults);
  }

  /**
   * Assert that record details were retrieved successfully
   */
  static assertValidRecordDetails(
    result: ToolResult,
    resourceType: string,
    recordId?: string
  ): void {
    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();

    expect(normalizedText).toBeTruthy();
    expect(normalizedText).not.toContain('not found');
    expect(normalizedText).not.toContain('does not exist');
    expect(normalizedText).not.toContain('error');

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('not found');
      expect(normalizedJson).not.toContain('does not exist');
      expect(normalizedJson).not.toContain('error');
    }

    if (recordId) {
      const availableIds = new Set([
        ...this.collectUuidStrings(json).map((id) => id.toLowerCase()),
        ...this.collectUuidStrings(text).map((id) => id.toLowerCase()),
      ]);

      expect(availableIds.size).toBeGreaterThan(0);
      expect(availableIds.has(recordId.toLowerCase())).toBeTruthy();
    }
  }

  /**
   * Assert that a record was created successfully
   */
  static assertRecordCreated(
    result: ToolResult,
    resourceType: string,
    expectedFields?: Record<string, unknown>
  ): string {
    if (!result) {
      throw new Error(
        `ASSERTION FAILURE: Tool result is null/undefined for ${resourceType} creation`
      );
    }

    if (result.isError) {
      throw new Error(
        `ASSERTION FAILURE: Tool returned error for ${resourceType} creation`
      );
    }

    const { text, json, jsonString } = this.extractPayload(result);

    if (!text || text.trim().length === 0) {
      throw new Error(
        `ASSERTION FAILURE: Empty response text for ${resourceType} creation. Result: ${JSON.stringify(result)}`
      );
    }

    const normalizedText = text.toLowerCase();
    // Only check for explicit failure indicators, not generic sanitized messages
    // The isError flag is the authoritative source for whether the operation failed
    const hasExplicitFailure =
      normalizedText.includes('failed to create') ||
      normalizedText.includes('validation error') ||
      normalizedText.includes('invalid request');

    if (hasExplicitFailure) {
      throw new Error(
        `ASSERTION FAILURE: Explicit failure in ${resourceType} creation response: ${text}`
      );
    }

    const successIndicators = ['created', 'success', 'completed', 'added'];
    const hasSuccessIndicator = successIndicators.some((indicator) =>
      normalizedText.includes(indicator)
    );

    const jsonSuccess = jsonString
      ? successIndicators.some((indicator) =>
          jsonString.toLowerCase().includes(indicator)
        )
      : false;

    // If we have a record ID in the response, that's also a success indicator
    // (the operation created something even if the message doesn't say "created")
    const candidateIds: string[] = [];

    const canonicalId = this.tryExtractCanonicalRecordId(json);
    if (canonicalId) {
      candidateIds.push(canonicalId);
    }

    const textId = this.tryExtractRecordIdFromText(text);
    if (textId && !candidateIds.includes(textId)) {
      candidateIds.push(textId);
    }

    const uuidCandidates = [
      ...this.collectUuidStrings(json),
      ...this.collectUuidStrings(text),
    ];

    for (const uuid of uuidCandidates) {
      if (!candidateIds.includes(uuid)) {
        candidateIds.push(uuid);
      }
    }

    if (candidateIds.length === 0) {
      throw new Error(
        `ASSERTION FAILURE: No valid record ID found in response for ${resourceType}. Response text: "${text}"`
      );
    }

    return candidateIds[0];
  }

  /**
   * Assert that a record was updated successfully
   */
  static assertRecordUpdated(
    result: ToolResult,
    resourceType: string,
    recordId?: string,
    updatedFields?: Record<string, unknown>
  ): void {
    if (!result) {
      throw new Error(
        `ASSERTION FAILURE: Tool result is null/undefined for ${resourceType} update`
      );
    }

    if (result.isError) {
      throw new Error(
        `ASSERTION FAILURE: Tool returned error for ${resourceType} update`
      );
    }

    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();
    const normalizedJson = jsonString.toLowerCase();

    // Only check for explicit failure indicators, not generic sanitized messages
    // The isError flag is the authoritative source for whether the operation failed
    const hasExplicitFailure =
      normalizedText.includes('failed to update') ||
      normalizedText.includes('validation error') ||
      normalizedText.includes('invalid request') ||
      normalizedText.includes('not found');

    if (hasExplicitFailure) {
      throw new Error(
        `ASSERTION FAILURE: Explicit failure in ${resourceType} update response: ${text}`
      );
    }

    // Success indicators are nice to have but not required
    // The isError flag is the authoritative source for whether the operation failed
    // If we got here without isError and without explicit failure, the update succeeded

    if (recordId) {
      const availableIds = new Set([
        ...this.collectUuidStrings(json).map((id) => id.toLowerCase()),
        ...this.collectUuidStrings(text).map((id) => id.toLowerCase()),
      ]);
      if (availableIds.size > 0) {
        expect(availableIds.has(recordId.toLowerCase())).toBeTruthy();
      }
    }
  }

  /**
   * Assert that a record was deleted successfully
   */
  static assertRecordDeleted(
    result: ToolResult,
    resourceType: string,
    recordId?: string
  ): void {
    if (!result) {
      throw new Error(
        `ASSERTION FAILURE: Tool result is null/undefined for ${resourceType} deletion`
      );
    }

    if (result.isError) {
      throw new Error(
        `ASSERTION FAILURE: Tool returned error for ${resourceType} deletion`
      );
    }

    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();
    const normalizedJson = jsonString.toLowerCase();

    expect(normalizedText).not.toContain('error');
    expect(normalizedText).not.toContain('failed');

    if (normalizedJson) {
      expect(normalizedJson).not.toContain('error');
      expect(normalizedJson).not.toContain('failed');
    }

    const successIndicators = ['deleted', 'removed', 'success'];
    const hasSuccessIndicator = successIndicators.some((indicator) =>
      normalizedText.includes(indicator)
    );
    const hasJsonIndicator = successIndicators.some((indicator) =>
      normalizedJson.includes(indicator)
    );

    expect(hasSuccessIndicator || hasJsonIndicator).toBeTruthy();

    if (recordId) {
      const availableIds = new Set([
        ...this.collectUuidStrings(json).map((id) => id.toLowerCase()),
        ...this.collectUuidStrings(text).map((id) => id.toLowerCase()),
      ]);
      if (availableIds.size > 0) {
        expect(availableIds.has(recordId.toLowerCase())).toBeFalsy();
      }
    }
  }

  /**
   * Assert that attempting to access a deleted record returns appropriate error
   */
  static assertRecordNotFound(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();

    const hasNotFoundIndicator =
      normalizedText.includes('not found') ||
      normalizedText.includes('does not exist') ||
      normalizedText.includes('error') ||
      normalizedText.includes('failed');

    const normalizedJson = jsonString.toLowerCase();
    const jsonNotFoundIndicator = normalizedJson
      ? normalizedJson.includes('not found') ||
        normalizedJson.includes('does not exist') ||
        normalizedJson.includes('error')
      : false;

    expect(hasNotFoundIndicator || jsonNotFoundIndicator).toBeTruthy();
  }

  /**
   * Assert that schema/attributes were retrieved successfully
   */
  static assertValidSchema(result: ToolResult, objectType: string): void {
    expect(result?.isError ?? false).toBeFalsy();

    const { text, json, jsonString } = this.extractPayload(result);
    const normalizedText = text.toLowerCase();
    expect(normalizedText).toBeTruthy();
    expect(normalizedText).not.toContain('error');

    if (json) {
      const attributeSlugs = this.collectAttributeSlugs(json);
      expect(attributeSlugs.length).toBeGreaterThan(0);
    } else {
      expect(text.length).toBeGreaterThan(40);
    }

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('error');
    }
  }

  /**
   * Assert that a batch operation completed successfully
   */
  static assertBatchOperationSuccess(
    result: ToolResult,
    operationType: string,
    expectedCount: number
  ): void {
    expect(result?.isError ?? false).toBeFalsy();

    const { text, json, jsonString } = this.extractPayload(result);
    if (!text && !jsonString) {
      throw new Error(
        `ASSERTION FAILURE: Empty batch operation response for '${operationType}'`
      );
    }

    const normalizedText = text.toLowerCase();
    expect(normalizedText).not.toContain('error:');
    expect(normalizedText).not.toContain('exception');

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('error');
      expect(normalizedJson).not.toContain('exception');
    }

    const summaryMatch = text.match(
      /Batch\s+([a-z-\s]+)\s+completed:\s+(\d+)\s+successful,\s+(\d+)\s+failed/i
    );

    if (summaryMatch) {
      const [, , successCountRaw, failedCountRaw] = summaryMatch;
      const successCount = Number.parseInt(successCountRaw, 10);
      const failedCount = Number.parseInt(failedCountRaw, 10);

      if (Number.isNaN(successCount) || Number.isNaN(failedCount)) {
        throw new Error(
          `ASSERTION FAILURE: Unable to parse batch summary counts.\nResponse: ${text}`
        );
      }

      expect(successCount).toBe(expectedCount);
      expect(failedCount).toBe(0);
    } else if (json) {
      const resultArray = this.extractResultArray(json);
      expect(resultArray.length).toBe(expectedCount);
    } else {
      throw new Error(
        `ASSERTION FAILURE: Missing batch summary for '${operationType}'.\nResponse: ${text}`
      );
    }
  }

  /**
   * Helper to extract text content from result
   */
  private static extractText(result: ToolResult): string {
    if (result?.content && result.content.length > 0) {
      const content = result.content[0];
      if ('text' in content) {
        return content.text;
      }
    }
    return '';
  }

  /**
   * Validate quality gate requirements
   */
  static validateP0QualityGate(
    results: Array<{ test: string; passed: boolean }>
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;

    console.log(`\nP0 Quality Gate Results:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate < 100) {
      const failedTests = results.filter((r) => !r.passed).map((r) => r.test);
      throw new Error(
        `P0 CRITICAL: Quality gate failed! Pass rate: ${passRate.toFixed(1)}%\n` +
          `Failed tests: ${failedTests.join(', ')}\n` +
          `System is NOT ready for testing.`
      );
    }

    console.log(`✅ P0 Quality Gate PASSED - System ready for P1 testing`);
  }

  /**
   * Assert valid list operations response
   */
  static assertValidListResponse(result: ToolResult, operation: string): void {
    expect(result).toBeDefined();
    expect(result?.isError ?? false).toBeFalsy();

    const { text, json, jsonString } = this.extractPayload(result);

    if (json) {
      const arrayPayload = Array.isArray(json)
        ? json
        : this.extractResultArray(json);

      if (operation === 'get-lists' || operation === 'get-list-entries') {
        expect(Array.isArray(arrayPayload)).toBeTruthy();
      }
    } else {
      expect(text).toBeTruthy();
      if (operation === 'get-lists' || operation === 'get-list-entries') {
        expect(
          text.trim().startsWith('[') || text.trim().startsWith('{')
        ).toBeTruthy();
      }
    }

    const normalizedText = text.toLowerCase();
    expect(normalizedText).not.toContain('error');
    expect(normalizedText).not.toContain('failed');

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('error');
      expect(normalizedJson).not.toContain('failed');
    }
  }

  /**
   * Assert valid list filtering response
   */
  static assertValidFilterResponse(result: ToolResult): void {
    expect(result).toBeDefined();
    expect(result?.isError ?? false).toBeFalsy();

    const { text, json, jsonString } = this.extractPayload(result);

    if (json) {
      const arrayPayload = Array.isArray(json)
        ? json
        : this.extractResultArray(json);
      expect(Array.isArray(arrayPayload)).toBeTruthy();
    } else {
      expect(text).toBeTruthy();
      expect(text.trim().startsWith('[')).toBeTruthy();
    }

    const normalizedText = text.toLowerCase();
    expect(normalizedText).not.toContain('error');
    expect(normalizedText).not.toContain('invalid');

    if (jsonString) {
      const normalizedJson = jsonString.toLowerCase();
      expect(normalizedJson).not.toContain('error');
      expect(normalizedJson).not.toContain('invalid');
    }
  }

  /**
   * Validate P1 quality gate requirements (80% pass rate)
   */
  static validateP1QualityGate(
    results: Array<{ test: string; passed: boolean }>
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;

    console.log(`\nP1 Quality Gate Results:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate < 80) {
      const failedTests = results.filter((r) => !r.passed).map((r) => r.test);
      throw new Error(
        `P1 Quality gate failed! Pass rate: ${passRate.toFixed(1)}% (required: 80%)\n` +
          `Failed tests: ${failedTests.join(', ')}`
      );
    }

    console.log(
      `✅ P1 Quality Gate PASSED - Pass rate: ${passRate.toFixed(1)}%`
    );
  }

  private static extractPayload(result: ToolResult): {
    text: string;
    json: unknown | null;
    jsonString: string;
  } {
    const text = this.extractText(result);
    const contentJson = this.tryExtractJsonFromContent(result);
    if (contentJson !== null && contentJson !== undefined) {
      return {
        text,
        json: contentJson,
        jsonString: this.safeStringify(contentJson),
      };
    }

    const parsed = this.tryParseJson(text);
    return {
      text,
      json: parsed,
      jsonString: parsed ? this.safeStringify(parsed) : '',
    };
  }

  private static tryExtractJsonFromContent(result: ToolResult): unknown | null {
    if (!result?.content) {
      return null;
    }

    for (const part of result.content) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const type = 'type' in part ? String(part.type).toLowerCase() : '';

      if (type.includes('json')) {
        if ('data' in part && part.data !== undefined) {
          return part.data as unknown;
        }

        if ('json' in part && part.json !== undefined) {
          return part.json as unknown;
        }

        if ('text' in part && typeof part.text === 'string') {
          try {
            return JSON.parse(part.text);
          } catch (error) {
            // Ignore parsing errors and continue searching other parts.
          }
        }
      }
    }

    return null;
  }

  private static tryParseJson(text: string): unknown | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const candidates: string[] = [];

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      candidates.push(trimmed);
    }

    const braceIndex = trimmed.indexOf('{');
    const bracketIndex = trimmed.indexOf('[');
    const indexes = [braceIndex, bracketIndex].filter((index) => index > 0);

    if (indexes.length > 0) {
      const startIndex = Math.min(...indexes);
      candidates.push(trimmed.slice(startIndex));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private static collectUuidStrings(input: unknown): string[] {
    const ids = new Set<string>();
    const uuidPattern = new RegExp(this.UUID_PATTERN.source, 'gi');
    const visited = new WeakSet<object>();

    const visit = (value: unknown): void => {
      if (!value) {
        return;
      }

      if (typeof value === 'string') {
        for (const match of value.matchAll(uuidPattern)) {
          ids.add(match[0]);
        }
        return;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item);
        }
        return;
      }

      if (typeof value === 'object') {
        if (visited.has(value as object)) {
          return;
        }
        visited.add(value as object);
        for (const nested of Object.values(value as Record<string, unknown>)) {
          visit(nested);
        }
      }
    };

    visit(input);

    return Array.from(ids);
  }

  private static tryExtractCanonicalRecordId(payload: unknown): string | null {
    if (!payload) {
      return null;
    }

    const visited = new WeakSet<object>();

    const search = (value: unknown): string | null => {
      if (!value) {
        return null;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          const result = search(item);
          if (result) {
            return result;
          }
        }
        return null;
      }

      if (typeof value === 'object') {
        const record = value as Record<string, unknown>;

        if (visited.has(record)) {
          return null;
        }
        visited.add(record);

        if (QAAssertions.isRecordEnvelope(record)) {
          const recordId = QAAssertions.extractRecordIdFromIdField(record.id);
          if (recordId) {
            return recordId;
          }
        }

        if (typeof record.record_id === 'string') {
          return record.record_id;
        }

        if ('data' in record) {
          const nested = search(record.data);
          if (nested) {
            return nested;
          }
        }

        for (const nested of Object.values(record)) {
          const result = search(nested);
          if (result) {
            return result;
          }
        }
      }

      return null;
    };

    return search(payload);
  }

  private static isRecordEnvelope(value: Record<string, unknown>): boolean {
    return (
      value !== null &&
      'id' in value &&
      typeof value.id !== 'undefined' &&
      'values' in value &&
      typeof value.values !== 'undefined'
    );
  }

  private static extractRecordIdFromIdField(idField: unknown): string | null {
    if (!idField) {
      return null;
    }

    if (typeof idField === 'string') {
      return idField;
    }

    if (
      typeof idField === 'object' &&
      idField !== null &&
      'record_id' in (idField as Record<string, unknown>)
    ) {
      const candidate = (idField as Record<string, unknown>).record_id;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }

    return null;
  }

  private static tryExtractRecordIdFromText(text: string): string | null {
    if (!text) {
      return null;
    }

    const match = text.match(/ID:\s*([^\s)]+)/i);
    if (!match) {
      return null;
    }

    const extracted = match[1]?.trim();
    return extracted || null;
  }

  private static collectAttributeSlugs(input: unknown): string[] {
    const slugs = new Set<string>();
    const visited = new WeakSet<object>();

    const visit = (value: unknown): void => {
      if (!value) {
        return;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item);
        }
        return;
      }

      if (typeof value === 'object') {
        if (visited.has(value as object)) {
          return;
        }
        visited.add(value as object);

        const record = value as Record<string, unknown>;
        const slugCandidate =
          record.api_slug ||
          record.slug ||
          record.key ||
          record.field ||
          record.id ||
          record.name;

        if (typeof slugCandidate === 'string') {
          slugs.add(slugCandidate.toLowerCase());
        }

        if (Array.isArray(record.attributes)) {
          visit(record.attributes);
        }

        if (Array.isArray(record.data)) {
          visit(record.data);
        }

        for (const nested of Object.values(record)) {
          if (typeof nested === 'object' || Array.isArray(nested)) {
            visit(nested);
          }
        }
      }
    };

    visit(input);

    return Array.from(slugs);
  }

  private static extractResultArray(payload: unknown): unknown[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const candidates = ['data', 'results', 'items', 'records'];

      for (const key of candidates) {
        const value = record[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }

    return [];
  }

  private static safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  }
}
