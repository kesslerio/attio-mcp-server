import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import * as registry from '../../src/handlers/tools/registry';
import * as companyAttributes from '../../src/objects/companies/attributes';
import { ResourceType } from '../../src/types/attio';
import { ToolConfig } from '../../src/handlers/tool-types';

vi.mock('../../src/handlers/tools/registry');
vi.mock('../../src/objects/companies/attributes');
const mockedRegistry = registry as vi.Mocked<typeof registry>;
const mockedCompanyAttributes = companyAttributes as vi.Mocked<typeof companyAttributes>;

describe('Company Attribute Tools Dispatcher', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedRegistry.findToolConfig.mockImplementation((toolName: string) => {
      const configs: Record<string, ToolConfig> = {
        'get-company-attributes': {
          name: 'get-company-attributes',
          handler: mockedCompanyAttributes.getCompanyAttributes,
          formatResult: vi.fn((res) => JSON.stringify(res))
        },
        'get-company-json': {
          name: 'get-company-json',
          handler: mockedCompanyAttributes.getCompanyDetails,
          formatResult: vi.fn((res) => JSON.stringify(res))
        },
        'discover-company-attributes': {
          name: 'discover-company-attributes',
          handler: mockedCompanyAttributes.discoverCompanyAttributes,
          formatResult: vi.fn((res) => JSON.stringify(res))
        }
      };

      const config = configs[toolName];
      if (!config) {
        return undefined;
      }
      let toolType: string;
      switch (toolName) {
        case 'get-company-attributes':
          toolType = 'getAttributes';
          break;
        case 'get-company-json':
          toolType = 'json';
          break;
        case 'discover-company-attributes':
          toolType = 'discoverAttributes';
          break;
        default:
          toolType = 'unknown';
      }
      return { resourceType: ResourceType.COMPANIES, toolConfig: config, toolType };
    });
  });

  it('executes get-company-attributes via dispatcher', async () => {
    mockedCompanyAttributes.getCompanyAttributes.mockResolvedValue({ attributes: ['name'], company: 'TestCo' });
    const request = { method: 'tools/call' as const, params: { name: 'get-company-attributes', arguments: { companyId: 'c1' } } };
    const result = await executeToolRequest(request);
    expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('get-company-attributes');
    expect(mockedCompanyAttributes.getCompanyAttributes).toHaveBeenCalledWith('c1', undefined);
    expect(result.isError).toBeFalsy();
  });

  it('executes get-company-json via dispatcher', async () => {
    mockedCompanyAttributes.getCompanyDetails.mockResolvedValue({ id: { record_id: 'c1' }, values: { name: [{ value: 'TestCo' }] } });
    const request = { method: 'tools/call' as const, params: { name: 'get-company-json', arguments: { companyId: 'c1' } } };
    const result = await executeToolRequest(request);
    expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('get-company-json');
    expect(mockedCompanyAttributes.getCompanyDetails).toHaveBeenCalledWith('c1');
    expect(result.isError).toBeFalsy();
  });

  it('executes discover-company-attributes via dispatcher', async () => {
    mockedCompanyAttributes.discoverCompanyAttributes.mockResolvedValue({ standard: [], custom: [], all: [] });
    const request = { method: 'tools/call' as const, params: { name: 'discover-company-attributes', arguments: {} } };
    const result = await executeToolRequest(request);
    expect(mockedRegistry.findToolConfig).toHaveBeenCalledWith('discover-company-attributes');
    expect(mockedCompanyAttributes.discoverCompanyAttributes).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();
  });
});
