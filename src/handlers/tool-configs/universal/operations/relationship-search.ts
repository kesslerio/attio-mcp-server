/**
 * Relationship search tool configuration
 */

import {
  UniversalToolConfig,
  RelationshipSearchParams,
  RelationshipType,
} from '../types.js';
import { AttioRecord } from '../../../../types/attio.js';

import { validateUniversalToolParams } from '../schemas.js';
import { ValidationService } from '../../../../services/ValidationService.js';
import { isValidUUID } from '../../../../utils/validation/uuid-validation.js';
import { ErrorService } from '../../../../services/ErrorService.js';

import { searchCompaniesByPeople } from '../../../../objects/companies/index.js';
import { searchPeopleByCompany } from '../../../../objects/people/index.js';
import { searchDealsByCompany } from '../../../../objects/deals/index.js';

export const searchByRelationshipConfig: UniversalToolConfig = {
  name: 'search-by-relationship',
  handler: async (params: RelationshipSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-relationship',
        params
      );

      // Check for listId parameter first - if present and invalid, return error immediately
      if (params.listId && !isValidUUID(params.listId)) {
        throw new Error(
          `Invalid list_id: must be a UUID. Got: ${params.listId}`
        );
      }

      const { relationship_type, source_id } = sanitizedParams;

      switch (relationship_type) {
        case RelationshipType.COMPANY_TO_PEOPLE:
          return await searchPeopleByCompany(source_id);

        case RelationshipType.PEOPLE_TO_COMPANY:
          return await searchCompaniesByPeople(source_id);

        case RelationshipType.COMPANY_TO_DEALS:
          return await searchDealsByCompany(source_id);

        case RelationshipType.PERSON_TO_TASKS:
        case RelationshipType.COMPANY_TO_TASKS:
          // Task relationship search requires filtering tasks by linked records
          // This functionality depends on the Attio API's task filtering capabilities
          throw new Error(
            `Task relationship search (${relationship_type}) is not currently available. ` +
              `This feature requires enhanced API filtering capabilities. ` +
              `As a workaround, you can use the 'search-records' tool with resource_type='tasks' to find all tasks, ` +
              `then filter the results programmatically.`
          );

        case 'list_entries': {
          // Special handling for list_entries relationship type
          const list_id = params.source_id;
          if (
            !list_id ||
            !ValidationService.validateUUIDForSearch(String(list_id))
          ) {
            // Invalid listId should return error, not empty array
            throw new Error(`Invalid list_id: must be a UUID. Got: ${list_id}`);
          } else {
            // Operation requiring valid list id → throw validation error
            throw new Error('invalid list id');
          }
        }

        default:
          throw new Error(
            `Invalid relationship type: ${relationship_type} not found`
          );
      }
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'relationship search',
        params.relationship_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    relationshipType?: RelationshipType
  ) => {
    if (!Array.isArray(results)) {
      return 'No related records found';
    }

    const relationshipName = relationshipType
      ? relationshipType.replace(/_/g, ' ')
      : 'relationship';

    return `Found ${results.length} records for ${relationshipName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown>;
        const recordId = record.id as Record<string, unknown>;
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          'Unnamed';
        const id = recordId?.record_id || 'unknown';
        const email = (values?.email as Record<string, unknown>[])?.[0]?.value;
        const role =
          (values?.role as Record<string, unknown>[])?.[0]?.value ||
          (values?.position as Record<string, unknown>[])?.[0]?.value;

        let details = '';
        if (role) details += ` (${role})`;
        if (email) details += ` - ${email}`;

        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

