/**
 * Reusable assertion helpers for tool validation tests.
 *
 * This module provides consistent, readable assertion helpers for validating
 * tool naming conventions, alias mappings, and MCP compliance across the codebase.
 *
 * @example
 * ```typescript
 * import { ToolAssertions } from '../utils/tool-assertions.js';
 *
 * describe('My Tool Tests', () => {
 *   it('should use snake_case', () => {
 *     ToolAssertions.expectSnakeCase('search_records'); // passes
 *     ToolAssertions.expectSnakeCase('search-records'); // fails
 *   });
 * });
 * ```
 *
 * @see Issue #1041 for refactoring context
 */

import { expect } from 'vitest';
import type { ToolAliasDefinition } from '../../src/config/tool-aliases.js';

/**
 * Centralized assertion helpers for tool validation.
 */
export const ToolAssertions = {
  /**
   * Assert that a tool name uses snake_case format (no hyphens).
   *
   * @param toolName - The tool name to validate
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * ToolAssertions.expectSnakeCase('search_records'); // ✓
   * ToolAssertions.expectSnakeCase('search-records'); // ✗
   * ```
   */
  expectSnakeCase(toolName: string, customMessage?: string): void {
    expect(toolName).not.toMatch(
      /-/,
      customMessage ||
        `Tool name "${toolName}" uses kebab-case; should use snake_case`
    );
  },

  /**
   * Assert that a tool name follows verb-first naming pattern.
   *
   * @param toolName - The tool name to validate
   * @param allowedVerbs - List of valid verb prefixes
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * const verbs = ['search', 'get', 'create'];
   * ToolAssertions.expectVerbFirst('search_records', verbs); // ✓
   * ToolAssertions.expectVerbFirst('records_search', verbs); // ✗
   * ```
   */
  expectVerbFirst(
    toolName: string,
    allowedVerbs: string[],
    customMessage?: string
  ): void {
    const verbPattern = new RegExp(`^(${allowedVerbs.join('|')})(_|-)`);
    expect(toolName).toMatch(
      verbPattern,
      customMessage ||
        `Tool "${toolName}" does not follow verb-first naming pattern (expected: ${allowedVerbs.join(', ')})`
    );
  },

  /**
   * Assert that an alias maps to the expected target tool.
   *
   * @param registry - The alias registry to check
   * @param alias - The alias name
   * @param expectedTarget - The expected target tool name
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * const registry = getToolAliasRegistry();
   * ToolAssertions.expectAliasMapping(registry, 'search-records', 'search_records');
   * ```
   */
  expectAliasMapping(
    registry: Record<string, ToolAliasDefinition>,
    alias: string,
    expectedTarget: string,
    customMessage?: string
  ): void {
    const definition = registry[alias];
    expect(definition).toBeDefined();
    expect(definition.target).toBe(
      expectedTarget,
      customMessage ||
        `Alias "${alias}" should map to "${expectedTarget}" but maps to "${definition?.target}"`
    );
  },

  /**
   * Assert that all aliases in a registry have required deprecation metadata.
   *
   * @param registry - The alias registry to validate
   * @param expectedRemoval - Expected removal version (e.g., 'v2.0.0')
   * @param expectedIssue - Expected issue reference (e.g., '#1039')
   *
   * @example
   * ```typescript
   * const registry = getToolAliasRegistry();
   * ToolAssertions.expectDeprecationMetadata(registry, 'v2.0.0', '#1039');
   * ```
   */
  expectDeprecationMetadata(
    registry: Record<string, ToolAliasDefinition>,
    expectedRemoval: string,
    expectedIssue: string
  ): void {
    const entries = Object.entries(registry);

    for (const [alias, definition] of entries) {
      expect(
        definition.since,
        `Alias "${alias}" missing 'since' metadata`
      ).toBeDefined();
      expect(
        definition.removal,
        `Alias "${alias}" should have removal="${expectedRemoval}"`
      ).toBe(expectedRemoval);
      expect(
        definition.reason,
        `Alias "${alias}" reason should reference ${expectedIssue}`
      ).toContain(expectedIssue);
    }
  },

  /**
   * Assert that tool definition name matches its object key.
   *
   * @param definitions - Record of tool definitions
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * const defs = { search_records: { name: 'search_records', ... } };
   * ToolAssertions.expectDefinitionKeyMatch(defs);
   * ```
   */
  expectDefinitionKeyMatch(
    definitions: Record<string, { name: string }>,
    customMessage?: string
  ): void {
    for (const [key, definition] of Object.entries(definitions)) {
      expect(definition.name).toBe(
        key,
        customMessage ||
          `Tool definition key "${key}" has mismatched name: "${definition.name}"`
      );
    }
  },

  /**
   * Assert that tool names do NOT contain deprecated patterns.
   *
   * @param toolNames - Array of tool names to check
   * @param forbiddenPatterns - Array of forbidden patterns
   * @param customMessage - Optional custom error message
   *
   * @example
   * ```typescript
   * const tools = ['search_records', 'get_record'];
   * const forbidden = ['records_search', 'record_get'];
   * ToolAssertions.expectNoForbiddenPatterns(tools, forbidden);
   * ```
   */
  expectNoForbiddenPatterns(
    toolNames: string[],
    forbiddenPatterns: string[],
    customMessage?: string
  ): void {
    for (const pattern of forbiddenPatterns) {
      expect(toolNames).not.toContain(
        pattern,
        customMessage ||
          `Found deprecated pattern "${pattern}" in tool list (should not exist)`
      );
    }
  },

  /**
   * Validate a batch of kebab-case to snake_case alias mappings.
   *
   * @param registry - The alias registry to check
   * @param mappings - Record of expected kebab→snake mappings
   *
   * @example
   * ```typescript
   * ToolAssertions.expectKebabToSnakeMappings(registry, {
   *   'create-record': 'create_record',
   *   'update-record': 'update_record'
   * });
   * ```
   */
  expectKebabToSnakeMappings(
    registry: Record<string, ToolAliasDefinition>,
    mappings: Record<string, string>
  ): void {
    for (const [kebab, expectedSnake] of Object.entries(mappings)) {
      this.expectAliasMapping(registry, kebab, expectedSnake);
    }
  },

  /**
   * Validate a batch of noun-verb to verb-first alias mappings.
   *
   * @param registry - The alias registry to check
   * @param mappings - Record of expected noun-verb→verb-first mappings
   *
   * @example
   * ```typescript
   * ToolAssertions.expectNounVerbToVerbFirstMappings(registry, {
   *   'records_search': 'search_records',
   *   'records_get_details': 'get_record_details'
   * });
   * ```
   */
  expectNounVerbToVerbFirstMappings(
    registry: Record<string, ToolAliasDefinition>,
    mappings: Record<string, string>
  ): void {
    for (const [nounVerb, expectedVerbFirst] of Object.entries(mappings)) {
      this.expectAliasMapping(registry, nounVerb, expectedVerbFirst);
    }
  },
};
