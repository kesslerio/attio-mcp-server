import { registerToolHandlers } from '../../src/handlers/tools.js';
import * as companiesModule from '../../src/objects/companies.js';
import * as peopleModule from '../../src/objects/people.js';
import * as errorHandler from '../../src/utils/error-handler.js';
import { parseResourceUri } from '../../src/utils/uri-parser.js';
import { ResourceType } from '../../src/types/attio.js';

// Mock dependencies
jest.mock('../../src/objects/companies.js');
jest.mock('../../src/objects/people.js');
jest.mock('../../src/utils/error-handler.js');
jest.mock('../../src/utils/uri-parser.js');

describe('tools', () => {
  describe('registerToolHandlers', () => {
    let mockServer: any;
    const mockedCompanies = companiesModule as jest.Mocked<typeof companiesModule>;
    const mockedPeople = peopleModule as jest.Mocked<typeof peopleModule>;
    const mockedErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
    const mockedParseResourceUri = parseResourceUri as jest.MockedFunction<typeof parseResourceUri>;

    // Mock data
    const mockCompanySearchResults = [
      {
        id: { record_id: 'company1' },
        values: { name: [{ value: 'Acme Corp' }] }
      },
      {
        id: { record_id: 'company2' },
        values: { name: [{ value: 'Globex Inc' }] }
      }
    ];

    const mockPeopleSearchResults = [
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
        industry: [{ value: 'Technology' }]
      }
    };

    const mockPersonDetails = {
      id: { record_id: 'person1' },
      values: {
        name: [{ value: 'John Doe' }],
        email: [{ value: 'john@example.com' }]
      }
    };

    const mockCompanyNotes = [
      { id: { note_id: 'note1' }, title: 'Meeting notes', content: 'Discussed project timeline' },
      { id: { note_id: 'note2' }, title: 'Follow-up', content: 'Sent proposal' }
    ];

    const mockPersonNotes = [
      { id: { note_id: 'note3' }, title: 'Introduction', content: 'First contact with John' },
      { id: { note_id: 'note4' }, title: 'Career history', content: 'Discussed background' }
    ];

    const mockCreatedCompanyNote = {
      id: { note_id: 'note5' }
    };

    const mockCreatedPersonNote = {
      id: { note_id: 'note6' }
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
      
      // Setup mock server
      mockServer = {
        setRequestHandler: jest.fn(),
      };
    });

    it('should register handlers for ListToolsRequestSchema and CallToolRequestSchema', () => {
      // Act
      registerToolHandlers(mockServer);
      
      // Assert
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle list tools request and return available tools', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the first handler function (ListToolsRequestSchema handler)
      const listToolsHandler = mockServer.setRequestHandler.mock.calls[0][1];
      
      // Call the handler
      const result = await listToolsHandler();
      
      // Verify the result has the expected structure
      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBeTruthy();
      expect(result.tools.length).toBeGreaterThan(0);
      
      // Extract tool names for easier testing
      const toolNames = result.tools.map((tool: any) => tool.name);
      
      // Check for expected company tools
      expect(toolNames).toContain('search-companies');
      expect(toolNames).toContain('read-company-details');
      expect(toolNames).toContain('read-company-notes');
      expect(toolNames).toContain('create-company-note');
      
      // Check for expected people tools
      expect(toolNames).toContain('search-people');
      expect(toolNames).toContain('read-person-details');
      expect(toolNames).toContain('read-person-notes');
      expect(toolNames).toContain('create-person-note');
    });

    describe('Tool handlers', () => {
      let callToolHandler: Function;
      
      beforeEach(() => {
        // Register handlers
        registerToolHandlers(mockServer);
        
        // Get the second handler function (CallToolRequestSchema handler)
        callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
      });
      
      it('should handle search-companies tool call successfully', async () => {
        // Mock searchCompanies to return results
        mockedCompanies.searchCompanies.mockResolvedValueOnce(mockCompanySearchResults);
        
        // Create a mock request
        const request = {
          params: {
            name: 'search-companies',
            arguments: {
              query: 'Acme'
            }
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(mockedCompanies.searchCompanies).toHaveBeenCalledWith('Acme');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', false);
        expect(result.content[0].text).toContain('Found 2 companies');
      });
      
      it('should handle search-people tool call successfully', async () => {
        // Mock searchPeople to return results
        mockedPeople.searchPeople.mockResolvedValueOnce(mockPeopleSearchResults);
        
        // Create a mock request
        const request = {
          params: {
            name: 'search-people',
            arguments: {
              query: 'John'
            }
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(mockedPeople.searchPeople).toHaveBeenCalledWith('John');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', false);
        expect(result.content[0].text).toContain('Found 2 people');
      });
      
      it('should handle read-company-details tool call successfully', async () => {
        // Mock parseResourceUri to return valid type and ID
        mockedParseResourceUri.mockReturnValueOnce([ResourceType.COMPANIES, 'company1']);
        
        // Mock getCompanyDetails to return company details
        mockedCompanies.getCompanyDetails.mockResolvedValueOnce(mockCompanyDetails);
        
        // Create a mock request
        const request = {
          params: {
            name: 'read-company-details',
            arguments: {
              uri: 'attio://companies/company1'
            }
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(mockedParseResourceUri).toHaveBeenCalledWith('attio://companies/company1');
        expect(mockedCompanies.getCompanyDetails).toHaveBeenCalledWith('company1');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', false);
        expect(result.content[0].text).toContain('details for company1');
      });
      
      it('should handle read-person-details tool call successfully', async () => {
        // Mock parseResourceUri to return valid type and ID
        mockedParseResourceUri.mockReturnValueOnce([ResourceType.PEOPLE, 'person1']);
        
        // Mock getPersonDetails to return person details
        mockedPeople.getPersonDetails.mockResolvedValueOnce(mockPersonDetails);
        
        // Create a mock request
        const request = {
          params: {
            name: 'read-person-details',
            arguments: {
              uri: 'attio://people/person1'
            }
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(mockedParseResourceUri).toHaveBeenCalledWith('attio://people/person1');
        expect(mockedPeople.getPersonDetails).toHaveBeenCalledWith('person1');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', false);
        expect(result.content[0].text).toContain('details for person1');
      });
      
      it('should handle errors in tool calls appropriately', async () => {
        // Mock searchCompanies to throw an error
        const mockError = new Error('API error');
        mockedCompanies.searchCompanies.mockRejectedValueOnce(mockError);
        
        // Mock createErrorResult
        const mockErrorResult = { isError: true, content: [{ type: 'text', text: 'Error message' }] };
        mockedErrorHandler.createErrorResult.mockReturnValueOnce(mockErrorResult as any);
        
        // Create a mock request
        const request = {
          params: {
            name: 'search-companies',
            arguments: {
              query: 'Acme'
            }
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(mockedCompanies.searchCompanies).toHaveBeenCalledWith('Acme');
        expect(mockedErrorHandler.createErrorResult).toHaveBeenCalled();
        expect(result).toBe(mockErrorResult);
      });
      
      it('should handle unknown tool name', async () => {
        // Create a mock request with invalid tool name
        const request = {
          params: {
            name: 'non-existent-tool',
            arguments: {}
          }
        };
        
        // Call the handler
        const result = await callToolHandler(request);
        
        // Verify
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('Error executing tool');
        expect(result.content[0].text).toContain('non-existent-tool');
      });
    });
  });
});
