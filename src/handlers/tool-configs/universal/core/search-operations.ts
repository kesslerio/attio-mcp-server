import {
  UniversalToolConfig,
  UniversalSearchParams,
  UniversalResourceType,
} from '../types.js';
import { AttioRecord } from '../../../../types/attio.js';
import { getPluralResourceType } from './utils.js';
import {
  validateUniversalToolParams,
  searchRecordsSchema,
} from '../schemas.js';
import { handleCoreOperationError } from '../../../../utils/axios-error-mapper.js';
import { handleUniversalSearch } from '../shared-handlers.js';

/**
 * Universal search records tool configuration.
 * Consolidates: search-companies, search-people, list-records, list-tasks.
 */
export const searchRecordsConfig: UniversalToolConfig = {
  name: 'search-records',
  handler: async (params: UniversalSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-records',
        params
      );
      return await handleUniversalSearch(sanitizedParams);
    } catch (error: unknown) {
      return await handleCoreOperationError(
        error,
        'search',
        params.resource_type
      );
    }
  },
  formatResult: (
    results: AttioRecord[] | { data: AttioRecord[] },
    resourceType?: UniversalResourceType
  ): string => {
    if (!results) {
      const typeName = resourceType
        ? getPluralResourceType(resourceType)
        : 'records';
      return `Found 0 ${typeName}`;
    }

    const recordsArray = Array.isArray(results)
      ? results
      : (results?.data ?? []);

    if (!Array.isArray(recordsArray) || recordsArray.length === 0) {
      const typeName = resourceType
        ? getPluralResourceType(resourceType)
        : 'records';
      return `Found 0 ${typeName}`;
    }

    const typeName = resourceType
      ? getPluralResourceType(resourceType)
      : 'records';

    const formattedResults = recordsArray
      .map((record, index) => {
        let identifier = 'Unnamed';
        let id = String(record.id?.record_id || 'unknown');

        const values = record.values || {};
        const getFirstValue = (field: unknown): string | undefined => {
          if (!field || !Array.isArray(field) || field.length === 0)
            return undefined;
          const firstItem = field[0] as { value?: string };
          return firstItem &&
            typeof firstItem === 'object' &&
            firstItem !== null &&
            'value' in firstItem
            ? String(firstItem.value)
            : undefined;
        };

        if (resourceType === UniversalResourceType.TASKS) {
          identifier =
            typeof values.content === 'string'
              ? values.content
              : getFirstValue(values.content) || 'Unnamed';
          id = String(record.id?.task_id || record.id?.record_id || 'unknown');
        } else if (resourceType === UniversalResourceType.PEOPLE) {
          const valuesAny = values as Record<string, unknown>;
          const name =
            (valuesAny?.name as { full_name?: string }[] | undefined)?.[0]
              ?.full_name ||
            (valuesAny?.name as { value?: string }[] | undefined)?.[0]?.value ||
            (valuesAny?.name as { formatted?: string }[] | undefined)?.[0]
              ?.formatted ||
            (valuesAny?.full_name as { value?: string }[] | undefined)?.[0]
              ?.value ||
            getFirstValue(values.name) ||
            'Unnamed';

          const emailValue =
            (
              valuesAny?.email_addresses as
                | { email_address?: string }[]
                | undefined
            )?.[0]?.email_address ||
            (
              valuesAny?.email_addresses as { value?: string }[] | undefined
            )?.[0]?.value ||
            getFirstValue(values.email) ||
            getFirstValue(valuesAny.email_addresses);

          identifier = emailValue ? `${name} (${emailValue})` : name;
        } else if (resourceType === UniversalResourceType.COMPANIES) {
          const name = getFirstValue(values.name) || 'Unnamed';
          const website = getFirstValue(values.website);
          const domain =
            values.domains &&
            Array.isArray(values.domains) &&
            values.domains.length > 0
              ? (values.domains[0] as { domain?: string }).domain
              : undefined;
          const email = getFirstValue(values.email);
          const contactInfo = website || domain || email;
          identifier = contactInfo ? `${name} (${contactInfo})` : name;
        } else {
          const nameValue = getFirstValue(values.name);
          const titleValue = getFirstValue(values.title);
          identifier = nameValue || titleValue || 'Unnamed';
        }

        return `${index + 1}. ${identifier} (ID: ${id})`;
      })
      .join('\n');

    return `Found ${recordsArray.length} ${typeName}:\n${formattedResults}`;
  },
};

export const searchRecordsDefinition = {
  name: 'search-records',
  description:
    'Universal search across all resource types (companies, people, records, tasks)',
  inputSchema: searchRecordsSchema,
};
