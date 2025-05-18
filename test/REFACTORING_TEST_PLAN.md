# Refactoring Test Plan

## Overview
This test plan ensures comprehensive coverage of the recently refactored modules (companies and people) split into focused sub-modules.

## 1. Companies Module Testing

### Basic Module (`src/objects/companies/basic.ts`)
- [x] `createCompany` - Test with valid/invalid data, required fields
- [x] `updateCompany` - Test attribute updates, error handling
- [x] `deleteCompany` - Test successful deletion, error cases
- [x] `getCompanyDetails` - Test retrieval by ID
- [x] `listCompanies` - Test pagination, sorting

### Search Module (`src/objects/companies/search.ts`)
- [x] `searchCompanies` - Test name search
- [ ] `searchCompaniesWithFilters` - Test complex filters
- [ ] `searchCompaniesByDateRange` - Test date filtering
- [ ] `searchCompaniesByLocation` - Test location-based search
- [ ] `searchCompaniesByIndustry` - Test industry filtering

### Relationships Module (`src/objects/companies/relationships.ts`)
- [ ] `searchCompaniesByRelationship` - Test parent/child relationships
- [ ] `getCompanyRelationships` - Test retrieving all relationships
- [ ] `addCompanyRelationship` - Test adding new relationships
- [ ] `removeCompanyRelationship` - Test removing relationships

### Attributes Module (`src/objects/companies/attributes.ts`)
- [x] `updateCompanyAttribute` - Test single attribute update
- [ ] `getCompanyAttributes` - Test retrieving all attributes
- [ ] `validateCompanyAttributes` - Test attribute validation

### Notes Module (`src/objects/companies/notes.ts`)
- [x] `getCompanyNotes` - Test pagination, filtering
- [x] `createCompanyNote` - Test note creation with AI prefix
- [ ] `updateCompanyNote` - Test note updates
- [ ] `deleteCompanyNote` - Test note deletion

### Batch Module (`src/objects/companies/batch.ts`)
- [ ] `batchCreateCompanies` - Test batch creation
- [ ] `batchUpdateCompanies` - Test batch updates
- [ ] `batchDeleteCompanies` - Test batch deletion

## 2. People Module Testing

### Basic Module (`src/objects/people/basic.ts`)
- [ ] `createPerson` - Test with valid/invalid data
- [ ] `updatePerson` - Test attribute updates
- [ ] `deletePerson` - Test deletion
- [ ] `getPersonDetails` - Test retrieval by ID
- [ ] `listPeople` - Test listing with pagination

### Search Module (`src/objects/people/search.ts`)
- [ ] `searchPeople` - Test name search
- [ ] `searchPeopleWithFilters` - Test complex filters
- [ ] `searchPeopleByDateRange` - Test date filtering
- [ ] `searchPeopleByEmailOrPhone` - Test contact search
- [ ] `searchPeopleByLocation` - Test location filtering

### Relationships Module (`src/objects/people/relationships.ts`)
- [ ] `searchPeopleByRelationship` - Test relationship queries
- [ ] `getPersonRelationships` - Test retrieving relationships
- [ ] `addPersonRelationship` - Test adding relationships
- [ ] `removePersonRelationship` - Test removing relationships

### Batch Module (`src/objects/people/batch.ts`)
- [ ] `batchCreatePeople` - Test batch creation
- [ ] `batchUpdatePeople` - Test batch updates
- [ ] `batchDeletePeople` - Test batch deletion

### Notes Module (`src/objects/people/notes.ts`)
- [ ] `getPersonNotes` - Test pagination
- [ ] `createPersonNote` - Test note creation
- [ ] `updatePersonNote` - Test updates
- [ ] `deletePersonNote` - Test deletion

## 3. Integration Tests

### Cross-Module Integration
- [ ] Company-Person relationships
- [ ] Batch operations across modules
- [ ] Error propagation between modules
- [ ] Transaction rollback scenarios

### API Integration
- [ ] Real API call testing (with mocks)
- [ ] Error handling from API layer
- [ ] Rate limiting behavior
- [ ] Pagination consistency

## 4. Test Updates Required

### Import Path Updates
- [x] Update from `companies.js` to `companies/index`
- [x] Update from `people.js` to `people/index`
- [ ] Check all mock paths are correct

### Mock Updates
- [ ] Ensure mocks cover new module structure
- [ ] Add mocks for new sub-modules
- [ ] Update existing mocks to match new exports

### Type Updates
- [ ] Fix TypeScript compilation errors
- [ ] Add proper types for test mocks
- [ ] Update test expectations to match new types

## 5. Priority Testing Areas

### High Priority
1. Basic CRUD operations for both modules
2. Search functionality
3. Attribute validation
4. Error handling

### Medium Priority
1. Relationship queries
2. Batch operations
3. Note management

### Low Priority
1. Edge cases
2. Performance tests
3. Concurrent operations

## 6. Test Execution Strategy

1. **Fix existing failing tests** - Priority 1
2. **Add missing test coverage** - Priority 2
3. **Add integration tests** - Priority 3
4. **Performance testing** - Priority 4

## 7. Success Criteria

- All existing tests pass
- New module structure is fully tested
- Code coverage > 80% for refactored modules
- Integration tests verify module interactions
- No regressions in functionality