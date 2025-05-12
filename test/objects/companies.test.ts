import { searchCompanies, listCompanies, getCompanyDetails, getCompanyNotes, createCompanyNote } from '../../src/objects/companies.js';
import * as attioClient from '../../src/api/attio-client.js';

// Mock the API client
jest.mock('../../src/api/attio-client.js');
const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;

describe('companies', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Setup mock API client
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
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

      // Act & Assert
      await expect(searchCompanies(query)).rejects.toThrow('API Error');
    });
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
});