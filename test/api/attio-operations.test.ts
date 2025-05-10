import { 
  searchObject, 
  listObjects, 
  getObjectDetails,
  getObjectNotes,
  createObjectNote
} from '../../src/api/attio-operations.js';
import * as attioClient from '../../src/api/attio-client.js';
import { ResourceType } from '../../src/types/attio.js';

// Mock dependencies
jest.mock('../../src/api/attio-client.js');

describe('attio-operations', () => {
  // Mock data
  const mockPeopleData = [
    {
      id: { record_id: 'person1' },
      values: { 
        name: [{ value: 'John Doe' }],
        email: [{ value: 'john@example.com' }],
        phone: [{ value: '+1234567890' }]
      }
    },
    {
      id: { record_id: 'person2' },
      values: { 
        name: [{ value: 'Jane Smith' }],
        email: [{ value: 'jane@example.com' }],
        phone: [{ value: '+0987654321' }]
      }
    }
  ];

  const mockCompaniesData = [
    {
      id: { record_id: 'company1' },
      values: { name: [{ value: 'Acme Corp' }] }
    },
    {
      id: { record_id: 'company2' },
      values: { name: [{ value: 'Globex Inc' }] }
    }
  ];

  let mockAxiosInstance: any;
  const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Setup mock API client
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
  });

  describe('searchObject', () => {
    it('should search people across multiple fields when object type is people', async () => {
      // Arrange
      const query = 'john';
      const mockResponse = {
        data: {
          data: [mockPeopleData[0]]
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await searchObject(ResourceType.PEOPLE, query);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            "$or": [
              { name: { "$contains": query } },
              { email: { "$contains": query } },
              { phone: { "$contains": query } }
            ]
          }
        })
      );
      expect(result).toEqual([mockPeopleData[0]]);
    });

    it('should search companies by name only when object type is companies', async () => {
      // Arrange
      const query = 'acme';
      const mockResponse = {
        data: {
          data: [mockCompaniesData[0]]
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await searchObject(ResourceType.COMPANIES, query);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            name: { "$contains": query }
          }
        })
      );
      expect(result).toEqual([mockCompaniesData[0]]);
    });

    it('should handle 404 errors correctly', async () => {
      // Arrange
      const query = 'nonexistent';
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 404
        }
      });

      // Act & Assert
      await expect(searchObject(ResourceType.PEOPLE, query))
        .rejects.toThrow(`No people found matching '${query}'`);
    });

    it('should pass through other errors', async () => {
      // Arrange
      const query = 'test';
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(searchObject(ResourceType.PEOPLE, query))
        .rejects.toThrow('Network error');
    });
  });

  // Tests for other operations could be added here...
});