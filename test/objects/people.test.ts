import { searchPeople, searchPeopleByEmail, searchPeopleByPhone, listPeople, getPersonDetails } from '../../src/objects/people';
import { getAttioClient } from '../../src/api/attio-client';
import { Person } from '../../src/types/attio';

// Mock the axios client
jest.mock('../../src/api/attio-client', () => ({
  getAttioClient: jest.fn(),
}));

describe('People API functions', () => {
  // Sample mock data
  const mockPerson: Person = {
    id: {
      record_id: 'abc123'
    },
    values: {
      name: [{ value: 'John Doe' }],
      email: [{ value: 'john.doe@example.com' }],
      phone: [{ value: '+1234567890' }]
    }
  };

  // Mock API client
  const mockApiClient = {
    post: jest.fn(),
    get: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAttioClient as jest.Mock).mockReturnValue(mockApiClient);
  });

  describe('searchPeople', () => {
    it('should search for people by name, email or phone', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await searchPeople('John');

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          "$or": [
            { name: { "$contains": "John" } },
            { email_addresses: { "$contains": "John" } }
          ]
        },
        limit: 50
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should return empty array when no results found', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: []
        }
      });

      // Call the function
      const result = await searchPeople('Nonexistent');

      // Assertions
      expect(result).toEqual([]);

    });

    it('should handle API errors', async () => {
      // Setup mock error with response data
      const mockError = new Error('API error');
      Object.defineProperty(mockError, 'response', {
        value: { data: { error: 'Not found' } }
      });
      
      mockApiClient.post.mockRejectedValueOnce(mockError);

      // Call and check for error
      await expect(searchPeople('Error test')).rejects.toThrow('API error');
    });
  });

  describe('searchPeopleByEmail', () => {
    it('should search for people by email', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await searchPeopleByEmail('john.doe@example.com');

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          "$or": [
            { name: { "$contains": "john.doe@example.com" } },
            { email: { "$contains": "john.doe@example.com" } },
            { phone: { "$contains": "john.doe@example.com" } }
          ]
        }
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should return empty array when no results found', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: []
        }
      });

      // Call the function
      const result = await searchPeopleByEmail('nonexistent@example.com');

      // Assertions
      expect(result).toEqual([]);
    });
  });

  describe('searchPeopleByPhone', () => {
    it('should search for people by phone number', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await searchPeopleByPhone('+1234567890');

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          "$or": [
            { name: { "$contains": "+1234567890" } },
            { email: { "$contains": "+1234567890" } },
            { phone: { "$contains": "+1234567890" } }
          ]
        }
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should return empty array when no results found', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: []
        }
      });

      // Call the function
      const result = await searchPeopleByPhone('+9999999999');

      // Assertions
      expect(result).toEqual([]);
    });
  });

  describe('listPeople', () => {
    it('should list people with default limit', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await listPeople();

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        limit: 20,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      expect(result).toEqual([mockPerson]);
    });

    it('should list people with custom limit', async () => {
      // Setup mock response
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          data: [mockPerson]
        }
      });

      // Call the function
      const result = await listPeople(5);

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        limit: 5,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      expect(result).toEqual([mockPerson]);
    });
  });

  describe('getPersonDetails', () => {
    it('should get details for a specific person', async () => {
      // Setup mock response
      mockApiClient.get.mockResolvedValueOnce({
        data: mockPerson
      });

      // Call the function
      const result = await getPersonDetails('abc123');

      // Assertions
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/people/records/abc123');
      expect(result).toEqual(mockPerson);
    });

    it('should handle API errors', async () => {
      // Setup mock error with response data
      const mockError = new Error('Not found');
      Object.defineProperty(mockError, 'response', {
        value: { data: { error: 'Not found' } }
      });
      
      mockApiClient.get.mockRejectedValueOnce(mockError);

      // Call and check for error
      await expect(getPersonDetails('nonexistent')).rejects.toThrow('Not found');
    });
  });
});