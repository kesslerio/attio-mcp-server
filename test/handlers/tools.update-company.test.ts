/**
 * Test for update-company tool handler
 */
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import * as registry from '../../src/handlers/tools/registry';
import * as companyBasic from '../../src/objects/companies/basic';
import { ResourceType } from '../../src/types/attio';
import { ToolConfig } from '../../src/handlers/tool-types';

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

    // Mock the company update function
    mockedCompanyBasic.updateCompany.mockResolvedValue({
      id: { record_id: '3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e' },
      values: { 
        name: 'Test Company',
        industry: 'Batch Test Industry'
      }
    });
  });

  it('should execute update-company tool successfully', async () => {
    // Arrange
    const request = {
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
    expect(result.content[0].text).toContain('Test Company');
  });
  
  it('should handle missing companyId parameter', async () => {
    // Arrange - Make the updateCompany function throw an error for missing companyId
    mockedCompanyBasic.updateCompany.mockRejectedValue(
      new Error('Invalid company data: Company ID must be a non-empty string')
    );
    
    const request = {
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
    expect(result.content[0].text).toContain('Error');
  });
});