import type { AttioRecord } from '../../types/attio.js';
import { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
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
      else if (Array.isArray(v))
        out[k] = v.map((x) => (typeof x === 'string' ? x : x));
      else if (v && typeof v === 'object')
        out[k] = this.sanitize(v as Record<string, unknown>);
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
        case UniversalResourceType.COMPANIES:
          return (await getCompanyDetails(recordId)) as unknown as AttioRecord;
        case UniversalResourceType.PEOPLE:
          return (await getPersonDetails(recordId)) as unknown as AttioRecord;
        case UniversalResourceType.LISTS: {
          const list = await getListDetails(recordId);
          return {
            id: {
              record_id: (
                (list as Record<string, unknown>).id as Record<string, unknown>
              )?.list_id,
              list_id: (
                (list as Record<string, unknown>).id as Record<string, unknown>
              )?.list_id,
            },
            values: {
              name:
                (list as Record<string, unknown>).name ||
                (list as Record<string, unknown>).title,
              description: (list as Record<string, unknown>).description,
              parent_object:
                (list as Record<string, unknown>).object_slug ||
                (list as Record<string, unknown>).parent_object,
              api_slug: (list as Record<string, unknown>).api_slug,
              workspace_id: (list as Record<string, unknown>).workspace_id,
              workspace_member_access: (list as Record<string, unknown>)
                .workspace_member_access,
              created_at: (list as Record<string, unknown>).created_at,
            },
          } as unknown as AttioRecord;
        }
        case UniversalResourceType.TASKS:
          return UniversalUtilityService.convertTaskToRecord(
            await getTask(recordId)
          );
        case UniversalResourceType.DEALS:
          return await getObjectRecord('deals', recordId);
        case UniversalResourceType.RECORDS:
          return await getObjectRecord('records', recordId);
        default:
          return null;
      }
    } catch {
      return null;
    }
  },
};
