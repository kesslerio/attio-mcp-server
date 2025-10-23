/**
 * Tests for PersonCreator email retry logic edge cases
 * Based on PR #744 feedback - testing the refactored strategy pattern
 */

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { PersonCreator } from '@services/create/creators/person-creator';
import {
  EmailRetryManager,
  StringEmailStrategy,
  ObjectEmailStrategy,
} from '@services/create/creators/email-strategies';
import type { ResourceCreatorContext } from '@services/create/creators/types';
import type { JsonObject } from '@shared-types/attio';

// Mock the dependencies
vi.mock('@services/create/data-normalizers', () => ({
  normalizePersonValues: vi.fn((input: JsonObject) => input),
  normalizeEmailsToObjectFormat: vi.fn((emails: unknown[]) =>
    emails.map((email) => ({ email_address: email }))
  ),
  normalizeEmailsToStringFormat: vi.fn((emails: unknown[]) =>
    emails.map((email: any) => email.email_address || String(email))
  ),
}));

vi.mock('@services/create/extractor', () => ({
  extractAttioRecord: vi.fn(),
  assertLooksLikeCreated: vi.fn(),
  isTestRun: vi.fn(() => false),
  debugRecordShape: vi.fn(),
  normalizeRecordForOutput: vi.fn((record: any) => record),
}));

vi.mock('@test-support/mock-alias', () => ({
  registerMockAliasIfPresent: vi.fn(),
}));

vi.mock('@utils/type-extraction', () => ({
  safeExtractRecordId: vi.fn(() => 'test-id'),
}));

