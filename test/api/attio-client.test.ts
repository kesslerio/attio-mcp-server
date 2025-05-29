import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('attio-client', () => {
  let createAttioClient: any;
  let initializeAttioClient: any;
  let getAttioClient: any;
  let mockedAxios: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    vi.resetModules();

    // Mock axios with proper structure
    const mockAxiosInstance = {
      defaults: {},
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios = {
      create: vi.fn(() => mockAxiosInstance),
    };

    // Dynamically import with fresh mock
    vi.doMock('axios', () => ({
      default: mockedAxios,
    }));

    // Import the client module after mocking
    const clientModule = await import('../../src/api/attio-client');
    createAttioClient = clientModule.createAttioClient;
    initializeAttioClient = clientModule.initializeAttioClient;
    getAttioClient = clientModule.getAttioClient;
  });

  describe('createAttioClient', () => {
    it('should create an axios instance with correct configuration', () => {
      // Arrange
      const apiKey = 'test-api-key';

      // Act
      const result = createAttioClient(apiKey);

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.attio.com/v2',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      expect(result).toBeDefined();
      expect(result.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('initializeAttioClient and getAttioClient', () => {
    it('should initialize the API client and make it retrievable', () => {
      // Arrange
      const apiKey = 'test-api-key';

      // Act
      initializeAttioClient(apiKey);
      const result = getAttioClient();

      // Assert
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${apiKey}`,
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should throw an error if getAttioClient is called before initialization', async () => {
      // Mock environment to not have ATTIO_API_KEY
      vi.unstubAllEnvs();
      
      // Create a fresh module import without initialization
      vi.resetModules();
      
      // Re-mock axios for this fresh import
      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            defaults: {},
            interceptors: {
              response: { use: vi.fn() }
            }
          })),
        },
      }));

      // Import the module again to reset its state
      const { getAttioClient } = await import('../../src/api/attio-client');

      // Assert
      expect(() => getAttioClient()).toThrow('API client not initialized');
    });
  });
});
