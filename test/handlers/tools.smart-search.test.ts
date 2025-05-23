import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import * as registry from '../../src/handlers/tools/registry';
import * as companySearch from '../../src/objects/companies/search';
import { ResourceType } from '../../src/types/attio';
import { ToolConfig } from '../../src/handlers/tool-types';

// Mock the registry and company search modules
vi.mock('../../src/handlers/tools/registry');
vi.mock('../../src/objects/companies/search');

const mockedRegistry = registry as vi.Mocked<typeof registry>;
const mockedCompanySearch = companySearch as vi.Mocked<typeof companySearch>;

describe('SmartSearch Tool Handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('smartSearch tool type', () => {
    const mockSmartSearchConfig: ToolConfig = {
      name: 'smart-search-companies',
      handler: mockedCompanySearch.smartSearchCompanies,
      formatResult: vi.fn((results) => 
        `Found ${results.length} companies (smart search):\n${results.map((company: any) => 
          `- ${company.values?.name?.[0]?.value || 'Unnamed'} (ID: ${company.id?.record_id || 'unknown'})`
        ).join('\n')}`
      ),
    };

    beforeEach(() => {
      mockedRegistry.findToolConfig.mockReturnValue({
        resourceType: ResourceType.COMPANIES,
        toolConfig: mockSmartSearchConfig,
        toolType: 'smartSearch',
      });
    });

    it('should successfully execute smart search with valid query', async () => {
      // Arrange
      const mockResults = [
        {
          id: { record_id: 'company-123' },
          values: {
            name: [{ value: 'IHT Factor' }],
            website: [{ value: 'ihtfactor.com' }],
          },
        },
      ];

      mockedCompanySearch.smartSearchCompanies.mockResolvedValue(mockResults);

      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'IHT Factor joey@ihtfactor.com',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(mockedCompanySearch.smartSearchCompanies).toHaveBeenCalledWith('IHT Factor joey@ihtfactor.com');
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Found 1 companies (smart search)');
      expect(result.content[0].text).toContain('IHT Factor');
    });

    it('should handle empty query parameter', async () => {
      // Arrange
      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: '',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Query parameter is required for smart search');
      expect(mockedCompanySearch.smartSearchCompanies).not.toHaveBeenCalled();
    });

    it('should handle missing query parameter', async () => {
      // Arrange
      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {},
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Query parameter is required for smart search');
      expect(mockedCompanySearch.smartSearchCompanies).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only query parameter', async () => {
      // Arrange
      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: '   \t\n   ',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Query parameter is required for smart search');
      expect(mockedCompanySearch.smartSearchCompanies).not.toHaveBeenCalled();
    });

    it('should handle non-string query parameter', async () => {
      // Arrange
      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 123, // Invalid type
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Query parameter is required for smart search');
      expect(mockedCompanySearch.smartSearchCompanies).not.toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Smart search failed');
      mockedCompanySearch.smartSearchCompanies.mockRejectedValue(mockError);

      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'test query',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(mockedCompanySearch.smartSearchCompanies).toHaveBeenCalledWith('test query');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Smart search failed');
    });

    it('should format results with smart search header when formatter does not include header', async () => {
      // Arrange
      const mockResults = [
        {
          id: { record_id: 'company-123' },
          values: {
            name: [{ value: 'Test Company' }],
          },
        },
      ];

      mockedCompanySearch.smartSearchCompanies.mockResolvedValue(mockResults);

      // Mock formatter that does NOT include "Found" header
      const configWithoutHeader = {
        ...mockSmartSearchConfig,
        formatResult: vi.fn(() => '- Test Company (ID: company-123)'),
      };

      mockedRegistry.findToolConfig.mockReturnValue({
        resourceType: ResourceType.COMPANIES,
        toolConfig: configWithoutHeader,
        toolType: 'smartSearch',
      });

      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'test query',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.content[0].text).toContain('Found 1 companies (smart search):');
      expect(result.content[0].text).toContain('- Test Company (ID: company-123)');
    });

    it('should use formatter header when formatter includes "Found" header', async () => {
      // Arrange
      const mockResults = [
        {
          id: { record_id: 'company-123' },
          values: {
            name: [{ value: 'Test Company' }],
          },
        },
      ];

      mockedCompanySearch.smartSearchCompanies.mockResolvedValue(mockResults);

      // Mock formatter that INCLUDES "Found" header
      const configWithHeader = {
        ...mockSmartSearchConfig,
        formatResult: vi.fn(() => 'Found 1 companies matching domain:\n- Test Company (ID: company-123)'),
      };

      mockedRegistry.findToolConfig.mockReturnValue({
        resourceType: ResourceType.COMPANIES,
        toolConfig: configWithHeader,
        toolType: 'smartSearch',
      });

      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'example.com',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.content[0].text).toBe('Found 1 companies matching domain:\n- Test Company (ID: company-123)');
      expect(result.content[0].text).not.toContain('Found 1 companies (smart search):');
    });

    it('should handle complex query with domain and email', async () => {
      // Arrange
      const mockResults = [
        {
          id: { record_id: 'company-456' },
          values: {
            name: [{ value: 'Acme Corp' }],
            website: [{ value: 'acme.com' }],
          },
        },
      ];

      mockedCompanySearch.smartSearchCompanies.mockResolvedValue(mockResults);

      const request = {
        params: {
          name: 'smart-search-companies',
          arguments: {
            query: 'Acme Corp john@acme.com https://acme.com',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(mockedCompanySearch.smartSearchCompanies).toHaveBeenCalledWith('Acme Corp john@acme.com https://acme.com');
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Found 1 companies (smart search)');
      expect(result.content[0].text).toContain('Acme Corp');
    });
  });

  describe('tool not found scenarios', () => {
    it('should handle tool not found gracefully', async () => {
      // Arrange
      mockedRegistry.findToolConfig.mockReturnValue(undefined);

      const request = {
        params: {
          name: 'non-existent-smart-search',
          arguments: {
            query: 'test query',
          },
        },
      };

      // Act
      const result = await executeToolRequest(request);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool not found: non-existent-smart-search');
    });
  });
});