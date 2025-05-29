import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchCompanies,
  listCompanies,
  getCompanyDetails,
  getCompanyNotes,
  getCompanyLists,
  createCompanyNote,
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany,
} from '../../src/objects/companies/index';
import { companyCache } from '../../src/objects/companies/search';
import * as attioClient from '../../src/api/attio-client';
import * as records from '../../src/objects/records';
import * as attributeTypes from '../../src/api/attribute-types';
import {
  InvalidCompanyDataError,
  CompanyOperationError,
} from '../../src/errors/company-errors';

// Mock the API client and records module
vi.mock('../../src/api/attio-client');
vi.mock('../../src/objects/records');
vi.mock('../../src/api/attribute-types');

// Mock the CompanyValidator to avoid API calls during validation
vi.mock('../../src/validators/company-validator', () => ({
  CompanyValidator: {
    validateCreate: vi.fn(async (company: any) => {
      const { InvalidCompanyDataError } = await import(
        '../../src/errors/company-errors'
      );
      if (!company.name) {
        throw new InvalidCompanyDataError('Name is required');
      }
      if (typeof company.name !== 'string') {
        throw new InvalidCompanyDataError('Name must be a string');
      }
      if (
        company.website &&
        (typeof company.website !== 'string' ||
          !company.website.startsWith('http'))
      ) {
        throw new InvalidCompanyDataError('Website must be a valid URL');
      }
      return company;
    }),
    validateUpdate: vi.fn(async (companyId: string, attributes: any) => {
      return attributes;
    }),
    validateAttributeUpdate: vi.fn(
      async (companyId: string, attributeName: string, value: any) => {
        // Simple pass-through for testing - just return the value
        return value;
      }
    ),
  },
}));
const mockedAttioClient = attioClient as vi.Mocked<typeof attioClient>;
const mockedRecords = records as vi.Mocked<typeof records>;
const mockedAttributeTypes = attributeTypes as vi.Mocked<typeof attributeTypes>;

