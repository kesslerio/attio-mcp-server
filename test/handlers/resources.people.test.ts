import { registerResourceHandlers } from '../../src/handlers/resources.js';
import * as companiesModule from '../../src/objects/companies.js';
import * as peopleModule from '../../src/objects/people.js';
import * as errorHandler from '../../src/utils/error-handler.js';

// Mock dependencies
jest.mock('../../src/objects/companies.js');
jest.mock('../../src/objects/people.js');
jest.mock('../../src/utils/error-handler.js');

describe('resources-people', () => {
  describe('registerResourceHandlers - People', () => {
    let mockServer: any;
    const mockedPeople = peopleModule as jest.Mocked<typeof peopleModule>;
    const mockedErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
      
      // Setup mock server
      mockServer = {
        setRequestHandler: jest.fn(),
      };
    });

    it('should handle list resources request for people successfully', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Get the handler function
      const [_, listResourcesHandler] = mockServer.setRequestHandler.mock.calls[0];
      
      // Create sample data for the test
      const mockPeople = [
        { id: { record_id: 'person1' }, values: { name: [{ value: 'Person A' }] } },
        { id: { record_id: 'person2' }, values: { name: [{ value: 'Person B' }] } }
      ];
      
      // Set up our mock to return this data
      mockedPeople.listPeople.mockResolvedValue(mockPeople);
      
      // Call the handler with a request for people
      const result = await listResourcesHandler({
        params: { type: 'people' }
      });
      
      // Assert
      expect(mockedPeople.listPeople).toHaveBeenCalled();
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('description');
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toHaveProperty('uri', 'attio://people/person1');
      expect(result.resources[0]).toHaveProperty('name', 'Person A');
    });

    it('should handle errors in list people resources request', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Get the handler function
      const [_, listResourcesHandler] = mockServer.setRequestHandler.mock.calls[0];
      
      // Setup mock error
      const mockError = new Error('Failed to list people');
      mockedPeople.listPeople.mockRejectedValue(mockError);
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Call the handler with a request for people
      const result = await listResourcesHandler({
        params: { type: 'people' }
      });
      
      // Assert
      expect(mockedPeople.listPeople).toHaveBeenCalled();
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalledWith(
        mockError,
        "/objects/people/records/query",
        "POST",
        {}
      );
      expect(result).toBe(mockErrorResult);
    });

    it('should handle read resource request for people', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Get the ReadResourceRequestSchema handler (second call to setRequestHandler)
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Create sample data for the test
      const mockPerson = { 
        id: { record_id: 'person1' }, 
        values: { name: [{ value: 'Person A' }] } 
      };
      
      // Set up our mock to return this data
      mockedPeople.getPersonDetails.mockResolvedValue(mockPerson);
      
      // Call the handler with a people URI
      const result = await readResourceHandler({
        params: { uri: 'attio://people/person1' }
      });
      
      // Assert
      expect(mockedPeople.getPersonDetails).toHaveBeenCalledWith('person1');
      expect(result).toHaveProperty('contents');
      expect(result.contents[0]).toHaveProperty('uri', 'attio://people/person1');
      expect(result.contents[0]).toHaveProperty('text', JSON.stringify(mockPerson, null, 2));
    });

    it('should handle errors in read person resource request', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Get the ReadResourceRequestSchema handler (second call to setRequestHandler)
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Setup mock error
      const mockError = new Error('Failed to get person details');
      mockedPeople.getPersonDetails.mockRejectedValue(mockError);
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Call the handler with a people URI
      const result = await readResourceHandler({
        params: { uri: 'attio://people/person1' }
      });
      
      // Assert
      expect(mockedPeople.getPersonDetails).toHaveBeenCalledWith('person1');
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalled();
      expect(result).toBe(mockErrorResult);
    });

    it('should handle unsupported resource types', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Get the ReadResourceRequestSchema handler (second call to setRequestHandler)
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Call the handler with an unsupported URI
      const result = await readResourceHandler({
        params: { uri: 'attio://unsupported/123' }
      });
      
      // Assert
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalledWith(
        expect.any(Error),
        "attio://unsupported/123",
        "GET",
        {}
      );
      expect(result).toBe(mockErrorResult);
    });
  });
});