/**
 * Integration tests for person record creation
 * Tests the complete flow including field formatting and API calls
 * Addresses issues #407, #408, #409
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPerson } from '../../src/objects/people-write.js';
import { getAttioClient } from '../../src/api/attio-client.js';
import axios from 'axios';

// Mock the Attio client
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(),
}));

// Mock the attribute metadata fetching
vi.mock('../../src/api/attribute-types.js', async () => {
  const actual = await vi.importActual('../../src/api/attribute-types.js');

  // Create a mock metadata map for people attributes
  const mockMetadataMap = new Map([
    [
      'name',
      {
        id: {
          workspace_id: 'test-workspace',
          object_id: 'people-object',
          attribute_id: 'name-attribute',
        },
        api_slug: 'name',
        title: 'Name',
        type: 'personal-name',
        is_system_attribute: true,
        is_writable: true,
        is_required: true,
        is_unique: false,
      },
    ],
    [
      'email_addresses',
      {
        id: {
          workspace_id: 'test-workspace',
          object_id: 'people-object',
          attribute_id: 'email-attribute',
        },
        api_slug: 'email_addresses',
        title: 'Email Addresses',
        type: 'email-address',
        is_system_attribute: true,
        is_writable: true,
        is_required: false,
        is_unique: false,
        is_multiselect: true,
      },
    ],
    [
      'job_title',
      {
        id: {
          workspace_id: 'test-workspace',
          object_id: 'people-object',
          attribute_id: 'job-title-attribute',
        },
        api_slug: 'job_title',
        title: 'Job Title',
        type: 'text',
        is_system_attribute: false,
        is_writable: true,
        is_required: false,
        is_unique: false,
      },
    ],
  ]);

  return {
    ...actual,
    getObjectAttributeMetadata: vi.fn().mockResolvedValue(mockMetadataMap),
  };
});

describe('Person Creation Integration', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    // Mock the Attio client to return our mock axios instance
    vi.mocked(getAttioClient).mockReturnValue(mockAxiosInstance as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a person with a string name', async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        data: {
          id: {
            workspace_id: 'test-workspace',
            object_id: 'people-object',
            record_id: 'new-person-id',
          },
          values: {
            name: [
              {
                first_name: 'John',
                last_name: 'Doe',
                full_name: 'John Doe',
                attribute_type: 'personal-name',
              },
            ],
            email_addresses: [
              {
                email_address: 'john.doe@example.com',
                attribute_type: 'email-address',
              },
            ],
          },
        },
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    // Create a person with string name
    const result = await createPerson({
      name: 'John Doe',
      email_addresses: ['john.doe@example.com'],
    });

    // Verify the API was called with correct structure
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'John',
              last_name: 'Doe',
              full_name: 'John Doe',
            },
            email_addresses: ['john.doe@example.com'],
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockResponse.data.data);
  });

  it('should create a person with structured name', async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        data: {
          id: {
            workspace_id: 'test-workspace',
            object_id: 'people-object',
            record_id: 'new-person-id',
          },
          values: {
            name: [
              {
                first_name: 'Jane',
                last_name: 'Smith',
                full_name: 'Jane Smith',
                attribute_type: 'personal-name',
              },
            ],
            job_title: [
              {
                value: 'CEO',
                attribute_type: 'text',
              },
            ],
          },
        },
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    // Create a person with structured name
    const result = await createPerson({
      name: {
        first_name: 'Jane',
        last_name: 'Smith',
      },
      job_title: 'CEO',
    });

    // Verify the API was called with correct structure
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'Jane',
              last_name: 'Smith',
              full_name: 'Jane Smith',
            },
            job_title: 'CEO', // job_title is in the special list, no wrapping
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockResponse.data.data);
  });

  it('should handle single name correctly', async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        data: {
          id: {
            workspace_id: 'test-workspace',
            object_id: 'people-object',
            record_id: 'new-person-id',
          },
          values: {
            name: [
              {
                first_name: 'Madonna',
                full_name: 'Madonna',
                attribute_type: 'personal-name',
              },
            ],
          },
        },
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    // Create a person with single name
    const result = await createPerson({
      name: 'Madonna',
    });

    // Verify the API was called with correct structure
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'Madonna',
              full_name: 'Madonna',
            },
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockResponse.data.data);
  });

  it('should handle complex names with middle names', async () => {
    // Mock the API response
    const mockResponse = {
      data: {
        data: {
          id: {
            workspace_id: 'test-workspace',
            object_id: 'people-object',
            record_id: 'new-person-id',
          },
          values: {
            name: [
              {
                first_name: 'Jean',
                last_name: 'Damme',
                full_name: 'Jean Claude Van Damme',
                attribute_type: 'personal-name',
              },
            ],
          },
        },
      },
    };

    mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

    // Create a person with complex name
    const result = await createPerson({
      name: 'Jean Claude Van Damme',
    });

    // Verify the API was called with correct structure
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'Jean',
              last_name: 'Damme',
              full_name: 'Jean Claude Van Damme',
            },
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockResponse.data.data);
  });

  it('should reject creation without name or email', async () => {
    // Attempt to create a person without required fields
    await expect(createPerson({})).rejects.toThrow(
      'Must provide at least an email address or name'
    );

    // Verify no API call was made
    expect(mockAxiosInstance.post).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Mock an API error response
    const mockError = {
      response: {
        status: 400,
        data: {
          message: "Required field 'name' is missing",
        },
      },
    };

    mockAxiosInstance.post.mockRejectedValueOnce(mockError);

    // Attempt to create a person
    await expect(
      createPerson({
        name: 'Test User',
      })
    ).rejects.toThrow();

    // Verify the API was called
    expect(mockAxiosInstance.post).toHaveBeenCalled();
  });
});
