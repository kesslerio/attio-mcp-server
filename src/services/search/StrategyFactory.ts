/**
 * StrategyFactory - Creates and initializes search strategies
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles strategy initialization with dependencies
 */

import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import {
  ISearchStrategy,
  CompanySearchStrategy,
  PeopleSearchStrategy,
  DealSearchStrategy,
  TaskSearchStrategy,
  ListSearchStrategy,
  NoteSearchStrategy,
  StrategyDependencies,
} from '@/services/search-strategies/index.js';
import { SearchUtilities } from '@/services/search-utilities/SearchUtilities.js';
import { ensureFunctionAvailability } from '@/services/search-utilities/FunctionValidator.js';
import { advancedSearchCompanies } from '@/objects/companies/index.js';
import { advancedSearchPeople } from '@/objects/people/index.js';
import { advancedSearchDeals } from '@/objects/deals/index.js';
import { searchLists } from '@/objects/lists.js';
import { listTasks } from '@/objects/tasks.js';
import { listNotes } from '@/objects/notes.js';

// Dynamic imports for better error handling
const ensureAdvancedSearchCompanies = () =>
  ensureFunctionAvailability(
    advancedSearchCompanies,
    'advancedSearchCompanies'
  );

const ensureAdvancedSearchPeople = () =>
  ensureFunctionAvailability(advancedSearchPeople, 'advancedSearchPeople');

const ensureAdvancedSearchDeals = () =>
  ensureFunctionAvailability(advancedSearchDeals, 'advancedSearchDeals');

/**
 * Factory for creating and managing search strategies
 */
export class StrategyFactory {
  private static strategies = new Map<UniversalResourceType, ISearchStrategy>();

  /**
   * Get or create a strategy for a resource type
   */
  static async getStrategy(
    resourceType: UniversalResourceType
  ): Promise<ISearchStrategy | undefined> {
    if (this.strategies.size === 0) {
      await this.initializeStrategies();
    }
    return this.strategies.get(resourceType);
  }

  /**
   * Initialize all search strategies with their dependencies
   */
  private static async initializeStrategies(): Promise<void> {
    if (this.strategies.size > 0) {
      return; // Already initialized
    }

    // Create dependencies for strategies
    const companyDependencies: StrategyDependencies = {
      advancedSearchFunction: await ensureAdvancedSearchCompanies(),
      createDateFilter: SearchUtilities.createDateFilter,
      mergeFilters: SearchUtilities.mergeFilters,
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const peopleDependencies: StrategyDependencies = {
      paginatedSearchFunction: await ensureAdvancedSearchPeople(),
      createDateFilter: SearchUtilities.createDateFilter,
      mergeFilters: SearchUtilities.mergeFilters,
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const dealDependencies: StrategyDependencies = {
      advancedSearchFunction: await ensureAdvancedSearchDeals(),
      createDateFilter: SearchUtilities.createDateFilter,
      mergeFilters: SearchUtilities.mergeFilters,
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const listDependencies: StrategyDependencies = {
      listFunction: (query?: string, limit?: number, offset?: number) =>
        searchLists(query || '', limit, offset),
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const taskDependencies: StrategyDependencies = {
      taskFunction: (
        status?: string,
        assigneeId?: string,
        page?: number,
        pageSize?: number
      ) => listTasks(status, assigneeId, page, pageSize),
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const noteDependencies: StrategyDependencies = {
      noteFunction: (query?: Record<string, unknown>) => listNotes(query || {}),
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    // Initialize strategies
    this.strategies.set(
      UniversalResourceType.COMPANIES,
      new CompanySearchStrategy(companyDependencies)
    );
    this.strategies.set(
      UniversalResourceType.PEOPLE,
      new PeopleSearchStrategy(peopleDependencies)
    );
    this.strategies.set(
      UniversalResourceType.DEALS,
      new DealSearchStrategy(dealDependencies)
    );
    this.strategies.set(
      UniversalResourceType.LISTS,
      new ListSearchStrategy(listDependencies)
    );
    this.strategies.set(
      UniversalResourceType.TASKS,
      new TaskSearchStrategy(taskDependencies)
    );
    this.strategies.set(
      UniversalResourceType.NOTES,
      new NoteSearchStrategy(noteDependencies)
    );
  }

  /**
   * Check if a resource type has a strategy
   */
  static hasStrategy(resourceType: UniversalResourceType): boolean {
    return this.strategies.has(resourceType);
  }

  /**
   * Clear all strategies (useful for testing)
   */
  static clearStrategies(): void {
    this.strategies.clear();
  }
}
