/**
 * Test for the phone field fix in people search
 * Verifies that searchObject uses correct 'phone_numbers' field instead of 'phone'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchObject } from '../../src/api/operations/search.js';
import { ResourceType } from '../../src/types/attio.js';

// Mock the Attio client
const mockPost = vi.fn();
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: () => ({
    post: mockPost,
  }),
}));

describe('People Search Phone Field Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: { data: [] } });
  });

  it('should use phone_numbers field instead of phone for people search', async () => {
    const query = 'test@example.com';

    await searchObject(ResourceType.PEOPLE, query);

    expect(mockPost).toHaveBeenCalledWith('/objects/people/records/query', {
      filter: {
        $or: [
          { name: { $contains: query } },
          { email_addresses: { $contains: query } },
          { phone_numbers: { $contains: query } }, // This should be phone_numbers, not phone
        ],
      },
    });
  });

  it('should use name field only for company search (not affected)', async () => {
    const query = 'test company';

    await searchObject(ResourceType.COMPANIES, query);

    expect(mockPost).toHaveBeenCalledWith('/objects/companies/records/query', {
      filter: {
        name: { $contains: query },
      },
    });
  });

  it('should not contain the incorrect phone field in people search', async () => {
    const query = 'john@example.com';

    await searchObject(ResourceType.PEOPLE, query);

    const callArgs = mockPost.mock.calls[0];
    const filterObject = callArgs[1].filter;

    // Verify phone_numbers is used
    const phoneNumbersFilter = filterObject.$or.find(
      (f: any) => f.phone_numbers
    );
    expect(phoneNumbersFilter).toBeDefined();
    expect(phoneNumbersFilter.phone_numbers).toEqual({ $contains: query });

    // Verify the incorrect 'phone' field is NOT used
    const incorrectPhoneFilter = filterObject.$or.find((f: any) => f.phone);
    expect(incorrectPhoneFilter).toBeUndefined();
  });
});
