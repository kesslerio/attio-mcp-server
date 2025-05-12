import { createAttioClient, initializeAttioClient, getAttioClient } from '../../src/api/attio-client.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('attio-client', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  });

  describe('createAttioClient', () => {
    it('should create an axios instance with correct configuration', () => {
      // Arrange
      const apiKey = 'test-api-key';
      const mockAxiosInstance = { 
        defaults: {},
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      // Act
      const result = createAttioClient(apiKey);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.attio.com/v2',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      expect(result).toBe(mockAxiosInstance);
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('initializeAttioClient and getAttioClient', () => {
    it('should initialize the API client and make it retrievable', () => {
      // Arrange
      const apiKey = 'test-api-key';
      const mockAxiosInstance = { 
        defaults: {},
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      // Act
      initializeAttioClient(apiKey);
      const result = getAttioClient();

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${apiKey}`,
        })
      }));
      expect(result).toBe(mockAxiosInstance);
    });

    it('should throw an error if getAttioClient is called before initialization', () => {
      // Create a new module to reset the singleton API client
      jest.resetModules();
      
      // Import the module again to reset its state
      const { getAttioClient } = require('../../src/api/attio-client.js');
      
      // Assert
      expect(() => getAttioClient()).toThrow('API client not initialized');
    });
  });
});
