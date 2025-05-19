import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import * as registry from '../../src/handlers/tools/registry';
import * as companyAttributes from '../../src/objects/companies/attributes';
import { ResourceType } from '../../src/types/attio';
import { ToolConfig } from '../../src/handlers/tool-types';

// Mock the registry and company attributes modules
jest.mock('../../src/handlers/tools/registry');
jest.mock('../../src/objects/companies/attributes');
const mockedRegistry = registry as jest.Mocked<typeof registry>;
const mockedCompanyAttributes = companyAttributes as jest.Mocked<typeof companyAttributes>;

describe('Company Info Tools', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Mock the registry's findToolConfig function to return mock configurations
    mockedRegistry.findToolConfig.mockImplementation((toolName: string) => {
      const toolConfigs: Record<string, ToolConfig> = {
        'get-company-basic-info': {
          name: 'get-company-basic-info',
          handler: mockedCompanyAttributes.getCompanyBasicInfo,
          formatResult: jest.fn((result) => JSON.stringify(result))
        },
        'get-company-business-info': {
          name: 'get-company-business-info',
          handler: mockedCompanyAttributes.getCompanyBusinessInfo,
          formatResult: jest.fn((result) => JSON.stringify(result))
        },
        'get-company-fields': {
          name: 'get-company-fields',
          handler: mockedCompanyAttributes.getCompanyFields,
          formatResult: jest.fn((result) => JSON.stringify(result))
        }
      };
      
      const config = toolConfigs[toolName];
      
      if (!config) {
        return undefined;
      }
      
      return {
        resourceType: ResourceType.COMPANIES,
        toolConfig: config,
        toolType: toolName === 'get-company-basic-info' ? 'basicInfo' : 
                  toolName === 'get-company-business-info' ? 'businessInfo' : 
                  toolName === 'get-company-fields' ? 'fields' : 'unknown'
      };
    });

    // Mock the company attribute functions
    mockedCompanyAttributes.getCompanyBasicInfo.mockResolvedValue({
      id: { record_id: 'company123' },
      values: { 
        name: [{ value: 'Test Company' }],
        website: [{ value: 'https://test.com' }]
      }
    });
    
    mockedCompanyAttributes.getCompanyBusinessInfo.mockResolvedValue({
      id: { record_id: 'company123' },
      values: { 
        name: [{ value: 'Test Company' }],
        industry: [{ value: 'Technology' }],
        type: [{ option: { title: 'B2B' } }]
      }
    });
    
    mockedCompanyAttributes.getCompanyFields.mockResolvedValue({
      id: { record_id: 'company123' },
      values: { 
        name: [{ value: 'Test Company' }],
        custom_field: [{ value: 'Custom Value' }]
      }
    });
  });

  describe('Basic Info Tool', () => {
    it('should execute get-company-basic-info tool successfully', async () => {
      // Arrange
      const request = {
        params: {
          name: 'get-company-basic-info',
          arguments: {
            companyId: 'company123'
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('get-company-basic-info');
      expect(mockedCompanyAttributes.getCompanyBasicInfo).toHaveBeenCalledWith('company123');
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Test Company');
    });
    
    it('should handle missing companyId parameter', async () => {
      // Arrange
      const request = {
        params: {
          name: 'get-company-basic-info',
          arguments: {}
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('companyId parameter is required');
    });
  });

  describe('Business Info Tool', () => {
    it('should execute get-company-business-info tool successfully', async () => {
      // Arrange
      const request = {
        params: {
          name: 'get-company-business-info',
          arguments: {
            companyId: 'company123'
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('get-company-business-info');
      expect(mockedCompanyAttributes.getCompanyBusinessInfo).toHaveBeenCalledWith('company123');
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Technology');
    });
  });

  describe('Company Fields Tool', () => {
    it('should execute get-company-fields tool successfully', async () => {
      // Arrange
      const request = {
        params: {
          name: 'get-company-fields',
          arguments: {
            companyId: 'company123',
            fields: ['name', 'custom_field']
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('get-company-fields');
      expect(mockedCompanyAttributes.getCompanyFields).toHaveBeenCalledWith('company123', ['name', 'custom_field']);
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Custom Value');
    });
    
    it('should validate fields parameter is an array', async () => {
      // Arrange
      const request = {
        params: {
          name: 'get-company-fields',
          arguments: {
            companyId: 'company123',
            fields: 'name' // Not an array
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('fields parameter is required and must be a non-empty array');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      // Arrange
      mockedCompanyAttributes.getCompanyBasicInfo.mockRejectedValue(new Error('API Error'));
      
      const request = {
        params: {
          name: 'get-company-basic-info',
          arguments: {
            companyId: 'company123'
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Error');
    });
  });
});