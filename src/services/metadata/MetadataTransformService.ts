import { debug, OperationType } from '../../utils/logger.js';
import { isAttioAttribute } from '../../types/service-types.js';
import type { MetadataTransformService } from './types.js';

const LOGGER_SCOPE = 'MetadataTransformService';

export class DefaultMetadataTransformService
  implements MetadataTransformService
{
  parseAttributesResponse(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const dataArr = obj.data;
      if (Array.isArray(dataArr)) return dataArr;

      const attrs = obj.attributes;
      if (Array.isArray(attrs)) return attrs;

      const merged: unknown[] = [];
      const all = obj.all;
      const custom = obj.custom;
      const standard = obj.standard;

      if (Array.isArray(all)) merged.push(...all);
      if (Array.isArray(custom)) merged.push(...custom);
      if (Array.isArray(standard)) merged.push(...standard);

      if (merged.length > 0) {
        return merged;
      }
    }

    if (process.env.E2E_MODE === 'true') {
      debug(
        LOGGER_SCOPE,
        'Unrecognized attribute response shape, returning empty array',
        {
          receivedKeys:
            data && typeof data === 'object'
              ? Object.keys(data as Record<string, unknown>)
              : typeof data,
        },
        'parseAttributesResponse',
        OperationType.DATA_PROCESSING
      );
    }

    return [];
  }

  buildMappings(attributes: unknown[]): Record<string, string> {
    const mappings: Record<string, string> = {};
    attributes.forEach((attribute) => {
      if (isAttioAttribute(attribute)) {
        mappings[attribute.title] = attribute.api_slug;
      }
    });
    return mappings;
  }

  filterByCategory(
    attributes: Record<string, unknown> | unknown[],
    categories?: string[]
  ): Record<string, unknown> | unknown[] {
    if (!categories || categories.length === 0) {
      return attributes;
    }

    if (Array.isArray(attributes)) {
      const filtered = attributes.filter((attr) => {
        if (typeof attr !== 'object' || attr === null) {
          return false;
        }
        const attributeRecord = attr as Record<string, unknown>;
        const category =
          attributeRecord.category ??
          attributeRecord.type ??
          attributeRecord.attribute_type ??
          attributeRecord.group;

        return typeof category === 'string' && categories.includes(category);
      });
      return filtered;
    }

    if (typeof attributes === 'object' && attributes !== null) {
      const attributeRecord = attributes as Record<string, unknown>;

      if (Array.isArray(attributeRecord.attributes)) {
        const filtered = this.filterByCategory(
          attributeRecord.attributes as unknown[],
          categories
        );
        return {
          ...attributeRecord,
          attributes: filtered,
          count: Array.isArray(filtered) ? filtered.length : 0,
        };
      }

      if (Array.isArray(attributeRecord.all)) {
        const filtered = this.filterByCategory(
          attributeRecord.all as unknown[],
          categories
        );
        return {
          attributes: filtered,
          count: Array.isArray(filtered) ? filtered.length : 0,
        };
      }
    }

    return attributes;
  }
}
