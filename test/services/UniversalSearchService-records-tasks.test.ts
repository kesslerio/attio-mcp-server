/**
 * Split: UniversalSearchService records/tasks
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AttioRecord, AttioTask } from '../../src/types/attio.js';
import { AttioRecord, AttioTask } from '../../src/types/attio.js';
import { CachingService } from '../../src/services/CachingService.js';
import { CachingService } from '../../src/services/CachingService.js';
import { listObjectRecords } from '../../src/objects/records/index.js';
import { listObjectRecords } from '../../src/objects/records/index.js';
import { listTasks } from '../../src/objects/tasks.js';
import { listTasks } from '../../src/objects/tasks.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';

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

      resource_type: UniversalResourceType.TASKS,
      query: 'foo',
    });
    expect(result).toEqual(converted);
  });
});
