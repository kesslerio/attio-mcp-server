import { vi } from 'vitest';

/**
 * Mock factory for creating test data and mock objects
 */

// TODO: Define interfaces for your mock data
interface MockDataInterface {
  id: string;
  name: string;
  // Add other properties
}

/**
 * Factory function to create mock data
 */
export function createMockData(
  overrides: Partial<MockDataInterface> = {}
): MockDataInterface {
  return {
    id: 'test-id-123',
    name: 'Test Name',
    ...overrides,
  };
}

/**
 * Factory function to create multiple mock data items
 */
export function createMockDataArray(
  count: number,
  overrides: Partial<MockDataInterface> = {}
): MockDataInterface[] {
  return Array.from({ length: count }, (_, index) =>
    createMockData({
      id: `test-id-${index}`,
      name: `Test Name ${index}`,
      ...overrides,
    })
  );
}

/**
 * Mock API client functions
 */
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  // Add other API methods as needed
};

/**
 * Reset all mocks - call this in beforeEach
 */
export function resetAllMocks(): void {
  Object.values(mockApiClient).forEach((mock) => mock.mockReset());
}