describe('companies', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Setup mock API client
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);

    // Mock attribute type detection to avoid API calls during tests
    mockedAttributeTypes.detectFieldType.mockImplementation(
      (objectSlug: string, field: string) => {
        // Return the expected type for known fields
        if (field === 'services') return Promise.resolve('string');
        if (field === 'name') return Promise.resolve('string');
        if (field === 'industry') return Promise.resolve('string');
        // Default to string for unknown fields
        return Promise.resolve('string');
      }
    );

    // Mock formatAllAttributes to return attributes as-is for tests
    mockedAttributeTypes.formatAllAttributes.mockImplementation(
      async (objectType: string, attributes: any) => {
        // For tests, just return the attributes wrapped in the expected format
        const formatted: Record<string, any> = {};
        for (const [key, value] of Object.entries(attributes)) {
          formatted[key] = { value };
        }
        return formatted;
      }
    );

    // Mock getObjectAttributeMetadata if it's called
    mockedAttributeTypes.getObjectAttributeMetadata.mockResolvedValue(
      new Map([
        [
          'name',
          {
            api_slug: 'name',
            type: 'text',
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'name',
            },
            title: 'Name',
          },
        ],
        [
          'services',
          {
            api_slug: 'services',
            type: 'text',
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'services',
            },
            title: 'Services',
          },
        ],
        [
          'industry',
          {
            api_slug: 'industry',
            type: 'text',
            id: {
              workspace_id: 'ws1',
              object_id: 'obj1',
              attribute_id: 'industry',
            },
            title: 'Industry',
          },
        ],
      ])
    );

    // Mock formatAllAttributes to pass through the attributes in the expected format
    mockedAttributeTypes.formatAllAttributes.mockImplementation(
      async (objectType: string, attributes: any) => {
        // For companies test, return the attributes as expected by the test
        return attributes;
      }
    );
  });

  describe('searchCompanies', () => {
    it('should search companies by name', async () => {
      // Arrange
      const query = 'Test Company';
      const mockResponse = {
        data: {
          data: [
            {
              id: { record_id: 'company1' },
              values: { name: [{ value: 'Test Company Inc.' }] },
            },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await searchCompanies(query);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            name: { $contains: query },
          },
        })
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should throw error when API call fails', async () => {
      // Clear cache to ensure we test the actual API call failure
      companyCache.clear();

      // Arrange
      const query = 'Test Company';
      const mockError = new Error('API Error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Mock the retry functionality directly in the test
      vi.mock('../../src/api/attio-operations.js', async () => {
        const actual = await vi.importActual('../../src/api/attio-operations.js');
        return {
          ...actual,
          callWithRetry: (fn: any) => fn(),
        };
      });

      // Act & Assert
      await expect(searchCompanies(query)).rejects.toThrow('API Error');
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('listCompanies', () => {
    it('should list companies sorted by most recent interaction', async () => {
      // Arrange
      const mockResponse = {
        data: {
          data: [
            {
              id: { record_id: 'company1' },
              values: { name: [{ value: 'Company A' }] },
            },
            {
              id: { record_id: 'company2' },
              values: { name: [{ value: 'Company B' }] },
            },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await listCompanies();

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          limit: 20,
          sorts: [
            {
              attribute: 'last_interaction',
              field: 'interacted_at',
              direction: 'desc',
            },
          ],
        })
      );
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getCompanyDetails', () => {
    it('should fetch company details by ID', async () => {
      // Arrange
      const companyId = 'company123';
      const mockResponse = {
        data: {
          id: { record_id: companyId },
          values: { name: [{ value: 'Test Company' }] },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getCompanyDetails(companyId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/objects/companies/records/${companyId}`
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCompanyNotes', () => {
    it('should fetch notes for a company', async () => {
      // Arrange
      const companyId = 'company123';
      const limit = 5;
      const offset = 10;
      const mockResponse = {
        data: {
          data: [
            { id: 'note1', title: 'Note 1', content: 'Content 1' },
            { id: 'note2', title: 'Note 2', content: 'Content 2' },
          ],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getCompanyNotes(companyId, limit, offset);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/notes?limit=${limit}&offset=${offset}&parent_object=companies&parent_record_id=${companyId}`
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should use default values for limit and offset when not provided', async () => {
      // Arrange
      const companyId = 'company123';
      const mockResponse = {
        data: {
          data: [{ id: 'note1' }],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      await getCompanyNotes(companyId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/notes?limit=10&offset=0&parent_object=companies&parent_record_id=${companyId}`
      );
    });
  });

  describe('getCompanyLists', () => {
    it('should fetch lists for a company', async () => {
      const companyId = 'comp123';
      const mockResponse = {
        data: {
          data: [
            {
              list_id: 'list1',
              id: { entry_id: 'e1' },
              list: { id: { list_id: 'list1' }, name: 'List A' },
            },
            {
              list_id: 'list2',
              id: { entry_id: 'e2' },
              list: { id: { list_id: 'list2' }, name: 'List B' },
            },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await getCompanyLists(companyId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/lists-entries/query',
        {
          filter: { record_id: { $equals: companyId } },
          expand: ['list'],
          limit: 50,
        }
      );
      expect(result).toEqual([
        mockResponse.data.data[0].list,
        mockResponse.data.data[1].list,
      ]);
    });
  });

  describe('createCompanyNote', () => {
    it('should create a note for a company', async () => {
      // Arrange
      const companyId = 'company123';
      const title = 'Test Note';
      const content = 'This is a test note';
      const mockResponse = {
        data: {
          id: { note_id: 'note123' },
          title: '[AI] Test Note',
          content: 'This is a test note',
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await createCompanyNote(companyId, title, content);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/notes', {
        data: {
          format: 'plaintext',
          parent_object: 'companies',
          parent_record_id: companyId,
          title: `[AI] ${title}`,
          content: content,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createCompany', () => {
    it('should create a new company', async () => {
      // Arrange
      const attributes = {
        name: 'New Company',
        website: 'https://newcompany.com',
        industry: 'Technology',
      };
      const mockResponse = {
        id: { record_id: 'newcompany1' },
        values: {
          name: [{ value: 'New Company' }],
          website: [{ value: 'https://newcompany.com' }],
          industry: [{ value: 'Technology' }],
        },
      };
      mockedRecords.createObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await createCompany(attributes);

      // Assert - Note: 'industry' is automatically mapped to 'categories' by attribute mapping system
      expect(mockedRecords.createObjectRecord).toHaveBeenCalledWith(
        'companies',
        {
          name: 'New Company',
          website: 'https://newcompany.com',
          categories: 'Technology', // Note: 'industry' is mapped to 'categories'
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should validate required fields', async () => {
      // Arrange
      const attributes = { website: 'https://test.com' }; // Missing required name

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(
        InvalidCompanyDataError
      );
    });

    it('should validate field types', async () => {
      // Arrange
      const attributes = { name: 123 } as any; // Name should be string - bypassing TS for test

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(
        InvalidCompanyDataError
      );
    });

    it('should validate URL fields', async () => {
      // Arrange
      const attributes = {
        name: 'Test Company',
        website: 'not-a-valid-url',
      };

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(
        InvalidCompanyDataError
      );
    });

    it('should handle errors when creating a company', async () => {
      // Arrange
      const attributes = { name: 'Test Company' };
      const error = new Error('API Error');
      mockedRecords.createObjectRecord.mockRejectedValue(error);

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(
        CompanyOperationError
      );
    });
  });

  describe('updateCompany', () => {
    it('should update an existing company', async () => {
      // Arrange
      const companyId = 'company123';
      const attributes = {
        name: 'Updated Company',
        industry: 'Finance',
      };
      const mockResponse = {
        id: { record_id: companyId },
        values: {
          name: [{ value: 'Updated Company' }],
          industry: [{ value: 'Finance' }],
        },
      };
      mockedRecords.updateObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await updateCompany(companyId, attributes);

      // Assert - Note: 'industry' is automatically mapped to 'categories' by attribute mapping system
      expect(mockedRecords.updateObjectRecord).toHaveBeenCalledWith(
        'companies',
        companyId,
        {
          name: 'Updated Company',
          categories: 'Finance', // Note: 'industry' is mapped to 'categories'
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when updating a company', async () => {
      // Arrange
      const companyId = 'company123';
      const attributes = { name: 'Updated Company' };
      const error = new Error('Update failed');
      mockedRecords.updateObjectRecord.mockRejectedValue(error);

      // Act & Assert
      await expect(updateCompany(companyId, attributes)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('updateCompanyAttribute', () => {
    it('should update a specific company attribute', async () => {
      // Arrange
      const companyId = 'company123';
      const attributeName = 'industry';
      const attributeValue = 'Healthcare';
      const mockResponse = {
        id: { record_id: companyId },
        values: {
          industry: [{ value: 'Healthcare' }],
        },
      };
      mockedRecords.updateObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await updateCompanyAttribute(
        companyId,
        attributeName,
        attributeValue
      );

      // Assert - Note: 'industry' is automatically mapped to 'categories' by attribute mapping system
      // The updateCompanyAttribute function calls updateCompany with { [attributeName]: value }
      // but updateCompany maps attributes, so industry -> categories
      expect(mockedRecords.updateObjectRecord).toHaveBeenCalledWith(
        'companies',
        companyId,
        { categories: 'Healthcare' } // Note: 'industry' is mapped to 'categories'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when updating a company attribute', async () => {
      // Arrange
      const companyId = 'company123';
      const attributeName = 'industry';
      const attributeValue = 'Healthcare';
      const error = new Error('Attribute update failed');
      mockedRecords.updateObjectRecord.mockRejectedValue(error);

      // Act & Assert
      await expect(
        updateCompanyAttribute(companyId, attributeName, attributeValue)
      ).rejects.toThrow('Attribute update failed');
    });
  });

  describe('deleteCompany', () => {
    it('should delete a company', async () => {
      // Arrange
      const companyId = 'company123';
      mockedRecords.deleteObjectRecord.mockResolvedValue(true);

      // Act
      const result = await deleteCompany(companyId);

      // Assert
      expect(mockedRecords.deleteObjectRecord).toHaveBeenCalledWith(
        'companies',
        companyId
      );
      expect(result).toBe(true);
    });

    it('should handle errors when deleting a company', async () => {
      // Arrange
      const companyId = 'company123';
      const error = new Error('Delete failed');
      mockedRecords.deleteObjectRecord.mockRejectedValue(error);

      // Act & Assert
      await expect(deleteCompany(companyId)).rejects.toThrow('Delete failed');
    });
  });
});
