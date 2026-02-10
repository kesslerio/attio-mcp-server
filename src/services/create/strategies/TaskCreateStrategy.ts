import type { AttioRecord } from '../../../types/attio.js';
import type {
  CreateStrategy,
  CreateStrategyParams,
} from './BaseCreateStrategy.js';
import { getCreateService } from '../../create/index.js';

// Creates tasks by translating high-level fields to service API fields.
// Mapping overview:
// - content/title: ensure non-empty `content`; default in E2E
// - assignees -> assigneeId: accept array/object/string and extract an identifier
// - deadline_at -> dueDate
// - linked_records -> linked_records (Attio API format) or recordId (legacy)
// - targetObject: forwarded unchanged (used by downstream service)
export class TaskCreateStrategy implements CreateStrategy<AttioRecord> {
  async create(params: CreateStrategyParams): Promise<AttioRecord> {
    const { values } = params;
    const payload = { ...(values as Record<string, unknown>) };
    if (!payload.content && typeof payload.title === 'string') {
      payload.content = payload.title;
    }
    if (typeof payload.content === 'string' && payload.content.trim() === '') {
      if (typeof payload.title === 'string' && payload.title.trim() !== '') {
        payload.content = payload.title;
      } else if (process.env.E2E_MODE === 'true') {
        payload.content = 'New task';
      }
    }
    // Respect mock mode for E2E/unit predictability (Issue #480 compatibility)
    // Transform fields to service-expected names
    const out: Record<string, unknown> = {};
    // content handled above
    out.content = payload.content;
    // assignees -> assigneeId
    if (payload.assignees !== undefined) {
      const v = payload.assignees as unknown;
      let id: string | undefined;
      if (Array.isArray(v as unknown[])) {
        const first = (v as unknown[])[0] as unknown;
        if (typeof first === 'string') id = first as string;
        else if (first && typeof first === 'object') {
          const fo = first as Record<string, unknown>;
          id =
            (fo.referenced_actor_id as string) ||
            (fo.id as string) ||
            (fo.record_id as string) ||
            (fo.value as string);
        }
      } else if (typeof v === 'string') id = v as string;
      else if (v && typeof v === 'object') {
        const vo = v as Record<string, unknown>;
        id =
          (vo.referenced_actor_id as string) ||
          (vo.id as string) ||
          (vo.record_id as string) ||
          (vo.value as string);
      }
      if (id) out.assigneeId = id;
    }
    // deadline_at -> dueDate
    if (payload.deadline_at !== undefined) out.dueDate = payload.deadline_at;
    // linked_records/record_id -> linked_records or recordId (#1098)
    // Forward the full linked_records array when items use Attio API format
    // (target_object + target_record_id), otherwise fall back to recordId extraction
    if (payload.linked_records !== undefined) {
      const lr = payload.linked_records as unknown;
      if (Array.isArray(lr)) {
        const first = lr[0] as unknown;
        // Detect Attio API format: { target_object, target_record_id }
        if (
          first &&
          typeof first === 'object' &&
          'target_record_id' in (first as Record<string, unknown>)
        ) {
          // Forward the entire array for multi-record linking support
          out.linked_records = lr;
        } else if (typeof first === 'string') {
          out.recordId = first as string;
        } else if (first && typeof first === 'object') {
          const lo = first as Record<string, unknown>;
          out.recordId =
            (lo.target_record_id as string) ||
            (lo.record_id as string) ||
            (lo.id as string);
        }
      } else if (typeof lr === 'string') {
        out.recordId = lr as string;
      } else if (lr && typeof lr === 'object') {
        const lo = lr as Record<string, unknown>;
        out.recordId =
          (lo.target_record_id as string) ||
          (lo.record_id as string) ||
          (lo.id as string);
      }
    } else if (payload.record_id !== undefined) {
      out.recordId = payload.record_id as string;
    }
    // forward targetObject if present
    if (payload.targetObject !== undefined) {
      out.targetObject = payload.targetObject;
    }

    const service = getCreateService();
    try {
      return (await service.createTask(out)) as unknown as AttioRecord;
    } catch (e: unknown) {
      const { ErrorEnhancer } =
        await import('../../../errors/enhanced-api-errors.js');
      const err = e instanceof Error ? e : new Error(String(e));
      const enhanced = ErrorEnhancer.autoEnhance(err, 'tasks', 'create-record');
      throw enhanced;
    }
  }
}
