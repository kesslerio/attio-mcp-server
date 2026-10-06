import { describe, expect, it } from 'vitest';
import { getToolAliasRegistry } from '../../../../src/config/tool-aliases.js';
import {
  REMOVED_PRE_V2_TOOL_ALIASES,
  canonicalToolNames,
} from '../../../../src/constants/tool-names.js';
import {
  advancedOperationsToolDefinitions,
  advancedUniversalTools,
  coreOperationsToolDefinitions,
  coreUniversalTools,
  universalToolConfigs,
  universalToolDefinitions,
} from '../../../../src/handlers/tool-configs/universal/index.js';
import { ToolAssertions } from '../../../utils/tool-assertions.js';

describe('Tool Name Consistency Validation', () => {
  describe('definition keys match advertised names', () => {
    it('matches advanced operation keys to their name property', () => {
      ToolAssertions.expectDefinitionKeyMatch(
        advancedOperationsToolDefinitions
      );
    });

    it('matches core operation keys to their name property', () => {
      ToolAssertions.expectDefinitionKeyMatch(coreOperationsToolDefinitions);
    });

    it('matches universal definition keys except OpenAI config keys', () => {
      const openaiToolExceptions = ['openai-search', 'openai-fetch'];
      const filteredDefinitions = Object.fromEntries(
        Object.entries(universalToolDefinitions).filter(
          ([key]) => !openaiToolExceptions.includes(key)
        )
      );

      ToolAssertions.expectDefinitionKeyMatch(filteredDefinitions);
    });
  });

  describe('resource-first catalog', () => {
    it('uses canonical resource-first names in the universal arrays', () => {
      const canonical = new Set(canonicalToolNames());
      for (const toolName of [
        ...coreUniversalTools,
        ...advancedUniversalTools,
      ]) {
        expect(canonical.has(toolName)).toBe(true);
        ToolAssertions.expectSnakeCase(toolName);
      }
    });

    it('keeps snake_case config keys aside from the kebab exceptions', () => {
      const kebabCaseExceptions = [
        'aaa-health-check',
        'openai-search',
        'openai-fetch',
      ];

      for (const toolName of Object.keys(universalToolConfigs)) {
        if (kebabCaseExceptions.includes(toolName)) continue;
        ToolAssertions.expectSnakeCase(toolName);
      }
    });

    it('exposes notes and diagnostics under their canonical names', () => {
      expect(universalToolConfigs.notes_create).toBeDefined();
      expect(universalToolConfigs.notes_list).toBeDefined();
      expect(universalToolConfigs.diagnostics_get).toBeDefined();
      expect(universalToolConfigs.notes_create.name).toBe('notes_create');
      expect(universalToolConfigs.notes_list.name).toBe('notes_list');
      expect(universalToolConfigs.diagnostics_get.name).toBe('diagnostics_get');
    });
  });

  describe('migration alias registry', () => {
    it('points 42 prior default names at canonical targets', () => {
      const registry = getToolAliasRegistry();
      const entries = Object.entries(registry);
      expect(entries).toHaveLength(42);

      const canonical = new Set(canonicalToolNames());
      for (const [alias, definition] of entries) {
        expect(canonical.has(definition.target)).toBe(true);
        expect(alias).not.toBe(definition.target);
        expect(registry[definition.target]).toBeUndefined();
        expect(definition.since).toBe('2026-10-05');
        expect(definition.removal).toBe('v3.0.0');
        expect(definition.reason).toContain('call-only migration alias');
        expect(definition.reason ?? '').not.toContain('#1039');
        expect(definition.reason ?? '').not.toContain('v2.0.0');
      }
    });

    it('does not register removed pre-v2 names', () => {
      const registry = getToolAliasRegistry();
      for (const removed of REMOVED_PRE_V2_TOOL_ALIASES) {
        expect(registry[removed]).toBeUndefined();
      }
      expect(registry.records_search_batch).toBeUndefined();
      expect(registry['search-records']).toBeUndefined();
      expect(registry.search_records?.target).toBe('records_search');
      expect(registry['get-lists']?.target).toBe('lists_list');
    });

    it('freezes the alias registry', () => {
      const registry = getToolAliasRegistry();
      expect(Object.isFrozen(registry)).toBe(true);

      expect(() => {
        // @ts-expect-error runtime immutability check
        registry['new-alias'] = {
          target: 'records_search',
          reason: 'test',
          since: '2026-10-05',
          removal: 'v3.0.0',
        };
      }).toThrow();

      expect(() => {
        // @ts-expect-error runtime immutability check
        delete registry.search_records;
      }).toThrow();
    });
  });
});
