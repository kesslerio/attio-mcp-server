import { describe, it, expect } from 'vitest';
import {
  advancedOperationsToolDefinitions,
  coreOperationsToolDefinitions,
  coreUniversalTools,
  advancedUniversalTools,
  universalToolConfigs,
  universalToolDefinitions,
} from '../../../../src/handlers/tool-configs/universal/index.js';
import { getToolAliasRegistry } from '../../../../src/config/tool-aliases.js';

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

  describe('Complete Tool Coverage (All 18+ Tools)', () => {
    it('should validate ALL tools in universalToolConfigs use snake_case', () => {
      const allToolNames = Object.keys(universalToolConfigs);
      // Special cases that use kebab-case by design (health-check, OpenAI tools)
      const kebabCaseExceptions = [
        'aaa-health-check',
        'openai-search',
        'openai-fetch',
      ];

      for (const toolName of allToolNames) {
        if (kebabCaseExceptions.includes(toolName)) continue;

        expect(toolName).not.toMatch(
          /-/,
          `Tool "${toolName}" in universalToolConfigs uses kebab-case; should use snake_case`
        );
      }
    });

    it('should validate ALL tools in universalToolDefinitions match their keys', () => {
      // OpenAI tools use shortened names internally (pre-existing design)
      const openaiToolExceptions = ['openai-search', 'openai-fetch'];

      for (const [key, definition] of Object.entries(
        universalToolDefinitions
      )) {
        if (openaiToolExceptions.includes(key)) continue;

        expect(definition.name).toBe(
          key,
          `Tool definition key "${key}" has mismatched name property: "${definition.name}"`
        );
      }
    });

    it('should validate note tools (create_note, list_notes) use snake_case', () => {
      // Explicitly test tools that were missing from array-based validation
      const noteTools = ['create_note', 'list_notes'];

      for (const toolName of noteTools) {
        expect(universalToolConfigs[toolName]).toBeDefined();
        expect(toolName).not.toMatch(/-/);
      }
    });

    it('should validate diagnostic tools (smithery_debug_config) use snake_case', () => {
      // Explicitly test diagnostic tool that was missing from array-based validation
      expect(universalToolConfigs.smithery_debug_config).toBeDefined();
      expect('smithery_debug_config').not.toMatch(/-/);
    });
  });

  describe('MCP Naming Standards - Verb-First Pattern', () => {
    it('should enforce verb-first naming pattern for all tools', () => {
      // MCP standard verbs used in this codebase
      const verbFirstVerbs = [
        'search',
        'get',
        'create',
        'update',
        'delete',
        'batch',
        'discover',
        'list',
        'aaa', // Special prefix for health-check
        'openai', // Special prefix for OpenAI tools
        'smithery', // Special prefix for debug tool
      ];

      // Pattern allows both underscore and hyphen separators
      const verbPattern = new RegExp(`^(${verbFirstVerbs.join('|')})(_|-)`);
      const allTools = [
        ...coreUniversalTools,
        ...advancedUniversalTools,
        'create_note',
        'list_notes',
        'smithery_debug_config',
        'aaa-health-check',
        'openai-search',
      ];

      for (const toolName of allTools) {
        expect(toolName).toMatch(
          verbPattern,
          `Tool "${toolName}" does not follow verb-first naming pattern (should start with: ${verbFirstVerbs.join(', ')})`
        );
      }
    });

    it('should reject noun-verb patterns like "records_search"', () => {
      // Verify that old noun-verb patterns are NOT present
      const nounVerbPatterns = [
        'records_search',
        'records_get',
        'records_create',
        'records_update',
        'records_delete',
        'records_batch',
        'records_discover',
        'attributes_get',
        'note_create',
        'note_list',
      ];

      const allToolNames = Object.keys(universalToolConfigs);

      for (const badPattern of nounVerbPatterns) {
        expect(allToolNames).not.toContain(
          badPattern,
          `Found deprecated noun-verb pattern "${badPattern}" in tool configs`
        );
      }
    });
  });

  describe('Tool Alias Validation', () => {
    it('should validate all alias entries point to snake_case targets', () => {
      const registry = getToolAliasRegistry();
      const aliasEntries = Object.entries(registry);

      // 29 aliases: 12 tools with dual aliases (noun-verb + kebab) = 24
      // + 6 tools with kebab-only aliases = 6
      // - 1 tool (get_attribute_options) has noun-verb only = -1
      // Total: 29 aliases
      expect(aliasEntries.length).toBe(29);

      for (const [alias, definition] of aliasEntries) {
        // Target should use snake_case (no hyphens) except for special cases
        const specialCases = [
          'aaa-health-check',
          'openai-search',
          'openai-fetch',
        ];

        if (!specialCases.includes(definition.target)) {
          expect(definition.target).not.toMatch(
            /-/,
            `Alias "${alias}" points to kebab-case target "${definition.target}"; should use snake_case`
          );
        }
      }
    });

    it('should validate all kebab-case aliases point to correct targets', () => {
      const registry = getToolAliasRegistry();
      const kebabToSnakeCaseMappings = {
        'create-record': 'create_record',
        'update-record': 'update_record',
        'delete-record': 'delete_record',
        'create-note': 'create_note',
        'list-notes': 'list_notes',
        'smithery-debug-config': 'smithery_debug_config',
        'search-records': 'search_records',
        'get-record-details': 'get_record_details',
      };

      for (const [kebab, expectedSnake] of Object.entries(
        kebabToSnakeCaseMappings
      )) {
        const aliasDefinition = registry[kebab];
        expect(aliasDefinition).toBeDefined();
        expect(aliasDefinition.target).toBe(expectedSnake);
      }
    });

    it('should validate all noun-verb aliases point to verb-first targets', () => {
      const registry = getToolAliasRegistry();
      const nounVerbToVerbFirstMappings = {
        records_search: 'search_records',
        records_get_details: 'get_record_details',
        records_get_attributes: 'get_record_attributes',
        records_discover_attributes: 'discover_record_attributes',
        records_search_advanced: 'search_records_advanced',
        records_search_by_relationship: 'search_records_by_relationship',
        records_search_by_content: 'search_records_by_content',
        records_search_by_timeframe: 'search_records_by_timeframe',
        records_batch: 'batch_records',
      };

      for (const [nounVerb, expectedVerbFirst] of Object.entries(
        nounVerbToVerbFirstMappings
      )) {
        const aliasDefinition = registry[nounVerb];
        expect(aliasDefinition).toBeDefined();
        expect(aliasDefinition.target).toBe(expectedVerbFirst);
      }
    });

    it('should validate all aliases have deprecation metadata', () => {
      const registry = getToolAliasRegistry();
      const aliasEntries = Object.entries(registry);

      for (const [alias, definition] of aliasEntries) {
        expect(definition.since).toBeDefined();
        expect(definition.removal).toBe('v2.0.0');
        expect(definition.reason).toContain('#1039');
      }
    });
  });
});
