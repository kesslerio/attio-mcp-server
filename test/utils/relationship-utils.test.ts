/**
 * Tests for relationship utility functions
 */
import { 
  RelationshipType,
  createPeopleByCompanyFilter,
  createCompaniesByPeopleFilter,
  createRecordsByListFilter,
  createPeopleByCompanyListFilter,
  createCompaniesByPeopleListFilter,
  createRecordsByNotesFilter
} from '../../src/utils/relationship-utils';
import { ResourceType, FilterConditionType } from '../../src/types/attio';
import { ListEntryFilters } from '../../src/api/attio-operations';
import { FilterValidationError } from '../../src/errors/api-errors';

describe('Relationship Utilities', () => {
  describe('createPeopleByCompanyFilter', () => {
    it('should create a valid relationship filter for people by company', () => {
      // Create a sample company filter
      const companyFilter: ListEntryFilters = {
        filters: [
          {
            attribute: { slug: 'industry' },
            condition: FilterConditionType.EQUALS,
            value: 'Technology'
          }
        ],
        matchAny: false
      };
      
      // Generate the relationship filter
      const result = createPeopleByCompanyFilter(companyFilter);
      
      // Verify the structure
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.WORKS_AT);
      expect(relationshipValue.target.object).toBe('companies');
      expect(relationshipValue.target.filter).toEqual(companyFilter);
    });
    
    it('should throw an error if company filter is invalid', () => {
      // Test with an empty filter
      const emptyFilter = { filters: [] };
      
      // Expect it to throw a FilterValidationError
      expect(() => createPeopleByCompanyFilter(emptyFilter)).toThrow(FilterValidationError);
    });
  });
  
  describe('createCompaniesByPeopleFilter', () => {
    it('should create a valid relationship filter for companies by people', () => {
      // Create a sample people filter
      const peopleFilter: ListEntryFilters = {
        filters: [
          {
            attribute: { slug: 'job_title' },
            condition: FilterConditionType.CONTAINS,
            value: 'Engineer'
          }
        ],
        matchAny: false
      };
      
      // Generate the relationship filter
      const result = createCompaniesByPeopleFilter(peopleFilter);
      
      // Verify the structure
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.EMPLOYS);
      expect(relationshipValue.target.object).toBe('people');
      expect(relationshipValue.target.filter).toEqual(peopleFilter);
    });
    
    it('should throw an error if people filter is invalid', () => {
      // Test with an empty filter
      const emptyFilter = { filters: [] };
      
      // Expect it to throw a FilterValidationError
      expect(() => createCompaniesByPeopleFilter(emptyFilter)).toThrow(FilterValidationError);
    });
  });
  
  describe('createRecordsByListFilter', () => {
    it('should create a valid filter for records by list ID', () => {
      const listId = 'list_abc123';
      const resourceType = ResourceType.PEOPLE;
      
      // Generate the relationship filter
      const result = createRecordsByListFilter(resourceType, listId);
      
      // Verify the structure
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.BELONGS_TO_LIST);
      expect(relationshipValue.target.object).toBe('lists');
      
      // Check the target filter (should be an equals filter on list_id)
      const targetFilter = relationshipValue.target.filter;
      expect(targetFilter.filters).toHaveLength(1);
      expect(targetFilter.filters[0].attribute.slug).toBe('list_id');
      expect(targetFilter.filters[0].condition).toBe(FilterConditionType.EQUALS);
      expect(targetFilter.filters[0].value).toBe(listId);
    });
    
    it('should throw an error if list ID is empty', () => {
      // Test with an empty list ID
      const emptyListId = '';
      const resourceType = ResourceType.PEOPLE;
      
      // Expect it to throw a FilterValidationError
      expect(() => createRecordsByListFilter(resourceType, emptyListId)).toThrow(FilterValidationError);
    });
  });
  
  describe('createPeopleByCompanyListFilter', () => {
    it('should create a valid filter for people by company list', () => {
      const listId = 'list_abc123';
      
      // Generate the relationship filter
      const result = createPeopleByCompanyListFilter(listId);
      
      // Verify the structure is a nested relationship filter
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration (people who work at companies)
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.WORKS_AT);
      expect(relationshipValue.target.object).toBe('companies');
      
      // Check that the target filter is another relationship filter (companies in list)
      const targetFilter = relationshipValue.target.filter;
      expect(targetFilter.filters).toHaveLength(1);
      expect(targetFilter.filters[0].attribute.slug).toBe('$relationship');
      
      // Check the nested relationship (company belongs to list)
      const nestedRelationship = targetFilter.filters[0].value as any;
      expect(nestedRelationship.type).toBe(RelationshipType.BELONGS_TO_LIST);
      expect(nestedRelationship.target.object).toBe('lists');
      
      // Check the list ID filter
      const listFilter = nestedRelationship.target.filter;
      expect(listFilter.filters[0].attribute.slug).toBe('list_id');
      expect(listFilter.filters[0].value).toBe(listId);
    });
    
    it('should throw an error if list ID is empty', () => {
      // Test with an empty list ID
      const emptyListId = '';
      
      // Expect it to throw a FilterValidationError
      expect(() => createPeopleByCompanyListFilter(emptyListId)).toThrow(FilterValidationError);
    });
  });
  
  describe('createCompaniesByPeopleListFilter', () => {
    it('should create a valid filter for companies by people list', () => {
      const listId = 'list_xyz789';
      
      // Generate the relationship filter
      const result = createCompaniesByPeopleListFilter(listId);
      
      // Verify the structure is a nested relationship filter
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration (companies that employ people)
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.EMPLOYS);
      expect(relationshipValue.target.object).toBe('people');
      
      // Check that the target filter is another relationship filter (people in list)
      const targetFilter = relationshipValue.target.filter;
      expect(targetFilter.filters).toHaveLength(1);
      expect(targetFilter.filters[0].attribute.slug).toBe('$relationship');
      
      // Check the nested relationship (person belongs to list)
      const nestedRelationship = targetFilter.filters[0].value as any;
      expect(nestedRelationship.type).toBe(RelationshipType.BELONGS_TO_LIST);
      expect(nestedRelationship.target.object).toBe('lists');
      
      // Check the list ID filter
      const listFilter = nestedRelationship.target.filter;
      expect(listFilter.filters[0].attribute.slug).toBe('list_id');
      expect(listFilter.filters[0].value).toBe(listId);
    });
    
    it('should throw an error if list ID is empty', () => {
      // Test with an empty list ID
      const emptyListId = '';
      
      // Expect it to throw a FilterValidationError
      expect(() => createCompaniesByPeopleListFilter(emptyListId)).toThrow(FilterValidationError);
    });
  });
  
  describe('createRecordsByNotesFilter', () => {
    it('should create a valid filter for records by note content', () => {
      const searchText = 'follow up next quarter';
      const resourceType = ResourceType.PEOPLE;
      
      // Generate the relationship filter
      const result = createRecordsByNotesFilter(resourceType, searchText);
      
      // Verify the structure
      expect(result).toBeDefined();
      expect(result.filters).toHaveLength(1);
      
      const relationshipFilter = result.filters[0];
      expect(relationshipFilter.attribute.slug).toBe('$relationship');
      expect(relationshipFilter.condition).toBe(FilterConditionType.EQUALS);
      
      // Check the relationship configuration
      const relationshipValue = relationshipFilter.value as any;
      expect(relationshipValue.type).toBe(RelationshipType.HAS_NOTE);
      
      // Check the note content filter
      const noteFilter = relationshipValue.target.filter;
      expect(noteFilter.filters).toHaveLength(1);
      expect(noteFilter.filters[0].attribute.slug).toBe('note_content');
      expect(noteFilter.filters[0].condition).toBe(FilterConditionType.CONTAINS);
      expect(noteFilter.filters[0].value).toBe(searchText);
    });
    
    it('should throw an error if search text is empty', () => {
      // Test with an empty search text
      const emptySearchText = '';
      const resourceType = ResourceType.PEOPLE;
      
      // Expect it to throw a FilterValidationError
      expect(() => createRecordsByNotesFilter(resourceType, emptySearchText)).toThrow(FilterValidationError);
    });
  });
});