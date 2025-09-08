import type { AttioRecord } from '../../types/attio.js';
import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import { shouldUseMockData } from '../create/index.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';
import { getObjectRecord } from '../../objects/records/index.js';
import { getTask } from '../../objects/tasks.js';
import { getCompanyDetails } from '../../objects/companies/index.js';
import { getPersonDetails } from '../../objects/people/basic.js';
import { getListDetails } from '../../objects/lists.js';

export const CreateValidation = {
  sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string') out[k] = v;
      else if (Array.isArray(v)) out[k] = v.map((x) => (typeof x === 'string' ? x : x));
      else if (v && typeof v === 'object') out[k] = this.sanitize(v as Record<string, unknown>);
      else out[k] = v;
    }
    return out;
  },

  async verifyCreated(
    resourceType: UniversalResourceType,
    recordId: string
  ): Promise<AttioRecord | null> {
    if (shouldUseMockData()) return null;
    try {
      switch (resourceType) {
        case 'companies' as unknown as UniversalResourceType:
          return (await getCompanyDetails(recordId)) as unknown as AttioRecord;
        case 'people' as unknown as UniversalResourceType:
          return (await getPersonDetails(recordId)) as unknown as AttioRecord;
        case 'lists' as unknown as UniversalResourceType: {
          const list = await getListDetails(recordId);
          return {
            id: { record_id: (list as any).id.list_id, list_id: (list as any).id.list_id },
            values: {
              name: (list as any).name || (list as any).title,
              description: (list as any).description,
              parent_object: (list as any).object_slug || (list as any).parent_object,
              api_slug: (list as any).api_slug,
              workspace_id: (list as any).workspace_id,
              workspace_member_access: (list as any).workspace_member_access,
              created_at: (list as any).created_at,
            },
          } as unknown as AttioRecord;
        }
        case 'tasks' as unknown as UniversalResourceType:
          return UniversalUtilityService.convertTaskToRecord(await getTask(recordId));
        case 'deals' as unknown as UniversalResourceType:
          return await getObjectRecord('deals', recordId);
        case 'records' as unknown as UniversalResourceType:
          return await getObjectRecord('records', recordId);
        default:
          return null;
      }
    } catch {
      return null;
    }
  },
};

