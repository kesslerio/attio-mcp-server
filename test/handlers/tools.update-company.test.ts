/**
 * Test for update-company tool handler
 */
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import * as registry from '../../src/handlers/tools/registry';
import * as companyBasic from '../../src/objects/companies/basic';
import { ResourceType } from '../../src/types/attio';
import { ToolConfig } from '../../src/handlers/tool-types';
import { InvalidCompanyDataError } from '../../src/errors/company-errors';

// Mock the registry and company basic operations modules
jest.mock('../../src/handlers/tools/registry');
jest.mock('../../src/objects/companies/basic');
const mockedRegistry = registry as jest.Mocked<typeof registry>;
const mockedCompanyBasic = companyBasic as jest.Mocked<typeof companyBasic>;

describe('Update Company Tool', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Mock the registry's findToolConfig function to return mock configurations
    mockedRegistry.findToolConfig.mockImplementation((toolName: string) => {
      if (toolName === 'update-company') {
        return {
          resourceType: ResourceType.COMPANIES,
          toolConfig: {
            name: 'update-company',
            handler: mockedCompanyBasic.updateCompany,
            formatResult: jest.fn((result) => `Company updated: ${result.values?.name || 'Unnamed'} (ID: ${result.id?.record_id || result.id || 'unknown'})`)
          },
          toolType: 'update'
        };
      }
      return undefined;
    });

    // Mock the company update function with default successful response
    mockedCompanyBasic.updateCompany.mockResolvedValue({
      id: { record_id: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e' },
      values: { 
        name: [{ value: 'Test Company' }],
        industry: [{ value: 'Batch Test Industry' }]
      }
    });
  });

  describe('Successful Operations', () => {
    it('should execute update-company tool with companyId and attributes', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            attributes: {
              industry: 'Batch Test Industry'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('update-company');
      expect(mockedCompanyBasic.updateCompany).toHaveBeenCalledWith(
        '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e', 
        { industry: 'Batch Test Industry' }
      );
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Company updated');
      expect(result.content[0].text).toContain('3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e');
    });

    it('should support recordData parameter instead of attributes', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            recordData: {  // Using recordData instead of attributes
              industry: 'Software Development'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedCompanyBasic.updateCompany).toHaveBeenCalledWith(
        '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e', 
        { industry: 'Software Development' }
      );
      expect(result.isError).toBeFalsy();
    });

    it('should handle attributes with special characters', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            attributes: {
              name: 'Company & Sons (EMEA)',
              description: 'They handle the <complex> "special" characters!'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(mockedCompanyBasic.updateCompany).toHaveBeenCalledWith(
        '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e', 
        { 
          name: 'Company & Sons (EMEA)', 
          description: 'They handle the <complex> "special" characters!' 
        }
      );
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing companyId parameter', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            attributes: {
              industry: 'Batch Test Industry'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('companyId parameter is required');
      // Ensure updateCompany wasn't called
      expect(mockedCompanyBasic.updateCompany).not.toHaveBeenCalled();
    });

    it('should handle missing attributes parameter', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            // No attributes or recordData
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Attributes parameter cannot be empty');
    });

    it('should handle invalid companyId format', async () => {
      // Arrange - Mock an error for invalid ID format
      mockedCompanyBasic.updateCompany.mockRejectedValue(
        new InvalidCompanyDataError('Invalid company ID format')
      );
      
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: 'invalid-format',
            attributes: {
              industry: 'Batch Test Industry'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Error');
    });

    it('should handle non-object attributes parameter', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            attributes: 'string instead of object'
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Attributes parameter must be an object');
    });

    it('should handle array attributes parameter', async () => {
      // Arrange
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            attributes: ['array', 'instead', 'of', 'object']
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Attributes parameter must be an object');
    });

    it('should handle API errors', async () => {
      // Arrange - Mock an API error
      mockedCompanyBasic.updateCompany.mockRejectedValue(
        new Error('API error: Service unavailable')
      );
      
      const request = {
      method: "tools/call" as const,
        params: {
          name: 'update-company',
          arguments: {
            companyId: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e',
            attributes: {
              industry: 'Batch Test Industry'
            }
          }
        }
      };
      
      // Act
      const result = await executeToolRequest(request);
      
      // Assert
      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('API error');
    });
  });
});