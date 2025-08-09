/**
 * Unit test for Issue #417 - Tasks attribute discovery fix
 * 
 * This test validates that the fixed tasks attribute discovery works correctly
 * and returns proper schema without calling the non-existent /objects/tasks/attributes endpoint.
 */

import { describe, it, expect } from 'vitest';
import { 
  handleUniversalGetAttributes, 
  handleUniversalDiscoverAttributes 
} from '../../../../src/handlers/tool-configs/universal/shared-handlers.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

describe('Tasks Attribute Discovery Fix - Issue #417', () => {
  
  it('should discover task attributes without calling /objects/tasks/attributes', async () => {
    // This should not throw an error anymore
    const result = await handleUniversalDiscoverAttributes(UniversalResourceType.TASKS);
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('attributes');
    expect(result).toHaveProperty('mappings');
    expect(result).toHaveProperty('count');
    
    // Verify it contains the expected task attributes
    expect(result.attributes).toBeInstanceOf(Array);
    expect(result.attributes.length).toBeGreaterThan(0);
    
    // Check for key task attributes
    const contentAttr = result.attributes.find((attr: any) => attr.api_slug === 'content');
    expect(contentAttr).toBeDefined();
    expect(contentAttr.required).toBe(true);
    
    const statusAttr = result.attributes.find((attr: any) => attr.api_slug === 'status');
    expect(statusAttr).toBeDefined();
    
    const dueDateAttr = result.attributes.find((attr: any) => attr.api_slug === 'due_date');
    expect(dueDateAttr).toBeDefined();
    
    const assigneeAttr = result.attributes.find((attr: any) => attr.api_slug === 'assignee_id');
    expect(assigneeAttr).toBeDefined();
  });

  it('should return task attributes via universal get-attributes without record ID', async () => {
    // Test the get-attributes path
    const result = await handleUniversalGetAttributes({
      resource_type: UniversalResourceType.TASKS
      // No record_id, should use discover path
    });
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('attributes');
    expect(result.attributes).toBeInstanceOf(Array);
    expect(result.attributes.length).toBeGreaterThan(0);
  });

  it('should include proper field mappings for common task field names', async () => {
    const result = await handleUniversalDiscoverAttributes(UniversalResourceType.TASKS);
    
    expect(result.mappings).toBeDefined();
    
    // Check key field mappings
    expect(result.mappings['title']).toBe('content');
    expect(result.mappings['name']).toBe('content');
    expect(result.mappings['description']).toBe('content');
    expect(result.mappings['assignee']).toBe('assignee_id');
    expect(result.mappings['due']).toBe('due_date');
    expect(result.mappings['record']).toBe('record_id');
  });

  it('should provide helpful field descriptions for task attributes', async () => {
    const result = await handleUniversalDiscoverAttributes(UniversalResourceType.TASKS);
    
    const contentAttr = result.attributes.find((attr: any) => attr.api_slug === 'content');
    expect(contentAttr.description).toContain('text');
    
    const dueDateAttr = result.attributes.find((attr: any) => attr.api_slug === 'due_date');
    expect(dueDateAttr.description).toContain('ISO date');
    
    const assigneeAttr = result.attributes.find((attr: any) => attr.api_slug === 'assignee_id');
    expect(assigneeAttr.description).toContain('workspace member');
  });
});