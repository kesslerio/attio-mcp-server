import { 
  searchCompanies, 
  listCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote,
  createCompany,
  updateCompany,
  updateCompanyAttribute,
  deleteCompany
} from '../../src/objects/companies/index';
import * as attioClient from '../../src/api/attio-client';
import * as records from '../../src/objects/records';
import * as attributeTypes from '../../src/api/attribute-types';
import { 
  InvalidCompanyDataError, 
  CompanyOperationError 
} from '../../src/errors/company-errors';

// Mock the API client and records module
jest.mock('../../src/api/attio-client');
jest.mock('../../src/objects/records');
jest.mock('../../src/api/attribute-types');
const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;
const mockedRecords = records as jest.Mocked<typeof records>;
const mockedAttributeTypes = attributeTypes as jest.Mocked<typeof attributeTypes>;

describe('companies', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Setup mock API client
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
    
    // Mock attribute type detection to avoid API calls during tests
    mockedAttributeTypes.detectFieldType.mockImplementation((objectSlug: string, field: string) => {
      // Return the expected type for known fields
      if (field === 'services') return Promise.resolve('string');
      if (field === 'name') return Promise.resolve('string');
      if (field === 'industry') return Promise.resolve('string');
      // Default to string for unknown fields
      return Promise.resolve('string');
    });
    
    // Mock getObjectAttributeMetadata if it's called
    mockedAttributeTypes.getObjectAttributeMetadata.mockResolvedValue(new Map([
      ['name', { api_slug: 'name', type: 'text', id: 'name', title: 'Name' }],
      ['services', { api_slug: 'services', type: 'text', id: 'services', title: 'Services' }],
      ['industry', { api_slug: 'industry', type: 'text', id: 'industry', title: 'Industry' }]
    ]));
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
              values: { name: [{ value: 'Test Company Inc.' }] }
            }
          ]
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await searchCompanies(query);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            name: { "$contains": query }
          }
        })
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should throw error when API call fails', async () => {
      // Arrange
      const query = 'Test Company';
      const mockError = new Error('API Error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Mock the retry functionality directly in the test
      jest.mock('../../src/api/attio-operations.js', () => {
        const actual = jest.requireActual('../../src/api/attio-operations.js');
        return {
          ...actual,
          callWithRetry: (fn: any) => fn()
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
              values: { name: [{ value: 'Company A' }] }
            },
            { 
              id: { record_id: 'company2' },
              values: { name: [{ value: 'Company B' }] }
            }
          ]
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await listCompanies();

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          limit: 20,
          sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
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
          values: { name: [{ value: 'Test Company' }] }
        }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getCompanyDetails(companyId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/objects/companies/records/${companyId}`);
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
            { id: 'note2', title: 'Note 2', content: 'Content 2' }
          ]
        }
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
          data: [{ id: 'note1' }]
        }
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
          content: 'This is a test note'
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await createCompanyNote(companyId, title, content);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/notes',
        {
          data: {
            format: 'plaintext',
            parent_object: 'companies',
            parent_record_id: companyId,
            title: `[AI] ${title}`,
            content: content
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createCompany', () => {
    it('should create a new company', async () => {
      // Arrange
      const attributes = {
        name: 'New Company',
        website: 'https://newcompany.com',
        industry: 'Technology'
      };
      const mockResponse = {
        id: { record_id: 'newcompany1' },
        values: {
          name: [{ value: 'New Company' }],
          website: [{ value: 'https://newcompany.com' }],
          industry: [{ value: 'Technology' }]
        }
      };
      mockedRecords.createObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await createCompany(attributes);

      // Assert
      expect(mockedRecords.createObjectRecord).toHaveBeenCalledWith(
        'companies',
        attributes
      );
      expect(result).toEqual(mockResponse);
    });

    it('should validate required fields', async () => {
      // Arrange
      const attributes = { website: 'https://test.com' }; // Missing required name

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(InvalidCompanyDataError);
    });

    it('should validate field types', async () => {
      // Arrange
      const attributes = { name: 123 }; // Name should be string

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(InvalidCompanyDataError);
    });

    it('should validate URL fields', async () => {
      // Arrange
      const attributes = { 
        name: 'Test Company',
        website: 'not-a-valid-url' 
      };

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(InvalidCompanyDataError);
    });

    it('should handle errors when creating a company', async () => {
      // Arrange
      const attributes = { name: 'Test Company' };
      const error = new Error('API Error');
      mockedRecords.createObjectRecord.mockRejectedValue(error);

      // Act & Assert
      await expect(createCompany(attributes)).rejects.toThrow(CompanyOperationError);
    });
  });

  describe('updateCompany', () => {
    it('should update an existing company', async () => {
      // Arrange
      const companyId = 'company123';
      const attributes = {
        name: 'Updated Company',
        industry: 'Finance'
      };
      const mockResponse = {
        id: { record_id: companyId },
        values: {
          name: [{ value: 'Updated Company' }],
          industry: [{ value: 'Finance' }]
        }
      };
      mockedRecords.updateObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await updateCompany(companyId, attributes);

      // Assert
      expect(mockedRecords.updateObjectRecord).toHaveBeenCalledWith(
        'companies',
        companyId,
        {
          name: { value: 'Updated Company' },
          industry: { value: 'Finance' }
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
      await expect(updateCompany(companyId, attributes)).rejects.toThrow('Update failed');
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
          industry: [{ value: 'Healthcare' }]
        }
      };
      mockedRecords.updateObjectRecord.mockResolvedValue(mockResponse);

      // Act
      const result = await updateCompanyAttribute(companyId, attributeName, attributeValue);

      // Assert
      expect(mockedRecords.updateObjectRecord).toHaveBeenCalledWith(
        'companies',
        companyId,
        { [attributeName]: { value: attributeValue } }
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
      await expect(updateCompanyAttribute(companyId, attributeName, attributeValue))
        .rejects.toThrow('Attribute update failed');
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