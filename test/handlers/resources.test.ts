import { registerResourceHandlers } from '../../src/handlers/resources.js';
import * as companiesModule from '../../src/objects/companies.js';
import * as peopleModule from '../../src/objects/people.js';
import * as errorHandler from '../../src/utils/error-handler.js';
import { ResourceType } from '../../src/types/attio.js';
import { parseResourceUri } from '../../src/utils/uri-parser.js';

// Mock dependencies
jest.mock('../../src/objects/companies.js');
jest.mock('../../src/objects/people.js');
jest.mock('../../src/utils/error-handler.js');
jest.mock('../../src/utils/uri-parser.js');

describe('resources', () => {
  describe('registerResourceHandlers', () => {
    let mockServer: any;
    const mockedCompanies = companiesModule as jest.Mocked<typeof companiesModule>;
    const mockedPeople = peopleModule as jest.Mocked<typeof peopleModule>;
    const mockedErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
    const mockedParseResourceUri = parseResourceUri as jest.MockedFunction<typeof parseResourceUri>;

    // Mock data
    const mockCompanies = [
      {
        id: { record_id: 'company1' },
        values: { name: [{ value: 'Acme Corp' }] }
      },
      {
        id: { record_id: 'company2' },
        values: { name: [{ value: 'Globex Inc' }] }
      }
    ];

    const mockPeople = [
      {
        id: { record_id: 'person1' },
        values: { name: [{ value: 'John Doe' }] }
      },
      {
        id: { record_id: 'person2' },
        values: { name: [{ value: 'Jane Smith' }] }
      }
    ];

    const mockCompanyDetails = {
      id: { record_id: 'company1' },
      values: {
        name: [{ value: 'Acme Corp' }],
        industry: [{ value: 'Technology' }],
        website: [{ value: 'https://acme.example.com' }]
      }
    };

    const mockPersonDetails = {
      id: { record_id: 'person1' },
      values: {
        name: [{ value: 'John Doe' }],
        email: [{ value: 'john@example.com' }],
        phone: [{ value: '+1234567890' }]
      }
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
      
      // Setup mock server
      mockServer = {
        setRequestHandler: jest.fn(),
      };
    });

    it('should register handlers for ListResourcesRequestSchema and ReadResourceRequestSchema', () => {
      // Act
      registerResourceHandlers(mockServer);
      
      // Assert
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle list companies request successfully', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Create sample data for the test
      mockedCompanies.listCompanies.mockResolvedValue(mockCompanies);
      
      // Get the first handler function that was registered
      const listResourcesHandler = mockServer.setRequestHandler.mock.calls[0][1];
      
      // Call the handler with a request for companies
      const result = await listResourcesHandler({ params: { type: ResourceType.COMPANIES } });
      
      // Assert
      expect(mockedCompanies.listCompanies).toHaveBeenCalled();
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('description');
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toHaveProperty('uri');
      expect(result.resources[0]).toHaveProperty('name');
      expect(result.resources[0]).toHaveProperty('mimeType', 'application/json');
    });

    it('should handle list people request successfully', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Create sample data for the test
      mockedPeople.listPeople.mockResolvedValue(mockPeople);
      
      // Get the list resources handler function
      const listResourcesHandler = mockServer.setRequestHandler.mock.calls[0][1];
      
      // Call the handler with a request for people
      const result = await listResourcesHandler({ params: { type: ResourceType.PEOPLE } });
      
      // Assert
      expect(mockedPeople.listPeople).toHaveBeenCalled();
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('description');
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toHaveProperty('uri');
      expect(result.resources[0]).toHaveProperty('name');
      expect(result.resources[0]).toHaveProperty('mimeType', 'application/json');
    });

    it('should handle errors in list companies request', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Setup mock error
      const mockError = new Error('Failed to list companies');
      mockedCompanies.listCompanies.mockRejectedValue(mockError);
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Get the list resources handler function
      const listResourcesHandler = mockServer.setRequestHandler.mock.calls[0][1];
      
      // Call the handler with a request for companies
      const result = await listResourcesHandler({ params: { type: ResourceType.COMPANIES } });
      
      // Assert
      expect(mockedCompanies.listCompanies).toHaveBeenCalled();
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalled();
      expect(result).toBe(mockErrorResult);
    });

    it('should handle read company resource request successfully', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Setup mock parse resource URI
      mockedParseResourceUri.mockReturnValue([ResourceType.COMPANIES, 'company1']);
      
      // Setup mock company details
      mockedCompanies.getCompanyDetails.mockResolvedValue(mockCompanyDetails);
      
      // Get the read resource handler function
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Call the handler with a request for a company URI
      const result = await readResourceHandler({ params: { uri: 'attio://companies/company1' } });
      
      // Assert
      expect(mockedParseResourceUri).toHaveBeenCalledWith('attio://companies/company1');
      expect(mockedCompanies.getCompanyDetails).toHaveBeenCalledWith('company1');
      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'attio://companies/company1');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
    });

    it('should handle read person resource request successfully', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Setup mock parse resource URI
      mockedParseResourceUri.mockReturnValue([ResourceType.PEOPLE, 'person1']);
      
      // Setup mock person details
      mockedPeople.getPersonDetails.mockResolvedValue(mockPersonDetails);
      
      // Get the read resource handler function
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Call the handler with a request for a person URI
      const result = await readResourceHandler({ params: { uri: 'attio://people/person1' } });
      
      // Assert
      expect(mockedParseResourceUri).toHaveBeenCalledWith('attio://people/person1');
      expect(mockedPeople.getPersonDetails).toHaveBeenCalledWith('person1');
      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri', 'attio://people/person1');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
    });

    it('should handle errors in read resource request', async () => {
      // Register the handlers
      registerResourceHandlers(mockServer);
      
      // Setup mock parse resource URI
      mockedParseResourceUri.mockReturnValue([ResourceType.COMPANIES, 'company1']);
      
      // Setup mock error
      const mockError = new Error('Failed to get company details');
      mockedCompanies.getCompanyDetails.mockRejectedValue(mockError);
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Get the read resource handler function
      const readResourceHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Call the handler with a request for a company URI
      const result = await readResourceHandler({ params: { uri: 'attio://companies/company1' } });
      
      // Assert
      expect(mockedCompanies.getCompanyDetails).toHaveBeenCalledWith('company1');
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalled();
      expect(result).toBe(mockErrorResult);
    });
  });
});
