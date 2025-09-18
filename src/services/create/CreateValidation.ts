import type { AttioRecord } from '../../types/attio.js';
import { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import { shouldUseMockData } from '../create/index.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';
import { getObjectRecord } from '../../objects/records/index.js';
import { getTask } from '../../objects/tasks.js';
import { getCompanyDetails } from '../../objects/companies/index.js';
import { getPersonDetails } from '../../objects/people/basic.js';
import { getListDetails } from '../../objects/lists.js';

interface ListDetailsResponse {
  id: {
    list_id: string;
  };
  name?: string;
  title?: string;
  description?: string;
  object_slug?: string;
  parent_object?: string;
  api_slug?: string;
  workspace_id?: string;
  workspace_member_access?: string;
  created_at?: string;
}

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
          const list = (await getListDetails(recordId)) as ListDetailsResponse;
          return {
            id: {
              record_id: list.id.list_id,
              list_id: list.id.list_id,
            },
            values: {
              name: list.name || list.title,
              description: list.description,
              parent_object: list.object_slug || list.parent_object,
              api_slug: list.api_slug,
              workspace_id: list.workspace_id,
              workspace_member_access: list.workspace_member_access,
              created_at: list.created_at,
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
