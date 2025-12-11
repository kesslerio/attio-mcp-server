import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Issue #990: Use vi.hoisted() for mock functions to avoid hoisting issues
const { mockSearchCompaniesByDomain, mockSearchPeopleByEmail } = vi.hoisted(
  () => ({
    mockSearchCompaniesByDomain: vi.fn(),
    mockSearchPeopleByEmail: vi.fn(),
  })
);

// Mock company search for Issue #990 uniqueness error enhancement
// Use @/ alias to match runtime dynamic import paths
vi.mock('@/objects/companies/search.js', () => ({
  searchCompaniesByDomain: mockSearchCompaniesByDomain,
}));

// Mock people search for Issue #990 uniqueness error enhancement
// Use @/ alias to match runtime dynamic import paths
vi.mock('@/objects/people/search.js', () => ({
  searchPeopleByEmail: mockSearchPeopleByEmail,
}));

vi.mock('../../../../../src/utils/logger.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/utils/logger.js')
  >('../../../../../src/utils/logger.js');

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    ...actual,
    createScopedLogger: () => mockLogger,
    CURRENT_LOG_LEVEL: 0,
  };
});

import {
  handleCreateError,
  handleUpdateError,
  handleDeleteError,
  handleSearchError,
} from '../../../../../src/handlers/tool-configs/universal/core/crud-error-handlers.js';
import { UniversalResourceType } from '../../../../../src/handlers/tool-configs/universal/types.js';

vi.mock('../../../../../src/services/metadata/index.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../src/services/metadata/index.js')
  >('../../../../../src/services/metadata/index.js');

  return {
    ...actual,
    AttributeOptionsService: {
      getOptions: vi.fn().mockResolvedValue({
        options: [
          { id: '1', title: 'Demo' },
          { id: '2', title: 'Qualified' },
          { id: '3', title: 'Closed Won' },
        ],
        attributeType: 'select',
      }),
    },
  };
});

const companies = UniversalResourceType.COMPANIES;

