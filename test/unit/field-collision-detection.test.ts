/**
 * Field Collision Detection Tests
 * 
 * Tests the field mapper's ability to detect and prevent
 * collisions where multiple input fields map to the same output field.
 * 
 * Issue #403: Field collision prevention
 */

import { describe, expect, test, vi } from 'vitest';
import { 
  detectFieldCollisions, 
  mapRecordFields 
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';

describe('Field Collision Detection', () => {
  
  describe('detectFieldCollisions', () => {
    
    test('should detect collision for company domain fields', () => {
      const recordData = {
        domain: 'example.com',
        website: 'example.com',
        url: 'https://example.com'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Field collision detected');
      expect(result.errors[0]).toContain('"domain", "website", "url"');
      expect(result.errors[0]).toContain('all map to "domains"');
      expect(result.collisions.domains).toEqual(expect.arrayContaining(['domain', 'website', 'url']));
    });
    
    test('should detect collision for people email fields', () => {
      const recordData = {
        email: 'john@example.com',
        primary_email: 'john@example.com',
        email_address: 'john@example.com'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.PEOPLE, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('email_addresses');
      expect(result.collisions.email_addresses).toEqual(expect.arrayContaining(['email', 'primary_email', 'email_address']));
    });
    
    test('should detect collision for deal amount fields', () => {
      const recordData = {
        amount: 50000,
        deal_value: 55000,
        price: 60000,
        revenue: 65000
      };
      
      const result = detectFieldCollisions(UniversalResourceType.DEALS, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('"amount", "deal_value", "price", "revenue"');
      expect(result.errors[0]).toContain('all map to "value"');
    });
    
    test('should detect collision for task content fields', () => {
      const recordData = {
        title: 'Task Title',
        description: 'Task Description',
        task: 'Task Content',
        content: 'Another Content'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.TASKS, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.collisions.content).toEqual(expect.arrayContaining(['title', 'description', 'task', 'content']));
    });
    
    test('should allow first_name + last_name collision for people', () => {
      const recordData = {
        first_name: 'John',
        last_name: 'Doe'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.PEOPLE, recordData);
      
      expect(result.hasCollisions).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should detect collision when first_name/last_name mixed with other name fields', () => {
      const recordData = {
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        person_name: 'J. Doe'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.PEOPLE, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.collisions.name).toEqual(expect.arrayContaining(['first_name', 'last_name', 'full_name', 'person_name']));
    });
    
    test('should not detect collisions for valid non-colliding fields', () => {
      const recordData = {
        name: 'Test Company',
        industry: 'Technology',
        location: 'San Francisco'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.collisions).toEqual({});
    });
    
    test('should skip null-mapped fields in collision detection', () => {
      const recordData = {
        description: 'Some description',  // Maps to null for deals
        name: 'Deal Name'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.DEALS, recordData);
      
      expect(result.hasCollisions).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('mapRecordFields with collision detection', () => {
    
    test('should return errors when collisions detected', () => {
      const recordData = {
        domain: 'example.com',
        website: 'example.com'
      };
      
      const result = mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain('Field collision detected');
      expect(result.mapped).toEqual({});
      expect(result.warnings).toHaveLength(0);
    });
    
    test('should process fields normally when no collisions', () => {
      const recordData = {
        name: 'Test Company',
        domain: 'example.com'
      };
      
      const result = mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.errors).toBeUndefined();
      expect(result.mapped).toEqual({
        name: 'Test Company',
        domains: 'example.com'
      });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Field "domain" mapped to "domains"');
    });
    
    test('should handle first_name + last_name combination correctly', () => {
      const recordData = {
        first_name: 'John',
        last_name: 'Doe'
      };
      
      const result = mapRecordFields(UniversalResourceType.PEOPLE, recordData);
      
      expect(result.errors).toBeUndefined();
      expect(result.mapped).toEqual({
        name: 'John Doe'
      });
      // Should have mapping warnings for the individual fields + combination warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Combined first_name and last_name'))).toBe(true);
    });
  });

  describe('Field collision suggestions', () => {
    
    test('should suggest canonical field names', () => {
      const recordData = {
        company_domain: 'example.com',
        primary_domain: 'example.com',
        domain: 'example.com'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors[0]).toContain('Recommended: Use "domain"');
    });
    
    test('should prefer target field name when present', () => {
      const recordData = {
        domains: ['example.com'],
        domain: 'example.com',
        website: 'example.com'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors[0]).toContain('Recommended: Use "domains"');
    });
  });

  describe('Multiple collision scenarios', () => {
    
    test('should detect multiple different collisions in same record', () => {
      const recordData = {
        // Domain collision
        domain: 'example.com',
        website: 'example.com',
        // Description collision  
        description: 'Company desc',
        notes: 'Company notes',
        // Size collision
        employee_count: 100,
        size: 'Large'
      };
      
      const result = detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors).toHaveLength(3); // Three separate collisions
      
      // Check all collisions are detected
      expect(result.collisions).toHaveProperty('domains');
      expect(result.collisions).toHaveProperty('note');  
      expect(result.collisions).toHaveProperty('estimated_arr');
    });
  });
});