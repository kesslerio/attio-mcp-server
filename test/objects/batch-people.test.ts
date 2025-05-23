import {
  batchSearchPeople,
  batchGetPeopleDetails,
} from '../../src/objects/people';
import * as attioOperations from '../../src/api/operations/index';
import { getAttioClient } from '../../src/api/attio-client';
import { Person } from '../../src/types/attio';

// Mock the attio-operations module
vi.mock('../../src/api/operations/index');
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(),
}));

describe('People Batch Operations', () => {
  // Sample mock data
  const mockPerson1: Person = {
    id: {
      record_id: 'person123',
    },
    values: {
      name: [{ value: 'John Doe' }],
      email: [{ value: 'john.doe@example.com' }],
      phone: [{ value: '+1234567890' }],
    },
  };

  const mockPerson2: Person = {
    id: {
      record_id: 'person456',
    },
    values: {
      name: [{ value: 'Jane Smith' }],
      email: [{ value: 'jane.smith@example.com' }],
      phone: [{ value: '+0987654321' }],
    },
  };

  // Mock API client
  const mockApiClient = {
    post: vi.fn(),
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAttioClient as vi.Mock).mockReturnValue(mockApiClient);
  });

  describe('batchSearchPeople', () => {
    it('should call batchSearchObjects with correct parameters', async () => {
      // Setup mock response
      const mockResponse = {
        results: [
          { id: 'search_people_0', success: true, data: [mockPerson1] },
          { id: 'search_people_1', success: true, data: [mockPerson2] },
        ],
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0,
        },
      };

      // Mock the batchSearchObjects function
      (attioOperations.batchSearchObjects as vi.Mock).mockResolvedValue(
        mockResponse
      );

      // Call the function
      const result = await batchSearchPeople(['John', 'Jane']);

      // Assertions
      expect(attioOperations.batchSearchObjects).toHaveBeenCalledWith(
        'people',
        ['John', 'Jane'],
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors using fallback implementation', async () => {
      // Mock batchSearchObjects to fail
      (attioOperations.batchSearchObjects as vi.Mock).mockImplementation(() => {
        throw new Error('Batch operation failed');
      });

      // Mock the searchPeople for individual searches in the fallback
      vi.spyOn(require('../../src/objects/people'), 'searchPeople')
        .mockResolvedValueOnce([mockPerson1])
        .mockRejectedValueOnce(new Error('Search failed'));

      // Call the function
      const result = await batchSearchPeople(['John', 'Jane']);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(2);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual([mockPerson1]);

      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('Search failed');
    });
  });

  describe('batchGetPeopleDetails', () => {
    it('should call batchGetObjectDetails with correct parameters', async () => {
      // Setup mock response
      const mockResponse = {
        results: [
          { id: 'get_people_person123', success: true, data: mockPerson1 },
          { id: 'get_people_person456', success: true, data: mockPerson2 },
        ],
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0,
        },
      };

      // Mock the batchGetObjectDetails function
      (attioOperations.batchGetObjectDetails as vi.Mock).mockResolvedValue(
        mockResponse
      );

      // Call the function
      const result = await batchGetPeopleDetails(['person123', 'person456']);

      // Assertions
      expect(attioOperations.batchGetObjectDetails).toHaveBeenCalledWith(
        'people',
        ['person123', 'person456'],
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors using fallback implementation', async () => {
      // Mock batchGetObjectDetails to fail
      (attioOperations.batchGetObjectDetails as vi.Mock).mockImplementation(
        () => {
          throw new Error('Batch operation failed');
        }
      );

      // Mock the getPersonDetails for individual gets in the fallback
      vi.spyOn(require('../../src/objects/people'), 'getPersonDetails')
        .mockResolvedValueOnce(mockPerson1)
        .mockRejectedValueOnce(new Error('Person not found'));

      // Call the function
      const result = await batchGetPeopleDetails(['person123', 'nonexistent']);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(2);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual(mockPerson1);

      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('Person not found');
    });
  });
});
