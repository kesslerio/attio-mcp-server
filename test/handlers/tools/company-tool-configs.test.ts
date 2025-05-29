/**
 * Tests for company tool configurations
 *
 * This test verifies that there are no duplicate tool names in the company tool configs
 */
import { describe, it, expect } from 'vitest';
import { formatterConfigs } from '../../../src/handlers/tool-configs/companies/formatters.js';
import { crudToolConfigs } from '../../../src/handlers/tool-configs/companies/crud.js';

describe('Company Tool Configurations', () => {
  it('should have unique tool names across all config modules', () => {
    // Get all tool names
    const toolNames = new Set<string>();
    const duplicates = new Set<string>();
    const configSources: Record<string, string[]> = {};

    // Process formatters config
    Object.values(formatterConfigs).forEach((config) => {
      if (!config || typeof config !== 'object' || !config.name) {
        return; // Skip invalid configs
      }

      const name = config.name;
      if (toolNames.has(name)) {
        duplicates.add(name);
      } else {
        toolNames.add(name);
      }

      // Track where each tool name is defined
      if (!configSources[name]) {
        configSources[name] = [];
      }
      configSources[name].push('formatterConfigs');
    });

    // Process CRUD config
    Object.values(crudToolConfigs).forEach((config) => {
      if (!config || typeof config !== 'object' || !config.name) {
        return; // Skip invalid configs
      }

      const name = config.name;
      if (toolNames.has(name)) {
        duplicates.add(name);
      } else {
        toolNames.add(name);
      }

      // Track where each tool name is defined
      if (!configSources[name]) {
        configSources[name] = [];
      }
      configSources[name].push('crudToolConfigs');
    });

    // There should be no duplicates
    if (duplicates.size > 0) {
      console.error(
        'Duplicate tool names found:',
        Array.from(duplicates).map(
          (name) => `${name} in: ${configSources[name]?.join(', ')}`
        )
      );
    }
    expect(duplicates.size).toBe(0);

    // Check specific tool name that was causing the issue
    const basicInfoToolName = 'get-company-basic-info';

    // This tool should only be in the formatter configs, not in CRUD configs
    expect(
      Object.values(formatterConfigs).some(
        (config) =>
          config &&
          typeof config === 'object' &&
          config.name === basicInfoToolName
      )
    ).toBe(true);

    expect(
      Object.values(crudToolConfigs).some(
        (config) =>
          config &&
          typeof config === 'object' &&
          config.name === basicInfoToolName
      )
    ).toBe(false);
  });
});
