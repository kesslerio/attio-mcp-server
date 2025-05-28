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
    
    // Process formatters config
    Object.values(formatterConfigs).forEach(config => {
      const name = config.name;
      if (toolNames.has(name)) {
        duplicates.add(name);
      } else {
        toolNames.add(name);
      }
    });
    
    // Process CRUD config
    Object.values(crudToolConfigs).forEach(config => {
      const name = config.name;
      if (toolNames.has(name)) {
        duplicates.add(name);
      } else {
        toolNames.add(name);
      }
    });
    
    // There should be no duplicates
    expect(duplicates.size).toBe(0);
    
    // Check specific tool name that was causing the issue
    const basicInfoToolName = 'get-company-basic-info';
    
    // This tool should only be in the formatter configs, not in CRUD configs
    expect(Object.values(formatterConfigs).some(config => config.name === basicInfoToolName)).toBe(true);
    expect(Object.values(crudToolConfigs).some(config => config.name === basicInfoToolName)).toBe(false);
  });
});