describe('PersonCreator Email Retry Logic', () => {
  let personCreator: PersonCreator;
  let mockContext: ResourceCreatorContext;

  beforeEach(() => {
    personCreator = new PersonCreator();
    mockContext = {
      client: {
        post: vi.fn(),
        defaults: {
          headers: {
            Authorization: 'Bearer test-token',
          },
        },
      },
      debug: vi.fn(),
    } as any;

    vi.clearAllMocks();
  });

  describe('Email Strategy Pattern', () => {
    test('StringEmailStrategy should handle string email arrays', () => {
      const strategy = new StringEmailStrategy();
      const stringEmails = ['test@example.com', 'test2@example.com'];

      expect(strategy.canHandle(stringEmails)).toBe(true);
      expect(strategy.canHandle([{ email_address: 'test@example.com' }])).toBe(
        false
      );
      expect(strategy.canHandle([])).toBe(false);
    });

    test('ObjectEmailStrategy should handle object email arrays', () => {
      const strategy = new ObjectEmailStrategy();
      const objectEmails = [{ email_address: 'test@example.com' }];

      expect(strategy.canHandle(objectEmails)).toBe(true);
      expect(strategy.canHandle(['test@example.com'])).toBe(false);
      expect(strategy.canHandle([{}])).toBe(false);
      expect(strategy.canHandle([])).toBe(false);
    });

    test('EmailRetryManager should convert string emails to object format', () => {
      const manager = new EmailRetryManager();
      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com', 'test2@example.com'],
      };

      const result = manager.tryConvertEmailFormat(personData);

      expect(result).toBeDefined();
      expect(result!.convertedData.email_addresses).toEqual([
        expect.objectContaining({ email_address: 'test@example.com' }),
        expect.objectContaining({ email_address: 'test2@example.com' }),
      ]);
      expect(result!.originalFormat).toBe('string');
    });

    test('EmailRetryManager should convert object emails to string format', () => {
      const manager = new EmailRetryManager();
      const personData = {
        name: 'Test Person',
        email_addresses: [
          { email_address: 'test@example.com' },
          { email_address: 'test2@example.com' },
        ],
      };

      const result = manager.tryConvertEmailFormat(personData);

      expect(result).toBeDefined();
      expect(result!.convertedData.email_addresses).toEqual([
        'test@example.com',
        'test2@example.com',
      ]);
      expect(result!.originalFormat).toBe('object');
    });

    test('EmailRetryManager should return null for unsupported formats', () => {
      const manager = new EmailRetryManager();

      // Test with no email_addresses
      expect(manager.tryConvertEmailFormat({ name: 'Test' })).toBeNull();

      // Test with empty email array
      expect(manager.tryConvertEmailFormat({ email_addresses: [] })).toBeNull();

      // Test with unsupported format
      expect(
        manager.tryConvertEmailFormat({ email_addresses: [123, 456] })
      ).toBeNull();

      // Test with non-array email_addresses
      expect(
        manager.tryConvertEmailFormat({ email_addresses: 'not-an-array' })
      ).toBeNull();
    });
  });

  describe('Person Creation with Retry', () => {
    test('should succeed on first attempt without retry', async () => {
      const mockResponse = { data: { id: { record_id: 'test-id' } } };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockResolvedValueOnce(mockResponse);

      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com'],
      };

      // Mock the private method by accessing it through reflection
      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );
      const result = await createWithRetry(mockContext, personData);

      expect(result).toBe(mockResponse);
      expect(postMock).toHaveBeenCalledTimes(1);
      expect(postMock).toHaveBeenCalledWith('/objects/people/records', {
        data: { values: personData },
      });
    });

    test('should retry with alternative email format on 400 error', async () => {
      const error400 = { response: { status: 400 } };
      const mockResponse = { data: { id: { record_id: 'test-id' } } };
      const postMock = mockContext.client.post as MockedFunction<any>;

      // First call fails with 400, second succeeds
      postMock.mockRejectedValueOnce(error400);
      postMock.mockResolvedValueOnce(mockResponse);

      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com'],
      };

      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );
      const result = await createWithRetry(mockContext, personData);

      expect(result).toBe(mockResponse);
      expect(postMock).toHaveBeenCalledTimes(2);

      // First call with original format
      expect(postMock).toHaveBeenNthCalledWith(1, '/objects/people/records', {
        data: { values: personData },
      });

      // Second call with converted format
      const secondCallArgs = postMock.mock.calls[1];
      const convertedEmails = secondCallArgs[1].data.values.email_addresses;
      expect(convertedEmails).toEqual([
        expect.objectContaining({ email_address: 'test@example.com' }),
      ]);

      // Should log retry attempt
      expect(mockContext.debug).toHaveBeenCalledWith(
        'PersonCreator',
        'Retrying person creation with alternate email format',
        expect.objectContaining({
          originalFormat: 'string',
          retryFormat: 'object',
        })
      );
    });

    test('should not retry on non-400 errors', async () => {
      const error500 = { response: { status: 500 } };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockRejectedValueOnce(error500);

      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com'],
      };

      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );

      await expect(createWithRetry(mockContext, personData)).rejects.toBe(
        error500
      );
      expect(postMock).toHaveBeenCalledTimes(1);
      expect(mockContext.debug).not.toHaveBeenCalled();
    });

    test('should not retry if no alternative email format is available', async () => {
      const error400 = { response: { status: 400 } };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockRejectedValueOnce(error400);

      const personData = {
        name: 'Test Person',
        email_addresses: [123], // Unsupported format
      };

      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );

      await expect(createWithRetry(mockContext, personData)).rejects.toBe(
        error400
      );
      expect(postMock).toHaveBeenCalledTimes(1);
      expect(mockContext.debug).not.toHaveBeenCalled();
    });

    test('should handle mixed email format arrays', () => {
      const manager = new EmailRetryManager();

      // Mixed array should not be handled by any strategy
      const mixedEmails = [
        'string@example.com',
        { email_address: 'object@example.com' },
      ];
      const result = manager.tryConvertEmailFormat({
        email_addresses: mixedEmails,
      });

      // Should handle based on first element (string strategy)
      expect(result).toBeDefined();
      expect(result!.originalFormat).toBe('string');
    });

    test('should recover when both email formats fail', async () => {
      const error400 = { response: { status: 400 } };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockRejectedValue(error400); // Both attempts fail

      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com'],
      };

      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );

      await expect(createWithRetry(mockContext, personData)).rejects.toBe(
        error400
      );
      expect(postMock).toHaveBeenCalledTimes(2);

      // Should have attempted retry with debug log
      expect(mockContext.debug).toHaveBeenCalledWith(
        'PersonCreator',
        'Retrying person creation with alternate email format',
        expect.any(Object)
      );
    });

    test('should preserve original error when retry also fails', async () => {
      const originalError = {
        response: { status: 400 },
        message: 'Original error',
      };
      const retryError = { response: { status: 400 }, message: 'Retry error' };
      const postMock = mockContext.client.post as MockedFunction<any>;

      postMock.mockRejectedValueOnce(originalError);
      postMock.mockRejectedValueOnce(retryError);

      const personData = {
        name: 'Test Person',
        email_addresses: ['test@example.com'],
      };

      const createWithRetry = (personCreator as any).createPersonWithRetry.bind(
        personCreator
      );

      // Should throw the retry error, not the original
      await expect(createWithRetry(mockContext, personData)).rejects.toBe(
        retryError
      );
    });
  });

  describe('Person Creation Without Email (Issue #895)', () => {
    test('should create person with name only (no email)', async () => {
      const mockResponse = {
        data: {
          data: {
            id: { record_id: 'test-id-no-email' },
            values: {
              name: [
                { first_name: 'John', last_name: 'Doe', full_name: 'John Doe' },
              ],
            },
          },
        },
      };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockResolvedValueOnce(mockResponse);

      const personData = {
        name: 'John Doe',
      };

      const result = await personCreator.create(personData, mockContext);

      expect(postMock).toHaveBeenCalledTimes(1);
      // Verify that the name is present and email is not present
      const callArgs = postMock.mock.calls[0][1];
      expect(callArgs.data.values).toHaveProperty('name');
      expect(callArgs.data.values.name).toBe('John Doe'); // Mock returns input as-is
      expect(callArgs.data.values).not.toHaveProperty('email_addresses');
      expect(result).toBeDefined();
    });

    test('should create person with name object (no email)', async () => {
      const mockResponse = {
        data: {
          data: {
            id: { record_id: 'test-id-no-email-2' },
            values: {
              name: [
                {
                  first_name: 'Jane',
                  last_name: 'Smith',
                  full_name: 'Jane Smith',
                },
              ],
            },
          },
        },
      };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockResolvedValueOnce(mockResponse);

      const personData = {
        name: {
          first_name: 'Jane',
          last_name: 'Smith',
          full_name: 'Jane Smith',
        },
      };

      const result = await personCreator.create(personData, mockContext);

      expect(postMock).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    test('should fail when neither name nor email is provided', async () => {
      const personData = {
        job_title: 'Software Engineer',
      };

      await expect(
        personCreator.create(personData, mockContext)
      ).rejects.toThrow('missing required parameter: name');
    });

    test('should create person with name and optional fields (no email)', async () => {
      const mockResponse = {
        data: {
          data: {
            id: { record_id: 'test-id-no-email-3' },
            values: {
              name: [
                {
                  first_name: 'Bob',
                  last_name: 'Wilson',
                  full_name: 'Bob Wilson',
                },
              ],
              job_title: 'Product Manager',
              phone_numbers: ['+1-555-1234'],
            },
          },
        },
      };
      const postMock = mockContext.client.post as MockedFunction<any>;
      postMock.mockResolvedValueOnce(mockResponse);

      const personData = {
        name: 'Bob Wilson',
        job_title: 'Product Manager',
        phone_numbers: ['+1-555-1234'],
      };

      const result = await personCreator.create(personData, mockContext);

      expect(postMock).toHaveBeenCalledTimes(1);
      const callArgs = postMock.mock.calls[0][1];
      expect(callArgs.data.values).not.toHaveProperty('email_addresses');
      expect(callArgs.data.values).toHaveProperty(
        'job_title',
        'Product Manager'
      );
      expect(result).toBeDefined();
    });
  });
});
