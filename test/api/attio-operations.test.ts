import { 
  searchObject,
  listObjects,
  getObjectDetails,
  getObjectNotes,
  createObjectNote
} from '../../src/api/attio-operations';
import { getAttioClient } from '../../src/api/attio-client';
import { ResourceType, Person, Company } from '../../src/types/attio';

// Mock the axios client
jest.mock('../../src/api/attio-client', () => ({
  getAttioClient: jest.fn(),
}));

describe('Attio Operations', () => {
  // Sample mock data
  const mockPerson: Person = {
    id: {
      record_id: 'person123'
    },
    values: {
      name: [{ value: 'John Doe' }],
      email: [{ value: 'john.doe@example.com' }],
      phone: [{ value: '+1234567890' }]
    }
  };

  const mockCompany: Company = {
    id: {
      record_id: 'company123'
    },
    values: {
      name: [{ value: 'Acme Inc' }]
    }
  };

  // Mock API client
  const mockApiClient = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAttioClient as jest.Mock).mockReturnValue(mockApiClient);
  });

  describe('searchObject', () => {
    it('should search for people by name, email, or phone number', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await searchObject<Person>(ResourceType.PEOPLE, 'John');

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          '$or': [
            { name: { '$contains': 'John' } },
            { email: { '$contains': 'John' } },
            { phone: { '$contains': 'John' } }
          ]
        }
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should search for companies by name only', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockCompany]
        }
      });

      // Call the function
      const result = await searchObject<Company>(ResourceType.COMPANIES, 'Acme');

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/companies/records/query', {
        filter: {
          name: { '$contains': 'Acme' }
        }
      });
      expect(result).toEqual([mockCompany]);
    });

    it('should handle 404 errors with custom message', async () => {
      // Setup mock error
      mockApiClient.post.mockRejectedValueOnce({
        response: {
          status: 404
        }
      });

      // Call and check for error
      await expect(searchObject(ResourceType.PEOPLE, 'Nonexistent'))
        .rejects.toThrow(`No ${ResourceType.PEOPLE} found matching 'Nonexistent'`);
    });

    it('should propagate other errors', async () => {
      // Setup mock error
      const error = new Error('Network error');
      mockApiClient.post.mockRejectedValueOnce(error);

      // Call and check for error
      await expect(searchObject(ResourceType.PEOPLE, 'Test'))
        .rejects.toThrow('Network error');
    });
  });

  describe('listObjects', () => {
    it('should list objects with default limit', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await listObjects<Person>(ResourceType.PEOPLE);

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        limit: 20,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should list objects with custom limit', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockCompany]
        }
      });

      // Call the function
      const result = await listObjects<Company>(ResourceType.COMPANIES, 5);

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/companies/records/query', {
        limit: 5,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      expect(result).toEqual([mockCompany]);
    });
  });

  describe('getObjectDetails', () => {
    it('should get details for a specific record', async () => {
      // Setup mock response
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          data: mockPerson
        }
      });

      // Call the function
      const result = await getObjectDetails<Person>(ResourceType.PEOPLE, 'person123');

      // Assertions
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/people/records/person123');
      expect(result).toEqual(mockPerson);
    });

    it('should handle records without data field', async () => {
      // Setup mock response with no data field
      mockApiClient.get.mockResolvedValueOnce({
        data: mockPerson // No nested data field
      });

      // Call the function
      const result = await getObjectDetails<Person>(ResourceType.PEOPLE, 'person123');

      // Assertions
      expect(result).toEqual(mockPerson);
    });
  });
});