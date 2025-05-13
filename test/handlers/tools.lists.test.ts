import { listsToolConfigs } from '../../src/handlers/tool-configs/lists.js';
import * as listsModule from '../../src/objects/lists.js';

// Mock dependencies
jest.mock('../../src/objects/lists.js');

describe('Lists Tool Configurations', () => {
  const mockedLists = listsModule as jest.Mocked<typeof listsModule>;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  });
  
  describe('getLists tool', () => {
    it('should call getLists and format the results', async () => {
      // Mock lists
      const mockLists = [
        { 
          id: { list_id: 'list1' },
          title: 'Sales Pipeline',
          object_slug: 'companies',
          workspace_id: 'workspace1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        },
        { 
          id: { list_id: 'list2' },
          title: 'Candidates',
          object_slug: 'people',
          workspace_id: 'workspace1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      
      mockedLists.getLists.mockResolvedValueOnce(mockLists);
      
      // Call the handler
      const result = await listsToolConfigs.getLists.handler();
      
      // Format the result
      const formatResult = listsToolConfigs.getLists.formatResult;
      const formattedResult = formatResult ? formatResult(result) : '';
      
      // Verify
      expect(mockedLists.getLists).toHaveBeenCalled();
      expect(formattedResult).toContain('Found 2 lists');
      expect(formattedResult).toContain('Sales Pipeline (ID: list1)');
      expect(formattedResult).toContain('Candidates (ID: list2)');
    });
  });
  
  describe('getListEntries tool', () => {
    it('should call getListEntries and format the results', async () => {
      // Mock list entries
      const mockEntries = [
        { 
          id: { entry_id: 'entry1' },
          list_id: 'list1',
          record_id: 'record1',
          record: {
            id: { record_id: 'record1' },
            values: { 
              name: [{ value: 'Acme Inc' }],
              industry: [{ value: 'Technology' }]
            },
            object_slug: 'companies'
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        },
        { 
          id: { entry_id: 'entry2' },
          list_id: 'list1',
          record_id: 'record2',
          record: {
            id: { record_id: 'record2' },
            values: { 
              name: [{ value: 'Globex Corp' }],
              industry: [{ value: 'Manufacturing' }]
            },
            object_slug: 'companies'
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      
      mockedLists.getListEntries.mockResolvedValueOnce(mockEntries);
      
      // Call the handler
      const result = await listsToolConfigs.getListEntries.handler('list1');
      
      // Format the result
      const formatResult = listsToolConfigs.getListEntries.formatResult;
      const formattedResult = formatResult ? formatResult(result) : '';
      
      // Verify
      expect(mockedLists.getListEntries).toHaveBeenCalledWith('list1');
      expect(formattedResult).toContain('Found 2 entries in list');
      expect(formattedResult).toContain('Entry ID: entry1, Record ID: record1 (Company: Acme Inc)');
      expect(formattedResult).toContain('Entry ID: entry2, Record ID: record2 (Company: Globex Corp)');
    });
  });
  
  describe('filterListEntries tool', () => {
    it('should call getListEntries with filter parameters', async () => {
      // Mock filtered list entries
      const mockFilteredEntries = [
        { 
          id: { entry_id: 'entry1' },
          list_id: 'list1',
          record_id: 'record1',
          record: {
            id: { record_id: 'record1' },
            values: { 
              name: [{ value: 'Acme Inc' }],
              industry: [{ value: 'Technology' }],
              stage: [{ value: 'Discovery' }]
            },
            object_slug: 'companies'
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      
      mockedLists.getListEntries.mockResolvedValueOnce(mockFilteredEntries);
      
      // Call the handler with filter parameters
      const result = await listsToolConfigs.filterListEntries.handler(
        'list1',  // listId
        'stage',  // attributeSlug
        'equals', // condition
        'Discovery', // value
        10,      // limit
        0        // offset
      );
      
      // Format the result
      const formatResult = listsToolConfigs.filterListEntries.formatResult;
      const formattedResult = formatResult ? formatResult(result) : '';
      
      // Verify that getListEntries was called with the correct filter parameters
      expect(mockedLists.getListEntries).toHaveBeenCalledWith(
        'list1',
        10,
        0,
        {
          filters: [
            {
              attribute: {
                slug: 'stage'
              },
              condition: 'equals',
              value: 'Discovery'
            }
          ]
        }
      );
      
      expect(formattedResult).toContain('Found 1 filtered entries in list');
      expect(formattedResult).toContain('Entry ID: entry1, Record ID: record1 (Company: Acme Inc)');
    });
    
    it('should handle multiple filter conditions', async () => {
      // This test would be implemented if the tool supported multiple filter conditions directly
      // Currently our implementation only supports a single filter condition per call,
      // but this could be enhanced in the future
    });
    
    it('should handle empty result sets', async () => {
      // Mock empty result
      mockedLists.getListEntries.mockResolvedValueOnce([]);
      
      // Call the handler with filter parameters that return no results
      const result = await listsToolConfigs.filterListEntries.handler(
        'list1',       // listId
        'stage',       // attributeSlug
        'equals',      // condition
        'Nonexistent', // value
        10,            // limit
        0              // offset
      );
      
      // Format the result
      const formatResult = listsToolConfigs.filterListEntries.formatResult;
      const formattedResult = formatResult ? formatResult(result) : '';
      
      // Verify
      expect(formattedResult).toContain('Found 0 filtered entries in list');
    });
  });
});