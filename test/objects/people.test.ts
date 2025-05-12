import { searchPeople, listPeople, getPersonDetails, getPersonNotes, createPersonNote } from '../../src/objects/people.js';
import * as attioClient from '../../src/api/attio-client.js';
import * as attioOperations from '../../src/api/attio-operations.js';
import { ResourceType } from '../../src/types/attio.js';

// Mock dependencies
jest.mock('../../src/api/attio-client.js');
jest.mock('../../src/api/attio-operations.js');

describe('people', () => {
  // Mock data
  const mockPeopleData = [
    {
      id: { record_id: 'person1' },
      values: { 
        name: [{ id: 'name1', value: 'John Doe', attribute: 'name' }] 
      }
    },
    {
      id: { record_id: 'person2' },
      values: { 
        name: [{ id: 'name2', value: 'Jane Smith', attribute: 'name' }] 
      }
    }
  ];

  const mockPersonDetails = {
    id: { record_id: 'person1' },
    values: {
      name: [{ id: 'name1', value: 'John Doe', attribute: 'name' }],
      email: [{ id: 'email1', value: 'john@example.com', attribute: 'email' }],
      phone: [{ id: 'phone1', value: '+1234567890', attribute: 'phone' }]
    }
  };

  const mockNotes = [
    { 
      id: { note_id: 'note1' }, 
      title: 'First meeting', 
      content: 'Met with John',
      format: 'plaintext' as 'plaintext',
      parent_object: 'people',
      parent_record_id: 'person1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    { 
      id: { note_id: 'note2' }, 
      title: 'Follow-up', 
      content: 'Discussed next steps',
      format: 'plaintext' as 'plaintext',
      parent_object: 'people',
      parent_record_id: 'person1',
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z'
    }
  ];

  const mockCreatedNote = {
    id: { note_id: 'note3' },
    title: '[AI] Meeting summary',
    content: 'Discussed project details',
    format: 'plaintext' as 'plaintext',
    parent_object: 'people',
    parent_record_id: 'person1',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z'
  };

  let mockAxiosInstance: any;
  const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;
  const mockedAttioOperations = attioOperations as jest.Mocked<typeof attioOperations>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Setup mock API client
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
  });

  describe('searchPeople', () => {
    it('should search people by name using operations module if available', async () => {
      // Arrange
      const query = 'John';
      mockedAttioOperations.searchObject.mockResolvedValueOnce(mockPeopleData);

      // Act
      const result = await searchPeople(query);

      // Assert
      expect(mockedAttioOperations.searchObject).toHaveBeenCalledWith(ResourceType.PEOPLE, query);
      expect(result).toEqual(mockPeopleData);
    });

    it('should search people by name using direct API if operations fail', async () => {
      // Arrange
      const query = 'John';
      mockedAttioOperations.searchObject.mockRejectedValueOnce(new Error('Not available'));
      
      const mockResponse = {
        data: {
          data: mockPeopleData
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await searchPeople(query);

      // Assert
      expect(mockedAttioOperations.searchObject).toHaveBeenCalledWith(ResourceType.PEOPLE, query);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            name: { "$contains": query }
          }
        })
      );
      expect(result).toEqual(mockPeopleData);
    });

    it('should throw error when both approaches fail', async () => {
      // Arrange
      const query = 'John';
      mockedAttioOperations.searchObject.mockRejectedValueOnce(new Error('Not available'));
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API Error'));

      // Act & Assert
      await expect(searchPeople(query)).rejects.toThrow('API Error');
    });
  });

  describe('listPeople', () => {
    it('should list people using operations module if available', async () => {
      // Arrange
      const limit = 10;
      mockedAttioOperations.listObjects.mockResolvedValueOnce(mockPeopleData);

      // Act
      const result = await listPeople(limit);

      // Assert
      expect(mockedAttioOperations.listObjects).toHaveBeenCalledWith(ResourceType.PEOPLE, limit);
      expect(result).toEqual(mockPeopleData);
    });

    it('should list people using direct API if operations fail', async () => {
      // Arrange
      const limit = 10;
      mockedAttioOperations.listObjects.mockRejectedValueOnce(new Error('Not available'));
      
      const mockResponse = {
        data: {
          data: mockPeopleData
        }
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await listPeople(limit);

      // Assert
      expect(mockedAttioOperations.listObjects).toHaveBeenCalledWith(ResourceType.PEOPLE, limit);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          limit,
          sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
        })
      );
      expect(result).toEqual(mockPeopleData);
    });
  });

  describe('getPersonDetails', () => {
    it('should get person details using operations module if available', async () => {
      // Arrange
      const personId = 'person1';
      mockedAttioOperations.getObjectDetails.mockResolvedValueOnce(mockPersonDetails);

      // Act
      const result = await getPersonDetails(personId);

      // Assert
      expect(mockedAttioOperations.getObjectDetails).toHaveBeenCalledWith(ResourceType.PEOPLE, personId);
      expect(result).toEqual(mockPersonDetails);
    });

    it('should get person details using direct API if operations fail', async () => {
      // Arrange
      const personId = 'person1';
      mockedAttioOperations.getObjectDetails.mockRejectedValueOnce(new Error('Not available'));
      
      const mockResponse = {
        data: mockPersonDetails
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await getPersonDetails(personId);

      // Assert
      expect(mockedAttioOperations.getObjectDetails).toHaveBeenCalledWith(ResourceType.PEOPLE, personId);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/objects/people/records/${personId}`);
      expect(result).toEqual(mockPersonDetails);
    });
  });

  describe('getPersonNotes', () => {
    it('should get notes for a person using operations module if available', async () => {
      // Arrange
      const personId = 'person1';
      const limit = 10;
      const offset = 0;
      mockedAttioOperations.getObjectNotes.mockResolvedValueOnce(mockNotes);

      // Act
      const result = await getPersonNotes(personId, limit, offset);

      // Assert
      expect(mockedAttioOperations.getObjectNotes).toHaveBeenCalledWith(ResourceType.PEOPLE, personId, limit, offset);
      expect(result).toEqual(mockNotes);
    });

    it('should get notes for a person using direct API if operations fail', async () => {
      // Arrange
      const personId = 'person1';
      const limit = 10;
      const offset = 0;
      mockedAttioOperations.getObjectNotes.mockRejectedValueOnce(new Error('Not available'));
      
      const mockResponse = {
        data: {
          data: mockNotes
        }
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await getPersonNotes(personId, limit, offset);

      // Assert
      expect(mockedAttioOperations.getObjectNotes).toHaveBeenCalledWith(ResourceType.PEOPLE, personId, limit, offset);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/notes?limit=${limit}&offset=${offset}&parent_object=people&parent_record_id=${personId}`
      );
      expect(result).toEqual(mockNotes);
    });
  });

  describe('createPersonNote', () => {
    it('should create a note for a person using operations module if available', async () => {
      // Arrange
      const personId = 'person1';
      const title = 'Meeting summary';
      const content = 'Discussed project details';
      mockedAttioOperations.createObjectNote.mockResolvedValueOnce(mockCreatedNote);

      // Act
      const result = await createPersonNote(personId, title, content);

      // Assert
      expect(mockedAttioOperations.createObjectNote).toHaveBeenCalledWith(ResourceType.PEOPLE, personId, title, content);
      expect(result).toEqual(mockCreatedNote);
    });

    it('should create a note for a person using direct API if operations fail', async () => {
      // Arrange
      const personId = 'person1';
      const title = 'Meeting summary';
      const content = 'Discussed project details';
      mockedAttioOperations.createObjectNote.mockRejectedValueOnce(new Error('Not available'));
      
      const mockResponse = {
        data: mockCreatedNote
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await createPersonNote(personId, title, content);

      // Assert
      expect(mockedAttioOperations.createObjectNote).toHaveBeenCalledWith(ResourceType.PEOPLE, personId, title, content);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'notes',
        {
          data: {
            format: "plaintext",
            parent_object: "people",
            parent_record_id: personId,
            title: `[AI] ${title}`,
            content
          }
        }
      );
      expect(result).toEqual(mockCreatedNote);
    });
  });
});
