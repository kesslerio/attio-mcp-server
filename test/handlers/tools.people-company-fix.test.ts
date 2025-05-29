/**
 * Unit tests for people-company search fix
 */
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import * as peopleModule from '../../src/objects/people/index';
import * as companiesModule from '../../src/objects/companies/index';

// Mock the modules
vi.mock('../../src/objects/people/index');
vi.mock('../../src/objects/companies/index');
vi.mock('../../src/api/attio-client');

const mockedPeopleModule = vi.mocked(peopleModule);
const mockedCompaniesModule = vi.mocked(companiesModule);

describe('People-Company Search Tool Fix', () => {
  const mockPeople = [
    {
      id: { record_id: '8b3b35f0-d811-5a4c-a555-0b4cfc5b4841' },
      values: { name: [{ value: 'John Doe' }] },
    },
    {
      id: { record_id: 'ad08494e-39b9-49f2-9dcb-3497c3a56015' },
      values: { name: [{ value: 'Jane Smith' }] },
    },
  ];

  const mockCompany = {
    id: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
    values: { name: [{ value: 'Oakwood Precision Medicine' }] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle search-people-by-company with company ID filter', async () => {
    // Mock searchPeopleByCompany function
    mockedPeopleModule.searchPeopleByCompany.mockResolvedValue(
      mockPeople
    );

    const request: CallToolRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'search-people-by-company',
        arguments: {
          companyFilter: {
            filters: [
              {
                attribute: { slug: 'companies.id' },
                condition: 'equals',
                value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
              },
            ],
          },
        },
      },
    };

    const result = await executeToolRequest(request);

    expect(mockedPeopleModule.searchPeopleByCompany).toHaveBeenCalledWith(
      '0c472146-9c7b-5fde-96cd-5df8e5cf9575'
    );
    expect(result.content).toContain(
      'Found 2 people matching the company filter'
    );
    expect(result.content).toContain('John Doe');
    expect(result.content).toContain('Jane Smith');
  });

  it('should handle search-people-by-company with company name filter', async () => {
    // Mock searchCompanies to return a company
    mockedCompaniesModule.searchCompanies.mockResolvedValue([
      mockCompany,
    ]);
    // Mock searchPeopleByCompany function
    mockedPeopleModule.searchPeopleByCompany.mockResolvedValue(
      mockPeople
    );

    const request: CallToolRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'search-people-by-company',
        arguments: {
          companyFilter: {
            filters: [
              {
                attribute: { slug: 'companies.name' },
                condition: 'equals',
                value: 'Oakwood Precision Medicine',
              },
            ],
          },
        },
      },
    };

    const result = await executeToolRequest(request);

    expect(mockedCompaniesModule.searchCompanies).toHaveBeenCalledWith(
      'Oakwood Precision Medicine'
    );
    expect(mockedPeopleModule.searchPeopleByCompany).toHaveBeenCalledWith(
      '0c472146-9c7b-5fde-96cd-5df8e5cf9575'
    );
    expect(result.content).toContain(
      'Found 2 people matching the company filter'
    );
  });

  it('should handle error when company not found', async () => {
    // Mock searchCompanies to return empty array
    mockedCompaniesModule.searchCompanies.mockResolvedValue([]);

    const request: CallToolRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'search-people-by-company',
        arguments: {
          companyFilter: {
            filters: [
              {
                attribute: { slug: 'companies.name' },
                condition: 'equals',
                value: 'Non-existent Company',
              },
            ],
          },
        },
      },
    };

    const result = await executeToolRequest(request);

    expect(mockedCompaniesModule.searchCompanies).toHaveBeenCalledWith(
      'Non-existent Company'
    );
    expect(result.content).toContain(
      'No company found with name: Non-existent Company'
    );
  });

  it('should handle invalid filter format', async () => {
    const request: CallToolRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'search-people-by-company',
        arguments: {
          companyFilter: {
            filters: [],
          },
        },
      },
    };

    const result = await executeToolRequest(request);

    expect(result.content).toContain('Invalid companyFilter format');
  });

  it('should handle multiple filters and use the first valid one', async () => {
    // Mock searchPeopleByCompany function
    mockedPeopleModule.searchPeopleByCompany.mockResolvedValue(
      mockPeople
    );

    const request: CallToolRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'search-people-by-company',
        arguments: {
          companyFilter: {
            filters: [
              {
                attribute: { slug: 'companies.unrecognized' },
                condition: 'equals',
                value: 'some value',
              },
              {
                attribute: { slug: 'companies.id' },
                condition: 'equals',
                value: { record_id: '0c472146-9c7b-5fde-96cd-5df8e5cf9575' },
              },
            ],
          },
        },
      },
    };

    const result = await executeToolRequest(request);

    expect(mockedPeopleModule.searchPeopleByCompany).toHaveBeenCalledWith(
      '0c472146-9c7b-5fde-96cd-5df8e5cf9575'
    );
    expect(result.content).toContain(
      'Found 2 people matching the company filter'
    );
  });
});
