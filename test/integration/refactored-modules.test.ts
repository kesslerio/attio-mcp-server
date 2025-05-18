import { 
  createCompany, 
  updateCompany, 
  searchCompanies,
  getCompanyDetails
} from '../../src/objects/companies/index';
import { 
  createPerson, 
  updatePerson, 
  searchPeople,
  getPersonDetails
} from '../../src/objects/people/index';
import * as attioClient from '../../src/api/attio-client';
import * as records from '../../src/objects/records';
import * as operations from '../../src/api/operations/index';
import * as attributeTypes from '../../src/api/attribute-types';
import { ResourceType } from '../../src/types/attio';

// Mock dependencies
jest.mock('../../src/api/attio-client');
jest.mock('../../src/objects/records');
jest.mock('../../src/api/operations/index');
jest.mock('../../src/api/attribute-types');

describe('Refactored Modules Integration', () => {
  const mockedAttioClient = attioClient as jest.Mocked<typeof attioClient>;
  const mockedRecords = records as jest.Mocked<typeof records>;
  const mockedOperations = operations as jest.Mocked<typeof operations>;
  const mockedAttributeTypes = attributeTypes as jest.Mocked<typeof attributeTypes>;
  
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.resetAllMocks();
    
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    };
    
    mockedAttioClient.getAttioClient.mockReturnValue(mockAxiosInstance);
    mockedOperations.callWithRetry.mockImplementation((fn: any) => fn());
    mockedOperations.searchObject.mockImplementation(async (resourceType, query) => {
      // Mock the response based on the query
      if (resourceType === ResourceType.COMPANIES && query === 'Test Corp') {
        return [{
          id: { record_id: 'company123' },
          values: {
            name: [{ value: 'Test Corp' }],
            website: [{ value: 'https://test.com' }]
          }
        }];
      }
      if (resourceType === ResourceType.PEOPLE && query === 'John') {
        return [{
          id: { record_id: 'person123' },
          values: {
            email_addresses: [{ address: 'john@example.com' }],
            name: [{ value: 'John Doe' }]
          }
        }];
      }
      return [];
    });
    
    // Mock getObjectDetails
    mockedOperations.getObjectDetails.mockImplementation(async (resourceType, id) => {
      if (resourceType === ResourceType.COMPANIES && id === 'company123') {
        return {
          id: { record_id: 'company123' },
          values: {
            name: [{ value: 'Test Corp' }],
            website: [{ value: 'https://test.com' }],
            industry: [{ value: 'Technology' }]
          }
        };
      }
      if (resourceType === ResourceType.PEOPLE && id === 'person123') {
        return {
          id: { record_id: 'person123' },
          values: {
            email_addresses: [{ address: 'john@example.com' }],
            name: [{ value: 'John Doe' }],
            phone: [{ value: '+1234567890' }]
          }
        };
      }
      throw new Error('Not found');
    });
    
    // Mock attribute type functions
    mockedAttributeTypes.detectFieldType.mockResolvedValue('string');
    mockedAttributeTypes.getObjectAttributeMetadata.mockResolvedValue(new Map());
    mockedAttributeTypes.formatAttributeValue.mockImplementation((attr, value) => Promise.resolve({ value }));
    mockedAttributeTypes.formatAllAttributes.mockImplementation((_, attrs) => {
      const formatted: any = {};
      for (const [key, value] of Object.entries(attrs)) {
        formatted[key] = { value };
      }
      return formatted;
    });
  });

  describe('Companies Module Integration', () => {
    it('should handle complete company lifecycle through refactored modules', async () => {
      // Create company
      const createData = { 
        name: 'Test Corp', 
        website: 'https://test.com' 
      };
      
      const createdCompany = {
        id: { record_id: 'company123' },
        values: {
          name: [{ value: 'Test Corp' }],
          website: [{ value: 'https://test.com' }]
        }
      };
      
      mockedRecords.createObjectRecord.mockResolvedValue(createdCompany);
      
      const created = await createCompany(createData);
      expect(created).toEqual(createdCompany);
      expect(mockedRecords.createObjectRecord).toHaveBeenCalledWith('companies', {
        name: { value: 'Test Corp' },
        website: { value: 'https://test.com' }
      });
      
      // Search for company
      const found = await searchCompanies('Test Corp');
      expect(found).toEqual([createdCompany]);
      expect(mockedOperations.searchObject).toHaveBeenCalledWith(ResourceType.COMPANIES, 'Test Corp');
      
      // Update company
      const updateData = { industry: 'Technology' };
      const updatedCompany = {
        ...createdCompany,
        values: {
          ...createdCompany.values,
          industry: [{ value: 'Technology' }]
        }
      };
      
      mockedRecords.updateObjectRecord.mockResolvedValue(updatedCompany);
      
      const updated = await updateCompany('company123', updateData);
      expect(updated).toEqual(updatedCompany);
      
      // Get details
      mockAxiosInstance.get.mockResolvedValue({ data: updatedCompany });
      
      const details = await getCompanyDetails('company123');
      expect(details).toEqual(updatedCompany);
    });
  });

  describe('People Module Integration', () => {
    it('should handle complete person lifecycle through refactored modules', async () => {
      // Create person
      const createData = { 
        email_addresses: ['john@example.com'],
        name: 'John Doe'
      };
      
      const createdPerson = {
        id: { record_id: 'person123' },
        values: {
          email_addresses: [{ address: 'john@example.com' }],
          name: [{ value: 'John Doe' }]
        }
      };
      
      mockedRecords.createObjectRecord.mockResolvedValue(createdPerson);
      
      const created = await createPerson(createData);
      expect(created).toEqual(createdPerson);
      expect(mockedRecords.createObjectRecord).toHaveBeenCalledWith('people', {
        email_addresses: { value: ['john@example.com'] },
        name: { value: 'John Doe' }
      });
      
      // Search for person
      const found = await searchPeople('John');
      expect(found).toEqual([createdPerson]);
      expect(mockedOperations.searchObject).toHaveBeenCalledWith(ResourceType.PEOPLE, 'John');
      
      // Update person
      const updateData = { phone: '+1234567890' };
      const updatedPerson = {
        ...createdPerson,
        values: {
          ...createdPerson.values,
          phone: [{ value: '+1234567890' }]
        }
      };
      
      mockedRecords.updateObjectRecord.mockResolvedValue(updatedPerson);
      
      const updated = await updatePerson('person123', updateData);
      expect(updated).toEqual(updatedPerson);
      
      // Get details
      mockAxiosInstance.get.mockResolvedValue({ data: updatedPerson });
      
      const details = await getPersonDetails('person123');
      expect(details).toEqual(updatedPerson);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should handle operations across both refactored modules', async () => {
      // Create company and person
      const company = {
        id: { record_id: 'company456' },
        values: { name: [{ value: 'Acme Corp' }] }
      };
      
      const person = {
        id: { record_id: 'person456' },
        values: { 
          email_addresses: [{ address: 'jane@example.com' }],
          name: [{ value: 'Jane Smith' }]
        }
      };
      
      mockedRecords.createObjectRecord
        .mockResolvedValueOnce(company)
        .mockResolvedValueOnce(person);
      
      const createdCompany = await createCompany({ name: 'Acme Corp' });
      const createdPerson = await createPerson({ 
        email_addresses: ['jane@example.com'],
        name: 'Jane Smith'
      });
      
      expect(createdCompany).toEqual(company);
      expect(createdPerson).toEqual(person);
      
      // Verify both modules use the same underlying infrastructure
      expect(mockedRecords.createObjectRecord).toHaveBeenCalledTimes(2);
      expect(mockedRecords.createObjectRecord).toHaveBeenNthCalledWith(1, 'companies', { 
        name: { value: 'Acme Corp' } 
      });
      expect(mockedRecords.createObjectRecord).toHaveBeenNthCalledWith(2, 'people', { 
        email_addresses: { value: ['jane@example.com'] },
        name: { value: 'Jane Smith' }
      });
    });
  });
});