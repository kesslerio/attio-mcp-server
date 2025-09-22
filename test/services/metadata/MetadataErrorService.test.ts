import { describe, it, expect } from 'vitest';
import { DefaultMetadataErrorService } from '../../../src/services/metadata/MetadataErrorService.js';

const service = new DefaultMetadataErrorService();

describe('DefaultMetadataErrorService', () => {
  it('throws structured error for axios-style responses', () => {
    const axiosError = {
      response: {
        status: 404,
        data: {
          error: {
            message: 'Not found',
          },
        },
      },
    };

    try {
      service.toStructuredError('companies', axiosError);
      throw new Error('Expected structured error');
    } catch (error) {
      expect(error).toMatchObject({
        status: 404,
        body: {
          code: 'api_error',
          message: expect.stringContaining('Not found'),
        },
      });
    }
  });

  it('throws generic error for unexpected failures', () => {
    expect(() =>
      service.toStructuredError('people', new Error('boom'))
    ).toThrowError('Failed to discover people attributes: boom');
  });

  it('wraps record fetch errors', () => {
    expect(() =>
      service.toRecordFetchError('companies', '123', new Error('missing'))
    ).toThrowError('Failed to get record attributes: missing');
  });
});
