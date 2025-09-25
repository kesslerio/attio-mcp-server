import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
    await expect(
      handleCreateError(new Error('Unexpected failure'), companies, {
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
    await expect(
      handleUpdateError(
        new Error('record not found'),
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
});
