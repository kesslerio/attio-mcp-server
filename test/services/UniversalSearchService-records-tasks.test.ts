/**
 * Split: UniversalSearchService records/tasks
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    validatePaginationParameters: vi.fn(),
    validateFiltersSchema: vi.fn(),
    validateUUIDForSearch: vi.fn().mockReturnValue(true),
  },
}));
vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadTasks: vi.fn().mockResolvedValue({ data: [], fromCache: false }),
    getCachedTasks: vi.fn(),
  },
}));
vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: { convertTaskToRecord: vi.fn() },
}));
vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn(() => 'perf-123'),
    markTiming: vi.fn(),
    markApiStart: vi.fn(() => 100),
    markApiEnd: vi.fn(),
    endOperation: vi.fn(),
  },
}));
vi.mock('../../src/objects/records/index.js', () => ({
  listObjectRecords: vi.fn(),
}));
vi.mock('../../src/objects/tasks.js', () => ({ listTasks: vi.fn() }));
vi.mock('../../src/services/MockService.js', () => ({
  MockService: { isUsingMockData: vi.fn().mockReturnValue(false) },
}));

import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../src/types/attio.js';
import { listObjectRecords } from '../../src/objects/records/index.js';
import { listTasks } from '../../src/objects/tasks.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { CachingService } from '../../src/services/CachingService.js';

describe('UniversalSearchService - records/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should list object records', async () => {
    const mockResults: AttioRecord[] = [
      { id: { record_id: 'rec_1' }, values: { name: 'R' } } as any,
    ];
    vi.mocked(listObjectRecords).mockResolvedValue(mockResults);
    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.RECORDS,
      query: 'R',
    });
    expect(result).toEqual(mockResults);
  });

  it('should list tasks and convert to records', async () => {
    const mockTasks: AttioTask[] = [{ id: { task_id: 't1' } } as any];
    const converted: AttioRecord[] = [
      { id: { record_id: 't1' }, values: {} } as any,
    ];
    vi.mocked(listTasks).mockResolvedValue(mockTasks as any);
    vi.mocked(UniversalUtilityService.convertTaskToRecord).mockReturnValue(
      converted[0] as any
    );
    // Mock CachingService to return the converted records
    vi.mocked(CachingService.getOrLoadTasks).mockResolvedValue({
      data: converted,
      fromCache: false,
    });

    const result = await UniversalSearchService.searchRecords({
      resource_type: UniversalResourceType.TASKS,
      query: 'foo',
    });
    expect(result).toEqual(converted);
  });
});
