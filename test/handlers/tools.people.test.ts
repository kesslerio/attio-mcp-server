import { registerToolHandlers } from '../../src/handlers/tools.js';
import * as peopleModule from '../../src/objects/people.js';
import * as errorHandler from '../../src/utils/error-handler.js';

// Mock dependencies
jest.mock('../../src/objects/companies.js');
jest.mock('../../src/objects/people.js');
jest.mock('../../src/utils/error-handler.js');

describe('tools-people', () => {
  describe('registerToolHandlers - People Tools', () => {
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

    it('should register handlers for ListToolsRequestSchema and CallToolRequestSchema', () => {
      // Act
      registerToolHandlers(mockServer);
      
      // Assert
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it('should include people tools in the list of available tools', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the list tools handler
      const [listToolsHandler, _] = mockServer.setRequestHandler.mock.calls;
      
      // Call the handler
      const result = await listToolsHandler[1]();
      
      // Expected people tool names
      const expectedPeopleTools = [
        "search-people", 
        "read-person-details", 
        "read-person-notes",
        "create-person-note"
      ];
      
      // Assert
      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBeTruthy();
      
      // Check for the expected people tools
      const toolNames = result.tools.map((tool: any) => tool.name);
      for (const toolName of expectedPeopleTools) {
        expect(toolNames).toContain(toolName);
      }
    });

    it('should handle search-people tool call', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler
      const [_, callToolHandler] = mockServer.setRequestHandler.mock.calls;
      
      // Setup mock people data
      const mockPeople = [
        { id: { record_id: 'person1' }, values: { name: [{ value: 'Test Person' }] } }
      ];
      mockedPeople.searchPeople.mockResolvedValue(mockPeople);
      
      // Call the handler with search-people tool
      const result = await callToolHandler[1]({
        params: {
          name: 'search-people',
          arguments: { query: 'Test' }
        }
      });
      
      // Assert
      expect(mockedPeople.searchPeople).toHaveBeenCalledWith('Test');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      expect(result.content[0].text).toContain('Test Person');
    });

    it('should handle errors in search-people tool', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler
      const [_, callToolHandler] = mockServer.setRequestHandler.mock.calls;
      
      // Setup mock error
      const mockError = new Error('API Error');
      mockedPeople.searchPeople.mockRejectedValue(mockError);
      
      // Setup mock error result
      const mockErrorResult = { isError: true, error: { message: 'Error' } };
      mockedErrorHandler.createErrorResult.mockReturnValue(mockErrorResult as any);
      
      // Call the handler with search-people tool
      const result = await callToolHandler[1]({
        params: {
          name: 'search-people',
          arguments: { query: 'Test' }
        }
      });
      
      // Assert
      expect(mockedPeople.searchPeople).toHaveBeenCalledWith('Test');
      expect(mockedErrorHandler.createErrorResult).toHaveBeenCalled();
      expect(result).toBe(mockErrorResult);
    });

    it('should handle read-person-details tool call', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler
      const [_, callToolHandler] = mockServer.setRequestHandler.mock.calls;
      
      // Setup mock person data
      const mockPerson = { 
        id: { record_id: 'person1' }, 
        values: { name: [{ value: 'Test Person' }] } 
      };
      mockedPeople.getPersonDetails.mockResolvedValue(mockPerson);
      
      // Call the handler with read-person-details tool
      const result = await callToolHandler[1]({
        params: {
          name: 'read-person-details',
          arguments: { uri: 'attio://people/person1' }
        }
      });
      
      // Assert
      expect(mockedPeople.getPersonDetails).toHaveBeenCalledWith('person1');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      expect(result.content[0].text).toContain('details for person1');
    });

    it('should handle read-person-notes tool call', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler
      const [_, callToolHandler] = mockServer.setRequestHandler.mock.calls;
      
      // Setup mock notes data
      const mockNotes = [
        { 
          id: { note_id: 'note1' }, 
          title: 'Note 1', 
          content: 'Content 1',
          format: 'plaintext',
          parent_object: 'people',
          parent_record_id: 'person1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];
      mockedPeople.getPersonNotes.mockResolvedValue(mockNotes);
      
      // Call the handler with read-person-notes tool
      const result = await callToolHandler[1]({
        params: {
          name: 'read-person-notes',
          arguments: { 
            uri: 'attio://people/person1',
            limit: 5,
            offset: 10
          }
        }
      });
      
      // Assert
      expect(mockedPeople.getPersonNotes).toHaveBeenCalledWith('person1', 5, 10);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      expect(result.content[0].text).toContain('notes for');
      expect(result.content[0].text).toContain('person1');
    });

    it('should handle create-person-note tool call', async () => {
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler
      const [_, callToolHandler] = mockServer.setRequestHandler.mock.calls;
      
      // Setup mock response
      const mockResponse = {
        id: { note_id: 'note123' },
        title: '[AI] Test Note',
        content: 'This is a test note',
        format: 'plaintext',
        parent_object: 'people',
        parent_record_id: 'person1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };
      mockedPeople.createPersonNote.mockResolvedValue(mockResponse);
      
      // Call the handler with create-person-note tool
      const result = await callToolHandler[1]({
        params: {
          name: 'create-person-note',
          arguments: { 
            personId: 'person1',
            noteTitle: 'Test Note',
            noteText: 'This is a test note'
          }
        }
      });
      
      // Assert
      expect(mockedPeople.createPersonNote).toHaveBeenCalledWith(
        'person1', 
        'Test Note', 
        'This is a test note'
      );
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      expect(result.content[0].text).toContain('Note added to');
      expect(result.content[0].text).toContain('person1');
    });
  });
});