/**
 * Search strategies index file
 * Issue #574: Export all search strategy implementations
 */

export type {
  ISearchStrategy,
  SearchStrategyParams,
  StrategyDependencies,
  TimeframeParams,
} from './interfaces.js';
export { BaseSearchStrategy } from './BaseSearchStrategy.js';
export { CompanySearchStrategy } from './CompanySearchStrategy.js';
export { PeopleSearchStrategy } from './PeopleSearchStrategy.js';
export { DealSearchStrategy } from './DealSearchStrategy.js';
export { TaskSearchStrategy } from './TaskSearchStrategy.js';
export { ListSearchStrategy } from './ListSearchStrategy.js';
export { NoteSearchStrategy } from './NoteSearchStrategy.js';
