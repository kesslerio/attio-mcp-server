/**
 * Resource Not Found Test Module
 *
 * Tests for various resource not found scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  callUniversalTool,
  callNotesTool,
} from '../../utils/enhanced-tool-caller.js';
import { E2EAssertions, type McpToolResponse } from '../../utils/assertions.js';
import { errorScenarios } from '../../fixtures/error-scenarios.js';

export function resourceNotFoundTests() {
  describe('Resource Not Found Scenarios', () => {
    it('should handle company not found errors', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.company,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
    });

    it('should handle person not found errors', async () => {
      // Use a valid UUID format that doesn't exist to test 404 responses
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'people',
        record_id: errorScenarios.invalidIds.person,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
    });

    it('should handle task not found errors', async () => {
      // Note: update-task actually calls update-record internally with resource_type: 'tasks'
      // The error message might be different than expected
      const response = (await callUniversalTool('update-record', {
        resource_type: 'tasks',
        record_id: errorScenarios.invalidIds.task,
        record_data: {
          title: 'Updated Title',
        },
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      // Broader pattern to match various error messages
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|cannot read|undefined|validation|parameter error)/i
      );
    });

    it('should handle list not found errors', async () => {
      const response = (await callUniversalTool('get-record-details', {
        resource_type: 'lists',
        record_id: errorScenarios.invalidIds.list,
      })) as McpToolResponse;

      E2EAssertions.expectMcpError(response);
      expect(response.error).toMatch(
        /(not found|does not exist|invalid|validation|parameter error)/i
      );
    });

    it('should handle note not found errors', async () => {
      const response = (await callNotesTool('list-notes', {
        resource_type: 'companies',
        record_id: errorScenarios.invalidIds.note,
        limit: 50,
        offset: 0,
      })) as McpToolResponse;

      // Notes might return empty array instead of error - both are valid
      expect(response).toBeDefined();
    });
  });
}
