import { 
  searchObject,
  listObjects,
  getObjectDetails,
  getObjectNotes,
  createObjectNote,
  getListEntries
} from '../../src/api/attio-operations';
import { getAttioClient } from '../../src/api/attio-client';
import { ResourceType, Person, Company, AttioListEntry } from '../../src/types/attio';

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

      // Mock the retry functionality to immediately return to avoid timeouts
      jest.mock('../../src/api/attio-operations', () => {
        const actual = jest.requireActual('../../src/api/attio-operations');
        return {
          ...actual,
          callWithRetry: (fn: any) => fn()
        };
      });

      // Call and check for error
      await expect(searchObject(ResourceType.PEOPLE, 'Nonexistent', { maxRetries: 0 }))
        .rejects.toThrow(`No ${ResourceType.PEOPLE} found matching 'Nonexistent'`);
    }, 10000); // Increase timeout to 10 seconds

    it('should propagate other errors', async () => {
      // Setup mock error
      const error = new Error('Network error');
      mockApiClient.post.mockRejectedValueOnce(error);

      // Call and check for error
      await expect(searchObject(ResourceType.PEOPLE, 'Test', { maxRetries: 0 }))
        .rejects.toThrow('Network error');
    }, 10000); // Increase timeout to 10 seconds
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

  describe('getListEntries', () => {
    it('should fetch list entries with the record expansion parameter', async () => {
      // Arrange
      const listId = 'list123';
      const mockEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' },
        { id: { entry_id: 'entry2' }, record_id: 'record2' }
      ];
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockEntries }
      });

      // Act
      const result = await getListEntries(listId);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists/list123/entries/query', {
        limit: 20,
        offset: 0,
        expand: ["record"]
      });
      expect(result).toEqual(mockEntries);
    });

    it('should support filtering by list attributes', async () => {
      // Arrange
      const listId = 'list123';
      const mockFilteredEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' }
      ];
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockFilteredEntries }
      });

      // Create filter for "stage equals Discovery"
      const filters = {
        filters: [
          {
            attribute: {
              slug: 'stage'
            },
            condition: 'equals',
            value: 'Discovery'
          }
        ]
      };

      // Act
      const result = await getListEntries(listId, 20, 0, filters);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists/list123/entries/query', {
        limit: 20,
        offset: 0,
        expand: ["record"],
        filter: {
          stage: {
            '$equals': 'Discovery'
          }
        }
      });
      expect(result).toEqual(mockFilteredEntries);
    });

    it('should support multiple filter conditions', async () => {
      // Arrange
      const listId = 'list123';
      const mockFilteredEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' }
      ];
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockFilteredEntries }
      });

      // Create filter for "stage equals Discovery AND value greater_than 50000"
      const filters = {
        filters: [
          {
            attribute: {
              slug: 'stage'
            },
            condition: 'equals',
            value: 'Discovery'
          },
          {
            attribute: {
              slug: 'value'
            },
            condition: 'greater_than',
            value: 50000
          }
        ]
      };

      // Act
      const result = await getListEntries(listId, 20, 0, filters);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists/list123/entries/query', {
        limit: 20,
        offset: 0,
        expand: ["record"],
        filter: {
          stage: {
            '$equals': 'Discovery'
          },
          value: {
            '$greater_than': 50000
          }
        }
      });
      expect(result).toEqual(mockFilteredEntries);
    });

    it('should not use the GET fallback when filters are provided', async () => {
      // Arrange
      const listId = 'list123';
      const mockFilteredEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' }
      ];
      
      // Mock first endpoint to fail
      mockApiClient.post
        .mockRejectedValueOnce(new Error('Primary endpoint failed'))
        .mockResolvedValueOnce({
          data: { data: mockFilteredEntries }
        });

      // Create filter for "stage equals Discovery"
      const filters = {
        filters: [
          {
            attribute: {
              slug: 'stage'
            },
            condition: 'equals',
            value: 'Discovery'
          }
        ]
      };

      // Act
      const result = await getListEntries(listId, 20, 0, filters);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists/list123/entries/query', {
        limit: 20,
        offset: 0,
        expand: ["record"],
        filter: {
          stage: {
            '$equals': 'Discovery'
          }
        }
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists-entries/query', {
        list_id: 'list123',
        limit: 20,
        offset: 0,
        expand: ["record"],
        filter: {
          stage: {
            '$equals': 'Discovery'
          }
        }
      });
      // GET should not be called
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockFilteredEntries);
    });

    it('should extract record_id from nested record structure', async () => {
      // Arrange
      const listId = 'list123';
      
      // Mock entries with nested record structure but missing direct record_id
      const mockNestedEntries = [
        { 
          id: { entry_id: 'entry1' }, 
          record: { id: { record_id: 'record1' } }
        },
        { 
          id: { entry_id: 'entry2' }, 
          record: { 
            id: { record_id: 'record2' },
            values: { name: [{ value: 'Company ABC' }] }
          }
        }
      ];
      
      mockApiClient.post.mockResolvedValueOnce({
        data: { data: mockNestedEntries }
      });

      // Act
      const result = await getListEntries(listId);

      // Assert
      expect(result[0].record_id).toBe('record1');
      expect(result[1].record_id).toBe('record2');
    });

    it('should try fallback endpoints if primary endpoint fails', async () => {
      // Arrange
      const listId = 'list123';
      const mockEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' },
        { id: { entry_id: 'entry2' }, record_id: 'record2' }
      ];
      
      // Mock first endpoint to fail
      mockApiClient.post
        .mockRejectedValueOnce(new Error('Primary endpoint failed'))
        .mockResolvedValueOnce({
          data: { data: mockEntries }
        });

      // Act
      const result = await getListEntries(listId);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists/list123/entries/query', {
        limit: 20,
        offset: 0,
        expand: ["record"]
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/lists-entries/query', {
        list_id: 'list123',
        limit: 20,
        offset: 0,
        expand: ["record"]
      });
      expect(result).toEqual(mockEntries);
    });

    it('should try the last fallback endpoint if others fail', async () => {
      // Arrange
      const listId = 'list123';
      const mockEntries = [
        { id: { entry_id: 'entry1' }, record_id: 'record1' },
        { id: { entry_id: 'entry2' }, record_id: 'record2' }
      ];
      
      // Mock first and second endpoints to fail
      mockApiClient.post
        .mockRejectedValueOnce(new Error('Primary endpoint failed'))
        .mockRejectedValueOnce(new Error('Secondary endpoint failed'));
      
      // Mock GET for the last fallback
      mockApiClient.get.mockResolvedValueOnce({
        data: { data: mockEntries }
      });

      // Act
      const result = await getListEntries(listId);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      // Use URLSearchParams to ensure consistent parameter order
      const params = new URLSearchParams();
      params.append('list_id', 'list123');
      params.append('expand', 'record');
      params.append('limit', '20');
      params.append('offset', '0');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/lists-entries?${params.toString()}`
      );
      expect(result).toEqual(mockEntries);
    });
  });
});