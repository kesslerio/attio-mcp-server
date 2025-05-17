/**
 * Performance tests for relationship filters
 * 
 * These tests measure the performance of various relationship filter operations,
 * especially the nested ones which can be more computationally intensive.
 * 
 * Note: These tests do not make actual API calls, but rather measure the 
 * creation time of filter objects and the efficiency of caching.
 */
import { 
  ResourceType,
  RelationshipType
} from '../../src/types/attio';
import { ListEntryFilters } from '../../src/api/operations/index';
import { FilterValidationError } from '../../src/errors/api-errors';
import * as Filters from '../../src/utils/filters';
import { 
  getCachedListFilter, 
  getCachedRelationshipFilter,
  clearAllCaches,
  getRelationshipCacheStats 
} from '../../src/utils/filters/cache';

describe('Relationship Filter Performance Tests', () => {
  // Reset cache between tests
  beforeEach(() => {
    clearAllCaches();
  });

  describe('List membership filters', () => {
    it('should measure creation time for simple list filter', () => {
      const listId = 'list_performance123';
      const resourceType = ResourceType.PEOPLE;
      
      // Measure first execution (no cache)
      const startTime = performance.now();
      const filter = Filters.Relationship.createRecordsByListFilter(resourceType, listId);
      const endTime = performance.now();
      
      // Calculate time
      const executionTimeMs = endTime - startTime;
      
      // Log performance
      console.log(`List filter creation time: ${executionTimeMs.toFixed(3)}ms`);
      
      // Verify correct result
      expect(filter).toBeDefined();
      expect(filter.filters?.length).toBe(1);
    });
    
    it('should measure performance with and without cache', () => {
      const listId = 'list_performance456';
      const resourceType = ResourceType.COMPANIES;
      
      // First execution (no cache)
      const startTimeNoCache = performance.now();
      const filterNoCache = Filters.Relationship.createRecordsByListFilter(resourceType, listId);
      const endTimeNoCache = performance.now();
      const executionTimeNoCache = endTimeNoCache - startTimeNoCache;
      
      // Second execution (with cache)
      const startTimeCache = performance.now();
      const filterCache = Filters.Relationship.createRecordsByListFilter(resourceType, listId);
      const endTimeCache = performance.now();
      const executionTimeCache = endTimeCache - startTimeCache;
      
      // Log performance
      console.log(`List filter creation time (no cache): ${executionTimeNoCache.toFixed(3)}ms`);
      console.log(`List filter creation time (with cache): ${executionTimeCache.toFixed(3)}ms`);
      console.log(`Cache speedup: ${(executionTimeNoCache / executionTimeCache).toFixed(2)}x`);
      
      // Verify cache hit
      expect(executionTimeCache).toBeLessThan(executionTimeNoCache);
    });
  });
  
  describe('Nested relationship filters', () => {
    it('should measure creation time for people by company list filter', () => {
      const listId = 'list_performance789';
      
      // Measure first execution (no cache)
      const startTime = performance.now();
      const filter = Filters.Relationship.createPeopleByCompanyListFilter(listId);
      const endTime = performance.now();
      
      // Calculate time
      const executionTimeMs = endTime - startTime;
      
      // Log performance
      console.log(`People by company list filter creation time: ${executionTimeMs.toFixed(3)}ms`);
      
      // Verify correct result
      expect(filter).toBeDefined();
      expect(filter.filters?.length).toBe(1);
    });
    
    it('should measure creation time for companies by people list filter', () => {
      const listId = 'list_performance101112';
      
      // Measure first execution (no cache)
      const startTime = performance.now();
      const filter = Filters.Relationship.createCompaniesByPeopleListFilter(listId);
      const endTime = performance.now();
      
      // Calculate time
      const executionTimeMs = endTime - startTime;
      
      // Log performance
      console.log(`Companies by people list filter creation time: ${executionTimeMs.toFixed(3)}ms`);
      
      // Verify correct result
      expect(filter).toBeDefined();
      expect(filter.filters?.length).toBe(1);
    });
    
    it('should measure nested filter performance with and without cache', () => {
      const listId = 'list_performance131415';
      
      // First execution (no cache)
      const startTimeNoCache = performance.now();
      const filterNoCache = Filters.Relationship.createPeopleByCompanyListFilter(listId);
      const endTimeNoCache = performance.now();
      const executionTimeNoCache = endTimeNoCache - startTimeNoCache;
      
      // Second execution (with cache)
      const startTimeCache = performance.now();
      const filterCache = Filters.Relationship.createPeopleByCompanyListFilter(listId);
      const endTimeCache = performance.now();
      const executionTimeCache = endTimeCache - startTimeCache;
      
      // Log performance
      console.log(`Nested filter creation time (no cache): ${executionTimeNoCache.toFixed(3)}ms`);
      console.log(`Nested filter creation time (with cache): ${executionTimeCache.toFixed(3)}ms`);
      console.log(`Cache speedup: ${(executionTimeNoCache / executionTimeCache).toFixed(2)}x`);
      
      // Verify cache hit
      expect(executionTimeCache).toBeLessThan(executionTimeNoCache);
    });
  });
  
  describe('Filter complexity performance', () => {
    it('should compare performance of simple vs nested relationship filters', () => {
      const listId = 'list_performance161718';
      const resourceType = ResourceType.PEOPLE;
      
      // Measure simple list filter creation time
      const startTimeSimple = performance.now();
      const simpleFilter = Filters.Relationship.createRecordsByListFilter(resourceType, listId);
      const endTimeSimple = performance.now();
      const executionTimeSimple = endTimeSimple - startTimeSimple;
      
      // Measure nested relationship filter creation time
      const startTimeNested = performance.now();
      const nestedFilter = Filters.Relationship.createPeopleByCompanyListFilter(listId);
      const endTimeNested = performance.now();
      const executionTimeNested = endTimeNested - startTimeNested;
      
      // Log performance
      console.log(`Simple filter creation time: ${executionTimeSimple.toFixed(3)}ms`);
      console.log(`Nested filter creation time: ${executionTimeNested.toFixed(3)}ms`);
      console.log(`Complexity ratio: ${(executionTimeNested / executionTimeSimple).toFixed(2)}x`);
      
      // Verify both filters are created
      expect(simpleFilter).toBeDefined();
      expect(nestedFilter).toBeDefined();
      
      // A nested filter should typically take longer to create
      expect(executionTimeNested).toBeGreaterThan(executionTimeSimple);
    });
    
    it('should measure performance of very complex nested relationship filter', () => {
      const listId1 = 'list_performance192021';
      const listId2 = 'list_performance222324';
      
      // Create a two-level deep nested relationship filter
      // This simulates an advanced query like:
      // "Find companies that employ people who work with companies in a specific list"
      
      const startTime = performance.now();
      
      // Create base list filter
      const companiesInList = Filters.Relationship.createRecordsByListFilter(
        ResourceType.COMPANIES, 
        listId1
      );
      
      // Create first level relationship filter
      const peopleWorkingAtThoseCompanies = Filters.Relationship.createPeopleByCompanyFilter(
        companiesInList
      );
      
      // Create second level relationship filter
      const companiesEmployingThosePeople = Filters.Relationship.createCompaniesByPeopleFilter(
        peopleWorkingAtThoseCompanies
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Log performance
      console.log(`Very complex filter creation time: ${executionTime.toFixed(3)}ms`);
      
      // Verify filter structure
      expect(companiesEmployingThosePeople).toBeDefined();
      expect(companiesEmployingThosePeople.filters?.length).toBe(1);
    });
  });
  
  describe('Cache efficiency', () => {
    it('should test cache hit rate for repeated similar queries', () => {
      const queryCount = 20;
      const listIds = Array.from({ length: 5 }, (_, i) => `list_performance_${i + 25}`);
      
      let cacheHits = 0;
      let cacheMisses = 0;
      
      // Run a series of queries with some repeating and some unique
      for (let i = 0; i < queryCount; i++) {
        // Select list ID (cycle through the available IDs to create repeats)
        const listId = listIds[i % listIds.length];
        
        // Clear all caches for the first half of queries
        // This helps test that the cache is correctly populated
        if (i === queryCount / 2) {
          clearAllCaches();
        }
        
        // Check if this filter is already in cache
        const cacheKey = {
          relationshipType: RelationshipType.WORKS_AT,
          sourceType: ResourceType.PEOPLE,
          targetType: ResourceType.COMPANIES,
          targetFilterHash: "",
          listId: listId,
          isNested: true
        };
        
        const cachedResult = getCachedRelationshipFilter(cacheKey);
        
        // Track cache hit/miss
        if (cachedResult) {
          cacheHits++;
        } else {
          cacheMisses++;
          
          // Create filter since it's not in cache
          Filters.Relationship.createPeopleByCompanyListFilter(listId);
        }
      }
      
      // Get cache stats
      const cacheStats = getRelationshipCacheStats();
      
      // Log results
      console.log(`Cache hits: ${cacheHits}, Cache misses: ${cacheMisses}`);
      console.log(`Cache hit rate: ${(cacheHits / queryCount * 100).toFixed(1)}%`);
      console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
      
      // Verify cache is being used
      expect(cacheHits).toBeGreaterThan(0);
    });
  });
});