describe('crud-error-handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws validation_error when required fields are missing during create', async () => {
    await expect(
      handleCreateError(new Error('required field missing'), companies, {
        name: 'Acme',
      })
    ).rejects.toMatchObject({
      name: 'validation_error',
      message: expect.stringContaining('Missing required fields'),
    });
  });

  it('throws duplicate_error when duplicate data is detected during create', async () => {
    await expect(
      handleCreateError(new Error('duplicate record detected'), companies, {
        name: 'Acme',
      })
    ).rejects.toMatchObject({
      name: 'duplicate_error',
      message: expect.stringContaining('already exists'),
    });
  });

  it('falls back to create_error when no specific pattern matches', async () => {
    const err = new Error('Unexpected failure');
    await expect(
      handleCreateError(err, companies, {
        name: 'Fallback',
      })
    ).rejects.toMatchObject({
      name: 'create_error',
      message: expect.stringContaining('Unexpected failure'),
    });
  });

  it('throws validation_error on update validation failures and includes warnings', async () => {
    const validationMetadata = {
      warnings: ['Stage validation failed'],
      suggestions: ['Use the "qualified" stage'],
    };

    await expect(
      handleUpdateError(
        new Error('validation failed for stage field'),
        UniversalResourceType.DEALS,
        { stage: 'unknown' },
        'deal_123',
        validationMetadata
      )
    ).rejects.toMatchObject({
      name: 'validation_error',
      message: expect.stringContaining('Validation failed'),
    });
  });

  it('throws not_found_error when update finds no record', async () => {
    const err = new Error('record not found');
    await expect(
      handleUpdateError(
        err,
        UniversalResourceType.PEOPLE,
        { name: 'Missing' },
        'person_404'
      )
    ).rejects.toMatchObject({
      name: 'not_found_error',
      message: expect.stringContaining('Record not found'),
    });
  });

  it('throws not_found_error when delete targets a missing record', async () => {
    await expect(
      handleDeleteError(
        new Error('Record not found'),
        UniversalResourceType.PEOPLE,
        'person_123'
      )
    ).rejects.toMatchObject({
      name: 'not_found_error',
      message: expect.stringContaining('Record not found'),
    });
  });

  it('throws reference_constraint_error when delete hits reference constraint', async () => {
    await expect(
      handleDeleteError(
        new Error('referenced by other records'),
        UniversalResourceType.COMPANIES,
        'comp_123'
      )
    ).rejects.toMatchObject({
      name: 'reference_constraint_error',
      message: expect.stringContaining('referenced by other records'),
    });
  });

  it('throws invalid_filter_error for bad search filters', async () => {
    await expect(
      handleSearchError(
        new Error('invalid filter expression'),
        UniversalResourceType.RECORDS,
        { filters: [] }
      )
    ).rejects.toMatchObject({
      name: 'invalid_filter_error',
      message: expect.stringContaining('Invalid search filters'),
    });
  });

  it('throws timeout_error when search times out', async () => {
    await expect(
      handleSearchError(
        new Error('request timeout occurred'),
        UniversalResourceType.RECORDS,
        { search: 'Acme' }
      )
    ).rejects.toMatchObject({
      name: 'timeout_error',
      message: expect.stringContaining('timed out'),
    });
  });

  it('falls back to search_error when no search pattern matches', async () => {
    await expect(
      handleSearchError(
        new Error('generic search failure'),
        UniversalResourceType.RECORDS,
        { search: 'Acme' }
      )
    ).rejects.toMatchObject({
      name: 'search_error',
      message: expect.stringContaining('generic search failure'),
    });
  });

  describe('attribute-not-found error handling', () => {
    it('throws attribute_not_found with suggestions for unknown create attribute', async () => {
      await expect(
        handleCreateError(
          new Error('Cannot find attribute with slug/ID "linkedin_url".'),
          UniversalResourceType.PEOPLE,
          { linkedin_url: 'https://linkedin.com/in/test' }
        )
      ).rejects.toMatchObject({
        name: 'attribute_not_found',
        message: expect.stringContaining(
          'Attribute "linkedin_url" does not exist'
        ),
      });
    });

    it('throws attribute_not_found with suggestions for unknown update attribute', async () => {
      await expect(
        handleUpdateError(
          new Error('Cannot find attribute with slug/ID "twitter_handle".'),
          UniversalResourceType.PEOPLE,
          { twitter_handle: '@testuser' },
          'person_123'
        )
      ).rejects.toMatchObject({
        name: 'attribute_not_found',
        message: expect.stringContaining(
          'Attribute "twitter_handle" does not exist'
        ),
      });
    });

    it('enhances complex type error for location', async () => {
      const error = {
        response: {
          data: {
            message:
              'Invalid object value for "primary_location". Expected an object, but got string.',
            validation_errors: [
              { field: 'primary_location', message: 'Expected object' },
            ],
          },
        },
        message:
          'Invalid object value for "primary_location". Expected an object, but got string.',
      } as unknown as Error;

      await expect(
        handleUpdateError(error, companies, {
          primary_location: '123 Main St',
        })
      ).rejects.toMatchObject({
        name: 'validation_error',
        message: expect.stringContaining('Invalid location value'),
      });
    });

    it('enhances select/status errors from validation_errors with options', async () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed',
            validation_errors: [
              {
                field: 'stage',
                message: 'Cannot find select option with title "Bad Stage"',
              },
            ],
          },
        },
        message: 'Cannot find select option with title "Bad Stage"',
      } as unknown as Error;

      await expect(
        handleUpdateError(error, UniversalResourceType.DEALS, {
          stage: 'Bad Stage',
        })
      ).rejects.toMatchObject({
        name: 'value_not_found',
      });
    });

    it('includes discovery hint in attribute-not-found error message', async () => {
      await expect(
        handleCreateError(
          new Error('Cannot find attribute with slug/ID "unknown_field".'),
          companies,
          { unknown_field: 'test' }
        )
      ).rejects.toMatchObject({
        name: 'attribute_not_found',
        message: expect.stringContaining('records_discover_attributes'),
      });
    });
  });

  describe('Issue #990: Uniqueness Error Enhancement', () => {
    beforeEach(() => {
      mockSearchCompaniesByDomain.mockReset();
      mockSearchPeopleByEmail.mockReset();
    });

    it('should enhance company uniqueness error with domain search result', async () => {
      // Mock searchCompaniesByDomain to return existing record
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'existing-company-123' } },
      ]);

      await expect(
        handleCreateError(
          new Error('duplicate record detected'),
          UniversalResourceType.COMPANIES,
          { name: 'Test Co', domains: ['example.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(
          /domains.*example\.com.*existing-company-123/s
        ),
      });

      expect(mockSearchCompaniesByDomain).toHaveBeenCalledWith('example.com');
    });

    it('should enhance company uniqueness error with single domain string', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'company-456' } },
      ]);

      await expect(
        handleCreateError(
          new Error('Uniqueness constraint violation'),
          UniversalResourceType.COMPANIES,
          { name: 'Test Co', domain: 'test.com' }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(/domain.*test\.com.*company-456/s),
      });
    });

    it('should enhance people uniqueness error with email search result', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'existing-person-789' } },
      ]);

      await expect(
        handleCreateError(
          new Error('duplicate record detected'),
          UniversalResourceType.PEOPLE,
          { name: 'John Doe', email_addresses: ['john@example.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(
          /email_addresses.*john@example\.com.*existing-person-789/s
        ),
      });

      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should include actionable options in enhanced error message', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'conflicting-record-id' } },
      ]);

      await expect(
        handleCreateError(
          new Error('duplicate'),
          UniversalResourceType.COMPANIES,
          { domains: ['conflict.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(
          /OPTIONS.*update-record.*records_get_details/s
        ),
      });
    });

    it('should fallback to generic message when search returns no results', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([]);

      await expect(
        handleCreateError(
          new Error('duplicate'),
          UniversalResourceType.COMPANIES,
          { domains: ['notfound.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringContaining(
          'A record with similar data already exists'
        ),
      });
    });

    it('should fallback to generic message when search throws error', async () => {
      mockSearchCompaniesByDomain.mockRejectedValue(
        new Error('Search API failed')
      );

      await expect(
        handleCreateError(
          new Error('duplicate'),
          UniversalResourceType.COMPANIES,
          { domains: ['error.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringContaining(
          'A record with similar data already exists'
        ),
      });
    });

    it('should fallback to generic message for unsupported resource types', async () => {
      await expect(
        handleCreateError(new Error('duplicate'), UniversalResourceType.DEALS, {
          name: 'Test Deal',
        })
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringContaining(
          'A record with similar data already exists'
        ),
      });
    });

    it('should fallback when recordData has no unique field values', async () => {
      await expect(
        handleCreateError(
          new Error('duplicate'),
          UniversalResourceType.COMPANIES,
          { name: 'Test Co' } // No domains field
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringContaining(
          'A record with similar data already exists'
        ),
      });
    });

    it('should handle uniqueness constraint message pattern', async () => {
      mockSearchCompaniesByDomain.mockResolvedValue([
        { id: { record_id: 'constraint-company' } },
      ]);

      await expect(
        handleCreateError(
          new Error('UNIQUENESS CONSTRAINT violation for companies'),
          UniversalResourceType.COMPANIES,
          { domains: ['unique.com'] }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(/unique\.com.*constraint-company/s),
      });
    });

    it('should handle object-format email addresses', async () => {
      mockSearchPeopleByEmail.mockResolvedValue([
        { id: { record_id: 'person-obj-email' } },
      ]);

      await expect(
        handleCreateError(
          new Error('duplicate'),
          UniversalResourceType.PEOPLE,
          {
            name: 'John Doe',
            email_addresses: [{ email_address: 'john@obj.com' }],
          }
        )
      ).rejects.toMatchObject({
        name: 'duplicate_error',
        message: expect.stringMatching(/john@obj\.com.*person-obj-email/s),
      });

      expect(mockSearchPeopleByEmail).toHaveBeenCalledWith('john@obj.com');
    });
  });
});
