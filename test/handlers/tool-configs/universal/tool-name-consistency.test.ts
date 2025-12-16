import { describe, it, expect } from 'vitest';
import {
  advancedOperationsToolDefinitions,
  coreOperationsToolDefinitions,
  coreUniversalTools,
  advancedUniversalTools,
} from '../../../../src/handlers/tool-configs/universal/index.js';

describe('Tool Name Consistency Validation', () => {
  describe('Advanced Operations Tool Definitions', () => {
    it('should have name property matching object key', () => {
      for (const [key, definition] of Object.entries(
        advancedOperationsToolDefinitions
      )) {
        expect(definition.name).toBe(
          key,
          `Tool definition for "${key}" has mismatched name: "${definition.name}"`
        );
      }
    });
  });

  describe('Core Operations Tool Definitions', () => {
    it('should have name property matching object key', () => {
      for (const [key, definition] of Object.entries(
        coreOperationsToolDefinitions
      )) {
        expect(definition.name).toBe(
          key,
          `Tool definition for "${key}" has mismatched name: "${definition.name}"`
        );
      }
    });
  });

  describe('Tool Arrays Consistency', () => {
    it('coreUniversalTools should use snake_case format', () => {
      for (const toolName of coreUniversalTools) {
        expect(toolName).not.toMatch(
          /-/,
          `Tool name "${toolName}" uses kebab-case; should use snake_case`
        );
      }
    });

    it('advancedUniversalTools should use snake_case format', () => {
      for (const toolName of advancedUniversalTools) {
        expect(toolName).not.toMatch(
          /-/,
          `Tool name "${toolName}" uses kebab-case; should use snake_case`
        );
      }
    });
  });
});
