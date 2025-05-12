import { getLists, getListDetails, getListEntries, addRecordToList, removeRecordFromList } from '../../src/objects/lists.js';
import * as attioClient from '../../src/api/attio-client.js';
import * as attioOperations from '../../src/api/attio-operations.js';

// Mock the API client and operations
jest.mock('../../src/api/attio-client.js');
jest.mock('../../src/api/attio-operations.js');

const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;
const mockedAttioOperations = attioOperations as jest.Mocked<typeof attioOperations>;

describe('lists', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Setup mock API client
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
  });

  describe('getLists', () => {
    it('should get all lists using the generic operation when available', async () => {
      // Arrange
      const mockLists = [
        { 
          id: { list_id: 'list1' },
          title: 'Test List 1',
          object_slug: 'companies',
          workspace_id: 'workspace1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        },
        { 
          id: { list_id: 'list2' },
          title: 'Test List 2',
          object_slug: 'people',
          workspace_id: 'workspace1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      mockedAttioOperations.getAllLists.mockResolvedValue(mockLists);

      // Act
      const result = await getLists();

      // Assert
      expect(mockedAttioOperations.getAllLists).toHaveBeenCalledWith(undefined, 20);
      expect(result).toEqual(mockLists);
    });

    it('should fall back to direct implementation when generic operation fails', async () => {
      // Arrange
      const objectSlug = 'companies';
      const limit = 15;
      const mockError = new Error('Generic operation failed');
      const mockResponse = {
        data: {
          data: [
            { 
              id: { list_id: 'list1' },
              title: 'Test List 1',
              object_slug: 'companies',
              workspace_id: 'workspace1',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-02T00:00:00Z'
            }
          ]
        }
      };
      
      mockedAttioOperations.getAllLists.mockRejectedValue(mockError);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getLists(objectSlug, limit);

      // Assert
      expect(mockedAttioOperations.getAllLists).toHaveBeenCalledWith(objectSlug, limit);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/lists?limit=${limit}&objectSlug=${objectSlug}`);
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getListDetails', () => {
    it('should get list details using the generic operation when available', async () => {
      // Arrange
      const listId = 'list123';
      const mockListDetails = { 
        id: { list_id: listId },
        title: 'Test List',
        object_slug: 'companies',
        workspace_id: 'workspace1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      mockedAttioOperations.getListDetails.mockResolvedValue(mockListDetails);

      // Act
      const result = await getListDetails(listId);

      // Assert
      expect(mockedAttioOperations.getListDetails).toHaveBeenCalledWith(listId);
      expect(result).toEqual(mockListDetails);
    });

    it('should fall back to direct implementation when generic operation fails', async () => {
      // Arrange
      const listId = 'list123';
      const mockError = new Error('Generic operation failed');
      const mockResponse = {
        data: {
          data: { 
            id: { list_id: listId },
            title: 'Test List',
            object_slug: 'companies',
            workspace_id: 'workspace1',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z'
          }
        }
      };
      
      mockedAttioOperations.getListDetails.mockRejectedValue(mockError);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getListDetails(listId);

      // Assert
      expect(mockedAttioOperations.getListDetails).toHaveBeenCalledWith(listId);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/lists/${listId}`);
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getListEntries', () => {
    it('should get list entries using the generic operation when available', async () => {
      // Arrange
      const listId = 'list123';
      const limit = 5;
      const offset = 10;
      const mockEntries = [
        { 
          id: { entry_id: 'entry1' },
          list_id: listId,
          record_id: 'record1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        },
        { 
          id: { entry_id: 'entry2' },
          list_id: listId,
          record_id: 'record2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      mockedAttioOperations.getListEntries.mockResolvedValue(mockEntries);

      // Act
      const result = await getListEntries(listId, limit, offset);

      // Assert
      expect(mockedAttioOperations.getListEntries).toHaveBeenCalledWith(listId, limit, offset);
      expect(result).toEqual(mockEntries);
    });

    it('should try multiple endpoints when generic operation fails', async () => {
      // Arrange
      const listId = 'list123';
      const limit = 5;
      const offset = 10;
      const mockError = new Error('Generic operation failed');
      const mockResponse = {
        data: {
          data: [
            { 
              id: { entry_id: 'entry1' },
              list_id: listId,
              record_id: 'record1',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-02T00:00:00Z'
            }
          ]
        }
      };
      
      mockedAttioOperations.getListEntries.mockRejectedValue(mockError);
      
      // Mock the first endpoint to succeed
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await getListEntries(listId, limit, offset);

      // Assert
      expect(mockedAttioOperations.getListEntries).toHaveBeenCalledWith(listId, limit, offset);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/lists/${listId}/entries/query`,
        { limit, offset }
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should try fallback endpoints when initial attempts fail', async () => {
      // Arrange
      const listId = 'list123';
      const limit = 5;
      const offset = 10;
      const mockError = new Error('Generic operation failed');
      const mockEndpoint1Error = new Error('First endpoint failed');
      const mockEndpoint2Error = new Error('Second endpoint failed');
      const mockResponse = {
        data: {
          data: [
            { 
              id: { entry_id: 'entry1' },
              list_id: listId,
              record_id: 'record1',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-02T00:00:00Z'
            }
          ]
        }
      };
      
      mockedAttioOperations.getListEntries.mockRejectedValue(mockError);
      
      // Mock first and second endpoints to fail, third to succeed
      mockAxiosInstance.post
        .mockRejectedValueOnce(mockEndpoint1Error)
        .mockRejectedValueOnce(mockEndpoint2Error);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await getListEntries(listId, limit, offset);

      // Assert
      expect(mockedAttioOperations.getListEntries).toHaveBeenCalledWith(listId, limit, offset);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/lists/${listId}/entries/query`,
        { limit, offset }
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/lists-entries/query`,
        { list_id: listId, limit, offset }
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}`
      );
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('addRecordToList', () => {
    it('should add a record to a list using the generic operation when available', async () => {
      // Arrange
      const listId = 'list123';
      const recordId = 'record123';
      const mockEntry = { 
        id: { entry_id: 'entry1' },
        list_id: listId,
        record_id: recordId,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      mockedAttioOperations.addRecordToList.mockResolvedValue(mockEntry);

      // Act
      const result = await addRecordToList(listId, recordId);

      // Assert
      expect(mockedAttioOperations.addRecordToList).toHaveBeenCalledWith(listId, recordId);
      expect(result).toEqual(mockEntry);
    });

    it('should fall back to direct implementation when generic operation fails', async () => {
      // Arrange
      const listId = 'list123';
      const recordId = 'record123';
      const mockError = new Error('Generic operation failed');
      const mockResponse = {
        data: {
          data: { 
            id: { entry_id: 'entry1' },
            list_id: listId,
            record_id: recordId,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z'
          }
        }
      };
      
      mockedAttioOperations.addRecordToList.mockRejectedValue(mockError);
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await addRecordToList(listId, recordId);

      // Assert
      expect(mockedAttioOperations.addRecordToList).toHaveBeenCalledWith(listId, recordId);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/lists/${listId}/entries`,
        { record_id: recordId }
      );
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('removeRecordFromList', () => {
    it('should remove a record from a list using the generic operation when available', async () => {
      // Arrange
      const listId = 'list123';
      const entryId = 'entry123';
      mockedAttioOperations.removeRecordFromList.mockResolvedValue(true);

      // Act
      const result = await removeRecordFromList(listId, entryId);

      // Assert
      expect(mockedAttioOperations.removeRecordFromList).toHaveBeenCalledWith(listId, entryId);
      expect(result).toBe(true);
    });

    it('should fall back to direct implementation when generic operation fails', async () => {
      // Arrange
      const listId = 'list123';
      const entryId = 'entry123';
      const mockError = new Error('Generic operation failed');
      
      mockedAttioOperations.removeRecordFromList.mockRejectedValue(mockError);
      mockAxiosInstance.delete.mockResolvedValue({});

      // Act
      const result = await removeRecordFromList(listId, entryId);

      // Assert
      expect(mockedAttioOperations.removeRecordFromList).toHaveBeenCalledWith(listId, entryId);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/lists/${listId}/entries/${entryId}`);
      expect(result).toBe(true);
    });
  });
});