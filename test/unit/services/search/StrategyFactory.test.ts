/**
 * Unit tests for StrategyFactory
 * Issue #935: Tests for extracted strategy factory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

// Mock search strategies
vi.mock('@/services/search-strategies/index.js', () => ({
  CompanySearchStrategy: vi
    .fn()
    .mockImplementation(() => ({ search: vi.fn() })),
  PeopleSearchStrategy: vi.fn().mockImplementation(() => ({ search: vi.fn() })),
  DealSearchStrategy: vi.fn().mockImplementation(() => ({ search: vi.fn() })),
  TaskSearchStrategy: vi.fn().mockImplementation(() => ({ search: vi.fn() })),
  ListSearchStrategy: vi.fn().mockImplementation(() => ({ search: vi.fn() })),
  NoteSearchStrategy: vi.fn().mockImplementation(() => ({ search: vi.fn() })),
}));

// Mock SearchUtilities
vi.mock('@/services/search-utilities/SearchUtilities.js', () => ({
  SearchUtilities: {
    createDateFilter: vi.fn(),
    mergeFilters: vi.fn(),
    rankByRelevance: vi.fn(),
    getFieldValue: vi.fn(),
  },
}));

// Mock FunctionValidator
vi.mock('@/services/search-utilities/FunctionValidator.js', () => ({
  ensureFunctionAvailability: vi.fn((fn) => fn),
}));

// Mock API functions
vi.mock('@/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/objects/deals/index.js', () => ({
  advancedSearchDeals: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/objects/lists.js', () => ({
  searchLists: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/objects/tasks.js', () => ({
  listTasks: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/objects/notes.js', () => ({
  listNotes: vi.fn().mockResolvedValue([]),
}));

describe('StrategyFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear strategies between tests for isolation
    StrategyFactory.clearStrategies();
  });

  afterEach(() => {
    vi.clearAllMocks();
    StrategyFactory.clearStrategies();
  });

  describe('getStrategy', () => {
    it('should return a strategy for COMPANIES resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.COMPANIES
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return a strategy for PEOPLE resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.PEOPLE
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return a strategy for DEALS resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.DEALS
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return a strategy for TASKS resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.TASKS
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return a strategy for LISTS resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.LISTS
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return a strategy for NOTES resource type', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.NOTES
      );

      expect(strategy).toBeDefined();
      expect(strategy).toHaveProperty('search');
    });

    it('should return undefined for RECORDS resource type (no strategy)', async () => {
      const strategy = await StrategyFactory.getStrategy(
        UniversalResourceType.RECORDS
      );

      expect(strategy).toBeUndefined();
    });

    it('should return same strategy instance on subsequent calls', async () => {
      const strategy1 = await StrategyFactory.getStrategy(
        UniversalResourceType.COMPANIES
      );
      const strategy2 = await StrategyFactory.getStrategy(
        UniversalResourceType.COMPANIES
      );

      expect(strategy1).toBe(strategy2);
    });

    it('should initialize strategies lazily on first call', async () => {
      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        false
      );

      await StrategyFactory.getStrategy(UniversalResourceType.COMPANIES);

      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        true
      );
    });
  });

  describe('hasStrategy', () => {
    it('should return false before initialization', () => {
      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        false
      );
    });

    it('should return true after initialization for supported types', async () => {
      await StrategyFactory.getStrategy(UniversalResourceType.COMPANIES);

      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        true
      );
      expect(StrategyFactory.hasStrategy(UniversalResourceType.PEOPLE)).toBe(
        true
      );
      expect(StrategyFactory.hasStrategy(UniversalResourceType.DEALS)).toBe(
        true
      );
    });

    it('should return false for unsupported types after initialization', async () => {
      await StrategyFactory.getStrategy(UniversalResourceType.COMPANIES);

      expect(StrategyFactory.hasStrategy(UniversalResourceType.RECORDS)).toBe(
        false
      );
    });
  });

  describe('clearStrategies', () => {
    it('should clear all strategies', async () => {
      await StrategyFactory.getStrategy(UniversalResourceType.COMPANIES);
      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        true
      );

      StrategyFactory.clearStrategies();

      expect(StrategyFactory.hasStrategy(UniversalResourceType.COMPANIES)).toBe(
        false
      );
    });

    it('should allow re-initialization after clear', async () => {
      const strategy1 = await StrategyFactory.getStrategy(
        UniversalResourceType.COMPANIES
      );
      StrategyFactory.clearStrategies();
      const strategy2 = await StrategyFactory.getStrategy(
        UniversalResourceType.COMPANIES
      );

      // After clearing and re-initializing, should be new instance
      expect(strategy1).not.toBe(strategy2);
    });
  });
});
