/**
 * Unit tests for Uniqueness Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 * Issue #990 - Enhanced uniqueness constraint violation handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uniquenessEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/uniqueness-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

const { mockSearchCompaniesByDomain, mockSearchPeopleByEmail } = vi.hoisted(
  () => ({
    mockSearchCompaniesByDomain: vi.fn(),
    mockSearchPeopleByEmail: vi.fn(),
  })
);

vi.mock('@/objects/companies/search.js', () => ({
  searchCompaniesByDomain: mockSearchCompaniesByDomain,
}));

vi.mock('@/objects/people/search.js', () => ({
  searchPeopleByEmail: mockSearchPeopleByEmail,
}));

describe('uniqueness-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "duplicate" pattern', () => {
      const error = new Error('duplicate record detected');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(uniquenessEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "uniqueness constraint" pattern (case-insensitive)', () => {
      const error = new Error('Uniqueness Constraint Violation');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(uniquenessEnhancer.matches(error, context)).toBe(true);
    });

    it('should match lowercase "uniqueness constraint"', () => {
      const error = new Error('violated uniqueness constraint on field');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      expect(uniquenessEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Invalid field name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(uniquenessEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'duplicate entry found';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(uniquenessEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance() - companies with domain', () => {
    it('should find conflicting company by domain (string)', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'comp-123' } },
      ]);

      const error = new Error('duplicate record detected');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Acme Corp', domain: 'acme.com' },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('Uniqueness conflict on "domain"');
      expect(result).toContain('acme.com');
      expect(result).toContain('comp-123');
      expect(result).toContain('OPTIONS:');
      expect(result).toContain('1. Update existing:');
      expect(result).toContain('2. View existing:');
      expect(result).toContain('3. Use a different domain value');
      expect(mockSearchCompaniesByDomain).toHaveBeenCalledWith('acme.com');
    });

    it('should find conflicting company by domains array', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'comp-456' } },
      ]);

      const error = new Error('duplicate record detected');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test Inc', domains: ['test.com', 'test.io'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('Uniqueness conflict on "domains"');
      expect(result).toContain('test.com');
      expect(result).toContain('comp-456');
      expect(mockSearchCompaniesByDomain).toHaveBeenCalledWith('test.com');
    });

    it('should format message with actionable options', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'comp-789' } },
      ]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domains: ['example.com'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain(
        'update-record(resource_type="companies", record_id="comp-789"'
      );
      expect(result).toContain(
        'records_get_details(resource_type="companies", record_id="comp-789"'
      );
    });

    it('should fallback when search returns empty array', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domains: ['example.com'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
    });

    it('should fallback when search throws error', async () => {
      mockSearchCompaniesByDomain.mockRejectedValue(new Error('API error'));

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domains: ['example.com'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
    });

    it('should fallback when search returns no record_id', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([{}]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domains: ['example.com'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
    });
  });

  describe('enhance() - people with email', () => {
    it('should find conflicting person by email (string)', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'person-123' } },
      ]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { name: 'John Doe', email: 'john@example.com' },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('Uniqueness conflict on "email"');
      expect(result).toContain('john@example.com');
      expect(result).toContain('person-123');
      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should find conflicting person by email_addresses array', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'person-456' } },
      ]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { emails: ['jane@test.com', 'jane@example.com'] },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('Uniqueness conflict on "emails"');
      expect(result).toContain('jane@test.com');
      expect(result).toContain('person-456');
      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('jane@test.com');
    });

    it('should extract email from object format', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'person-789' } },
      ]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: {
          email_addresses: { email_address: 'bob@example.com' },
        },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('bob@example.com');
      expect(result).toContain('person-789');
      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('bob@example.com');
    });

    it('should extract email from object with "email" property', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'person-999' } },
      ]);

      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: {
          email_addresses: { email: 'alice@test.com' },
        },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toContain('alice@test.com');
      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('alice@test.com');
    });
  });

  describe('enhance() - edge cases', () => {
    it('should return null when no recordData', async () => {
      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBeNull();
      expect(mockSearchCompaniesByDomain).not.toHaveBeenCalled();
    });

    it('should return fallback for unsupported resource types', async () => {
      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { name: 'Test Deal' },
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
      expect(mockSearchCompaniesByDomain).not.toHaveBeenCalled();
      expect(mockSearchPeopleByEmail).not.toHaveBeenCalled();
    });

    it('should return fallback when recordData has no unique fields', async () => {
      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test Company' }, // no domain/domains field
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
      expect(mockSearchCompaniesByDomain).not.toHaveBeenCalled();
    });

    it('should skip non-string field values', async () => {
      const error = new Error('duplicate');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { domains: [123, 456] }, // non-string array values
      };

      const result = await uniquenessEnhancer.enhance(error, context);

      expect(result).toBe(
        'A record with similar data already exists. Check unique fields like domains or email_addresses.'
      );
      expect(mockSearchCompaniesByDomain).not.toHaveBeenCalled();
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(uniquenessEnhancer.errorName).toBe('duplicate_error');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(uniquenessEnhancer.name).toBe('uniqueness');
    });
  });
});
