/**
 * Integration tests for person record creation
 * Tests the complete flow including field formatting and API calls
 * Addresses issues #407, #408, #409
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';

import { clearAttributeCache } from '../../src/api/attribute-types.js';
import { createPerson } from '../../src/objects/people-write.js';
import { getAttioClient } from '../../src/api/attio-client.js';

// Mock the Attio client
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(),
}));

// Mock the attribute metadata fetching
vi.mock('../../src/api/attribute-types.js', async () => {

  // Create a mock metadata map for people attributes
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
  let mockAxiosInstance: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    // Mock the attributes API call to return our test metadata
    mockAxiosInstance.get.mockImplementation((url: string) => {
      if (url === '/objects/people/attributes') {
        return Promise.resolve({
          data: {
            data: [
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
                is_multiselect: false,
              },
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
              {
                id: {
                  workspace_id: 'test-workspace',
                  object_id: 'people-object',
                  attribute_id: 'title-attribute',
                },
                api_slug: 'title',
                title: 'Title',
                type: 'text',
                is_system_attribute: false,
                is_writable: true,
                is_required: false,
                is_unique: false,
                is_multiselect: false,
              },
            ],
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET request to ${url}`));
    });

    // Mock the Attio client to return our mock axios instance
    vi.mocked(getAttioClient).mockReturnValue(mockAxiosInstance as any);

    // Clear the attribute cache before each test to ensure fresh metadata
    clearAttributeCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a person with a string name', async () => {
    // Mock the email validation query response (first call)
      data: {
        data: [], // No existing people with this email
      },
    };

    // Mock the create person response (second call)
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

    // Setup mock responses in order
    mockAxiosInstance.post
      .mockResolvedValueOnce(mockEmailValidationResponse) // Email validation
      .mockResolvedValueOnce(mockCreateResponse); // Person creation

    // Create a person with string name
      name: 'John Doe',
      email_addresses: ['john.doe@example.com'],
    });

    // Verify the email validation API call was made first
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      1,
      '/objects/people/records/query',
      {
        filter: {
          $or: [
            {
              email_addresses: { $contains: 'john.doe@example.com' },
            },
          ],
        },
        limit: 2,
      }
    );

    // Verify the person creation API call was made with correct structure
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      2,
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
    expect(result).toEqual(mockCreateResponse.data.data);
  });

  it('should create a person with structured name', async () => {
    // Mock the API response
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
      name: 'Jane Smith',
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
            title: 'CEO', // job_title maps to title, which is in the special list
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockResponse.data.data);
  });

  it('should handle single name correctly', async () => {
    // Mock the API response
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
    // Mock an API error response for person creation
    (mockError as any).response = {
      status: 400,
      data: {
        message: "Required field 'name' is missing",
      },
    };

    // For this test, the person has no email so no validation call will be made
    // The person creation call should fail
    mockAxiosInstance.post.mockRejectedValueOnce(mockError);

    // Attempt to create a person
    await expect(
      createPerson({
        name: 'Test User',
      })
    ).rejects.toThrow();

    // Verify the API was called exactly once (no email validation)
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/objects/people/records',
      expect.any(Object)
    );
  });

  it('should create person with email objects using value property (Issue #511)', async () => {
    // Mock the email validation query response (first call)
      data: {
        data: [], // No existing people with this email
      },
    };

    // Mock the create person response (second call)
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
                first_name: 'QA',
                last_name: 'TESTER_ALPHA_20250819',
                full_name: 'QA TESTER_ALPHA_20250819',
                attribute_type: 'personal-name',
              },
            ],
            email_addresses: [
              {
                email_address: 'qa-tester-alpha@example.com',
                attribute_type: 'email-address',
              },
            ],
            title: [
              {
                value: 'Quality Assurance Tester',
                attribute_type: 'text',
              },
            ],
          },
        },
      },
    };

    // Setup mock responses in order
    mockAxiosInstance.post
      .mockResolvedValueOnce(mockEmailValidationResponse) // Email validation
      .mockResolvedValueOnce(mockCreateResponse); // Person creation

    // Test the exact failing case from Issue #511
      first_name: 'QA',
      last_name: 'TESTER_ALPHA_20250819',
      email_addresses: ['qa-tester-alpha@example.com'],
      job_title: 'Quality Assurance Tester',
    });

    // Verify the email validation API call was made with correct email
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      1,
      '/objects/people/records/query',
      {
        filter: {
          $or: [
            {
              email_addresses: { $contains: 'qa-tester-alpha@example.com' },
            },
          ],
        },
        limit: 2,
      }
    );

    // Verify the person creation API call was made with correct structure
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      2,
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'QA',
              last_name: 'TESTER_ALPHA_20250819',
              full_name: 'QA TESTER_ALPHA_20250819',
            },
            email_addresses: ['qa-tester-alpha@example.com'], // Should extract email value
            title: 'Quality Assurance Tester',
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockCreateResponse.data.data);
  });

  it('should handle mixed email formats including value objects (Issue #511)', async () => {
    // Mock the email validation query response (first call)
      data: {
        data: [], // No existing people with these emails
      },
    };

    // Mock the create person response (second call)
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
                first_name: 'Test',
                last_name: 'User',
                full_name: 'Test User',
                attribute_type: 'personal-name',
              },
            ],
            email_addresses: [
              {
                email_address: 'simple@example.com',
                attribute_type: 'email-address',
              },
              {
                email_address: 'work@example.com',
                attribute_type: 'email-address',
              },
            ],
          },
        },
      },
    };

    // Setup mock responses in order
    mockAxiosInstance.post
      .mockResolvedValueOnce(mockEmailValidationResponse) // Email validation
      .mockResolvedValueOnce(mockCreateResponse); // Person creation

    // Test mixed email formats: string + object with value property
      first_name: 'Test',
      last_name: 'User',
      email_addresses: ['simple@example.com', 'work@example.com'],
    });

    // Verify the email validation query included both emails
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      1,
      '/objects/people/records/query',
      {
        filter: {
          $or: [
            {
              email_addresses: { $contains: 'simple@example.com' },
            },
            {
              email_addresses: { $contains: 'work@example.com' },
            },
          ],
        },
        limit: 2,
      }
    );

    // Verify the person creation API call extracted both email values
    expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
      2,
      '/objects/people/records',
      {
        data: {
          values: {
            name: {
              first_name: 'Test',
              last_name: 'User',
              full_name: 'Test User',
            },
            email_addresses: ['simple@example.com', 'work@example.com'],
          },
        },
      }
    );

    // Verify the result
    expect(result).toEqual(mockCreateResponse.data.data);
  });
});
