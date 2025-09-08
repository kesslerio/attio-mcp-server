import type { AttioRecord } from '../../types/attio.js';
import type { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';

export const ResponseNormalizer = {
  normalizeResponseFormat(
    resourceType: UniversalResourceType,
    record: AttioRecord
  ): AttioRecord {
    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid record format received for ${resourceType}: ${typeof record}`);
    }
    const normalized: AttioRecord = {
      id: record.id || { record_id: 'unknown' },
      values: record.values || {},
      created_at: record.created_at,
      updated_at: record.updated_at || new Date().toISOString(),
    };

    switch (resourceType) {
      case 'companies' as unknown as UniversalResourceType:
        return this.normalizeCompanyRecord(normalized);
      case 'people' as unknown as UniversalResourceType:
        return this.normalizePersonRecord(normalized);
      case 'lists' as unknown as UniversalResourceType:
        return this.normalizeListRecord(normalized);
      case 'tasks' as unknown as UniversalResourceType:
        return this.normalizeTaskRecord(normalized);
      case 'deals' as unknown as UniversalResourceType:
        return this.normalizeDealRecord(normalized);
      case 'records' as unknown as UniversalResourceType:
        return this.normalizeGenericRecord(normalized);
      default:
        return normalized;
    }
  },

  normalizeCompanyRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    return {
      ...record,
      id: { ...record.id, object_id: (idObj.object_id as string) || 'companies' },
      values: {
        ...record.values,
        domains: Array.isArray(record.values.domains)
          ? record.values.domains
          : record.values.domains
            ? [record.values.domains]
            : record.values.domains,
      },
    } as AttioRecord;
  },

  normalizePersonRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    const vals = record.values as Record<string, unknown>;
    return {
      ...record,
      id: { ...record.id, object_id: (idObj.object_id as string) || 'people' },
      values: {
        ...record.values,
        email_addresses: Array.isArray(vals.email_addresses)
          ? (vals.email_addresses as unknown[])
          : vals.email_addresses
            ? [vals.email_addresses]
            : vals.email_addresses,
        phone_numbers: Array.isArray(vals.phone_numbers)
          ? (vals.phone_numbers as unknown[])
          : vals.phone_numbers
            ? [vals.phone_numbers]
            : vals.phone_numbers,
      },
    } as AttioRecord;
  },

  normalizeListRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    return {
      ...record,
      id: {
        ...record.id,
        object_id: (idObj.object_id as string) || 'lists',
        list_id: (idObj.list_id as string) || (idObj.record_id as string),
      },
    } as AttioRecord;
  },

  normalizeTaskRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    const vals = record.values as Record<string, unknown>;
    return {
      ...record,
      id: {
        ...record.id,
        object_id: (idObj.object_id as string) || 'tasks',
        task_id: (idObj.task_id as string) || (idObj.record_id as string),
      },
      values: {
        ...record.values,
        content: (vals.content as string) || (vals.title as string),
        title: (vals.title as string) || (vals.content as string),
      },
    } as AttioRecord;
  },

  normalizeDealRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    const vals = record.values as Record<string, unknown>;
    return {
      ...record,
      id: { ...record.id, object_id: (idObj.object_id as string) || 'deals' },
      values: {
        ...record.values,
        value:
          vals.value && typeof vals.value === 'string'
            ? parseFloat(vals.value as string) || (vals.value as unknown)
            : vals.value,
      },
    } as AttioRecord;
  },

  normalizeGenericRecord(record: AttioRecord): AttioRecord {
    const idObj = (record.id as unknown as Record<string, unknown>) || {};
    return {
      ...record,
      id: { ...record.id, object_id: (idObj.object_id as string) || 'records' },
    } as AttioRecord;
  },
};
