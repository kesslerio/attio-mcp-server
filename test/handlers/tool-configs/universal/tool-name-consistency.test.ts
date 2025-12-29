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
import { ToolAssertions } from '../../../utils/tool-assertions.js';

describe('Tool Name Consistency Validation', () => {
  describe('Advanced Operations Tool Definitions', () => {
    it('should have name property matching object key', () => {
      ToolAssertions.expectDefinitionKeyMatch(
        advancedOperationsToolDefinitions
      );
    });
  });

  describe('Core Operations Tool Definitions', () => {
    it('should have name property matching object key', () => {
      ToolAssertions.expectDefinitionKeyMatch(coreOperationsToolDefinitions);
    });
  });

  describe('Tool Arrays Consistency', () => {
    it('coreUniversalTools should use snake_case format', () => {
      for (const toolName of coreUniversalTools) {
        ToolAssertions.expectSnakeCase(toolName);
      }
    });

    it('advancedUniversalTools should use snake_case format', () => {
      for (const toolName of advancedUniversalTools) {
        ToolAssertions.expectSnakeCase(toolName);
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
        ToolAssertions.expectSnakeCase(toolName);
      }
    });

    it('should validate ALL tools in universalToolDefinitions match their keys', () => {
      // OpenAI tools use shortened names internally (pre-existing design)
      const openaiToolExceptions = ['openai-search', 'openai-fetch'];
      const filteredDefinitions = Object.fromEntries(
        Object.entries(universalToolDefinitions).filter(
          ([key]) => !openaiToolExceptions.includes(key)
        )
      );

      ToolAssertions.expectDefinitionKeyMatch(filteredDefinitions);
    });

    it('should validate note tools (create_note, list_notes) use snake_case', () => {
      // Explicitly test tools that were missing from array-based validation
      const noteTools = ['create_note', 'list_notes'];

      for (const toolName of noteTools) {
        expect(universalToolConfigs[toolName]).toBeDefined();
        ToolAssertions.expectSnakeCase(toolName);
      }
    });

    it('should validate diagnostic tools (smithery_debug_config) use snake_case', () => {
      // Explicitly test diagnostic tool that was missing from array-based validation
      expect(universalToolConfigs.smithery_debug_config).toBeDefined();
      ToolAssertions.expectSnakeCase('smithery_debug_config');
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
        ToolAssertions.expectVerbFirst(toolName, verbFirstVerbs);
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
      ToolAssertions.expectNoForbiddenPatterns(allToolNames, nounVerbPatterns);
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
          ToolAssertions.expectSnakeCase(definition.target);
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

      ToolAssertions.expectKebabToSnakeMappings(
        registry,
        kebabToSnakeCaseMappings
      );
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

      ToolAssertions.expectNounVerbToVerbFirstMappings(
        registry,
        nounVerbToVerbFirstMappings
      );
    });

    it('should validate all aliases have deprecation metadata', () => {
      const registry = getToolAliasRegistry();
      ToolAssertions.expectDeprecationMetadata(registry, 'v2.0.0', '#1039');
    });

    it('should freeze alias registry to prevent adding new aliases', () => {
      const registry = getToolAliasRegistry();

      // Verify registry is frozen at the top level
      expect(Object.isFrozen(registry)).toBe(true);

      // Verify new aliases cannot be added
      expect(() => {
        // @ts-expect-error - Testing immutability at runtime
        registry['new-alias'] = {
          target: 'search_records',
          reason: 'test',
          since: '2025-01-01',
          removal: 'v3.0.0',
        };
      }).toThrow();

      // Verify deleting aliases is not allowed
      expect(() => {
        // @ts-expect-error - Testing immutability at runtime
        delete registry['records_search'];
      }).toThrow();
    });
  });
});
