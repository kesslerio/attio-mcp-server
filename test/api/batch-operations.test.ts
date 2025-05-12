import { 
  executeBatchOperations,
  batchSearchObjects,
  batchGetObjectDetails,
  DEFAULT_BATCH_CONFIG,
  BatchRequestItem,
  BatchResponse
} from '../../src/api/attio-operations';
import { getAttioClient } from '../../src/api/attio-client';
import { ResourceType, Person, Company } from '../../src/types/attio';

// Mock the axios client
jest.mock('../../src/api/attio-client', () => ({
  getAttioClient: jest.fn(),
}));

describe('Batch Operations', () => {
  // Sample mock data
  const mockPerson1: Person = {
    id: {
      record_id: 'person123'
    },
    values: {
      name: [{ value: 'John Doe' }],
      email: [{ value: 'john.doe@example.com' }],
      phone: [{ value: '+1234567890' }]
    }
  };

  const mockPerson2: Person = {
    id: {
      record_id: 'person456'
    },
    values: {
      name: [{ value: 'Jane Smith' }],
      email: [{ value: 'jane.smith@example.com' }],
      phone: [{ value: '+0987654321' }]
    }
  };

  const mockCompany1: Company = {
    id: {
      record_id: 'company123'
    },
    values: {
      name: [{ value: 'Acme Inc' }]
    }
  };

  const mockCompany2: Company = {
    id: {
      record_id: 'company456'
    },
    values: {
      name: [{ value: 'Globex Corp' }]
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

  describe('executeBatchOperations', () => {
    it('should execute multiple operations and return results', async () => {
      // Mock operation function
      const mockOperation = jest.fn()
        .mockResolvedValueOnce('Result 1')
        .mockResolvedValueOnce('Result 2')
        .mockResolvedValueOnce('Result 3');

      // Create batch request items
      const operations: BatchRequestItem<string>[] = [
        { params: 'param1', id: 'op1' },
        { params: 'param2', id: 'op2' },
        { params: 'param3', id: 'op3' }
      ];

      // Execute batch operations
      const result = await executeBatchOperations<string, string>(
        operations,
        mockOperation
      );

      // Assertions
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockOperation).toHaveBeenCalledWith('param1');
      expect(mockOperation).toHaveBeenCalledWith('param2');
      expect(mockOperation).toHaveBeenCalledWith('param3');
      
      // Check results structure
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(3);
      
      // Check individual results
      expect(result.results[0]).toEqual({
        id: 'op1',
        success: true,
        data: 'Result 1'
      });
      expect(result.results[1]).toEqual({
        id: 'op2',
        success: true,
        data: 'Result 2'
      });
      expect(result.results[2]).toEqual({
        id: 'op3',
        success: true,
        data: 'Result 3'
      });
    });

    it('should handle operation failures with continueOnError=true', async () => {
      // Mock operation function with one failure
      const mockOperation = jest.fn()
        .mockResolvedValueOnce('Result 1')
        .mockRejectedValueOnce(new Error('Operation 2 failed'))
        .mockResolvedValueOnce('Result 3');

      // Create batch request items
      const operations: BatchRequestItem<string>[] = [
        { params: 'param1', id: 'op1' },
        { params: 'param2', id: 'op2' },
        { params: 'param3', id: 'op3' }
      ];

      // Execute batch operations with continueOnError=true
      const result = await executeBatchOperations<string, string>(
        operations,
        mockOperation,
        { continueOnError: true }
      );

      // Assertions
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      // Check results structure
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(3);
      
      // Check individual results
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toBe('Result 1');
      
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('Operation 2 failed');
      
      expect(result.results[2].success).toBe(true);
      expect(result.results[2].data).toBe('Result 3');
    });

    it('should stop on first error when continueOnError=false', async () => {
      // Mock operation function with one failure
      const mockOperation = jest.fn()
        .mockResolvedValueOnce('Result 1')
        .mockRejectedValueOnce(new Error('Operation 2 failed'))
        .mockResolvedValueOnce('Result 3');

      // Create batch request items
      const operations: BatchRequestItem<string>[] = [
        { params: 'param1', id: 'op1' },
        { params: 'param2', id: 'op2' },
        { params: 'param3', id: 'op3' }
      ];

      // Execute batch operations with continueOnError=false
      await expect(executeBatchOperations<string, string>(
        operations,
        mockOperation,
        { continueOnError: false }
      )).rejects.toThrow('Operation 2 failed');

      // Should have called only the first two operations
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should process operations in chunks based on maxBatchSize', async () => {
      // Mock operation function
      const mockOperation = jest.fn()
        .mockImplementation((param) => Promise.resolve(`Result for ${param}`));

      // Create 10 batch request items
      const operations: BatchRequestItem<string>[] = Array.from({ length: 10 }, (_, i) => ({
        params: `param${i + 1}`,
        id: `op${i + 1}`
      }));

      // Execute batch operations with maxBatchSize=3
      const result = await executeBatchOperations<string, string>(
        operations,
        mockOperation,
        { maxBatchSize: 3 }
      );

      // Assertions
      expect(mockOperation).toHaveBeenCalledTimes(10);
      expect(result.summary.total).toBe(10);
      expect(result.summary.succeeded).toBe(10);
      expect(result.results.length).toBe(10);
    });
  });

  describe('batchSearchObjects', () => {
    it('should perform batch search for people', async () => {
      // Mock the searchObject response by mocking post
      mockApiClient.post
        .mockResolvedValueOnce({ data: { data: [mockPerson1] } })
        .mockResolvedValueOnce({ data: { data: [mockPerson2] } });

      // Call the function
      const result = await batchSearchObjects<Person>(
        ResourceType.PEOPLE,
        ['John', 'Jane']
      );

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          '$or': [
            { name: { '$contains': 'John' } },
            { email: { '$contains': 'John' } },
            { phone: { '$contains': 'John' } }
          ]
        }
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/people/records/query', {
        filter: {
          '$or': [
            { name: { '$contains': 'Jane' } },
            { email: { '$contains': 'Jane' } },
            { phone: { '$contains': 'Jane' } }
          ]
        }
      });

      // Check results
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(2);
      expect(result.results[0].data).toEqual([mockPerson1]);
      expect(result.results[1].data).toEqual([mockPerson2]);
    });

    it('should perform batch search for companies', async () => {
      // Mock the searchObject response by mocking post
      mockApiClient.post
        .mockResolvedValueOnce({ data: { data: [mockCompany1] } })
        .mockResolvedValueOnce({ data: { data: [mockCompany2] } });

      // Call the function
      const result = await batchSearchObjects<Company>(
        ResourceType.COMPANIES,
        ['Acme', 'Globex']
      );

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/companies/records/query', {
        filter: {
          name: { '$contains': 'Acme' }
        }
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/objects/companies/records/query', {
        filter: {
          name: { '$contains': 'Globex' }
        }
      });

      // Check results
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(2);
      expect(result.results[0].data).toEqual([mockCompany1]);
      expect(result.results[1].data).toEqual([mockCompany2]);
    });

    it('should handle mixed success and failure in batch search', async () => {
      // Mock the searchObject response with one success and one failure
      mockApiClient.post
        .mockResolvedValueOnce({ data: { data: [mockPerson1] } })
        .mockRejectedValueOnce(new Error('Search failed'));

      // Call the function
      const result = await batchSearchObjects<Person>(
        ResourceType.PEOPLE,
        ['John', 'Unknown']
      );

      // Assertions
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      
      // Check results
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

  describe('batchGetObjectDetails', () => {
    it('should get details for multiple people', async () => {
      // Mock the getObjectDetails response by mocking get
      mockApiClient.get
        .mockResolvedValueOnce({ data: { data: mockPerson1 } })
        .mockResolvedValueOnce({ data: { data: mockPerson2 } });

      // Call the function
      const result = await batchGetObjectDetails<Person>(
        ResourceType.PEOPLE,
        ['person123', 'person456']
      );

      // Assertions
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/people/records/person123');
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/people/records/person456');

      // Check results
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(2);
      expect(result.results[0].data).toEqual(mockPerson1);
      expect(result.results[1].data).toEqual(mockPerson2);
    });

    it('should get details for multiple companies', async () => {
      // Mock the getObjectDetails response by mocking get
      mockApiClient.get
        .mockResolvedValueOnce({ data: { data: mockCompany1 } })
        .mockResolvedValueOnce({ data: { data: mockCompany2 } });

      // Call the function
      const result = await batchGetObjectDetails<Company>(
        ResourceType.COMPANIES,
        ['company123', 'company456']
      );

      // Assertions
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/companies/records/company123');
      expect(mockApiClient.get).toHaveBeenCalledWith('/objects/companies/records/company456');

      // Check results
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(2);
      expect(result.results[0].data).toEqual(mockCompany1);
      expect(result.results[1].data).toEqual(mockCompany2);
    });

    it('should handle missing records in batch get', async () => {
      // Mock the getObjectDetails response with one success and one 404 error
      mockApiClient.get
        .mockResolvedValueOnce({ data: { data: mockPerson1 } })
        .mockRejectedValueOnce({
          response: {
            status: 404,
            data: { message: 'Person not found' }
          }
        });

      // Call the function
      const result = await batchGetObjectDetails<Person>(
        ResourceType.PEOPLE,
        ['person123', 'nonexistent']
      );

      // Assertions
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      
      // Check results
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(2);
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual(mockPerson1);
      
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
    });
  });
});