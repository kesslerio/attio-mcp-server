import {
  UniversalToolConfig,
  UniversalRecordDetailsParams,
  UniversalResourceType,
} from '../types.js';
import { AttioRecord } from '../../../../types/attio.js';
import {
  getRecordDetailsSchema,
  validateUniversalToolParams,
} from '../schemas.js';
import {
  handleUniversalGetDetails,
  getSingularResourceType,
} from '../shared-handlers.js';
import { handleSearchError } from './error-utils.js';
import { UniversalUtilityService } from '../../../../services/UniversalUtilityService.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

export const getRecordDetailsConfig: UniversalToolConfig<
  UniversalRecordDetailsParams,
  AttioRecord
> = {
  name: 'records_get_details',
  handler: async (
    params: UniversalRecordDetailsParams
  ): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_get_details',
        params
      );
      return await handleUniversalGetDetails(sanitizedParams);
    } catch (error: unknown) {
      return await handleSearchError(
        error,
        params.resource_type,
        params as unknown as Record<string, unknown>
      );
    }
  },
  formatResult: (record: AttioRecord, ...args: unknown[]): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
    if (!record) {
      return 'Record not found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    const name = UniversalUtilityService.extractDisplayName(
      record.values || {}
    );
    const id = String(record.id?.record_id || 'unknown');

    let details = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)}: ${name}\nID: ${id}\n\n`;

    if (record.values) {
      let fieldOrder = [
        'email',
        'domains',
        'phone',
        'description',
        'categories',
        'primary_location',
      ];

      if (resourceType === UniversalResourceType.PEOPLE) {
        fieldOrder = [
          'email_addresses',
          'phone_numbers',
          'job_title',
          'description',
          'primary_location',
        ];

        if (
          record.values.associated_company &&
          Array.isArray(record.values.associated_company)
        ) {
          const companies = (
            record.values.associated_company as Record<string, unknown>[]
          )
            .map(
              (c: Record<string, unknown>) =>
                c.target_record_name || c.name || c.value
            )
            .filter(Boolean);
          if (companies.length > 0) {
            details += `Company: ${companies.join(', ')}\n`;
          }
        }
      }

      fieldOrder.forEach((field) => {
        const value =
          record.values?.[field] &&
          Array.isArray(record.values[field]) &&
          (record.values[field] as { value: string }[])[0]?.value;
        if (value) {
          const displayField =
            field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          details += `${displayField}: ${value}\n`;
        }
      });

      if (record.values?.domains && Array.isArray(record.values.domains)) {
        const domains = (record.values.domains as { domain?: string }[])
          .map((d: { domain?: string }) => d.domain)
          .filter(Boolean);
        if (domains.length > 0) {
          details += `Domains: ${domains.join(', ')}\n`;
        }
      }
      if (resourceType === UniversalResourceType.PEOPLE) {
        if (
          record.values.email_addresses &&
          Array.isArray(record.values.email_addresses)
        ) {
          const emails = (
            record.values.email_addresses as Record<string, unknown>[]
          )
            .map((e: Record<string, unknown>) => e.email_address || e.value)
            .filter(Boolean);
          if (emails.length > 0) {
            details += `Email: ${emails.join(', ')}\n`;
          }
        }

        if (
          record.values.phone_numbers &&
          Array.isArray(record.values.phone_numbers)
        ) {
          const phones = (
            record.values.phone_numbers as Record<string, unknown>[]
          )
            .map((p: Record<string, unknown>) => p.phone_number || p.value)
            .filter(Boolean);
          if (phones.length > 0) {
            details += `Phone: ${phones.join(', ')}\n`;
          }
        }
      }

      if (
        record.values.created_at &&
        Array.isArray(record.values.created_at) &&
        (record.values.created_at as { value: string }[])[0]?.value
      ) {
        details += `Created at: ${(record.values.created_at as { value: string }[])[0].value}\n`;
      }
    }

    return details.trim();
  },
  structuredOutput: (
    record: AttioRecord,
    resourceType?: string
  ): Record<string, unknown> => {
    if (!record) return {};

    const result: Record<string, unknown> = { ...record };

    // Normalize company name to string for consistency
    if (resourceType === 'companies' && record.values) {
      const values = record.values as Record<string, unknown>;
      const nameArray = values.name;
      if (Array.isArray(nameArray) && nameArray[0]?.value) {
        result.values = {
          ...values,
          name: nameArray[0].value,
        };
      }
    }

    return result;
  },
};

export const getRecordDetailsDefinition = {
  name: 'records_get_details',
  description: formatToolDescription({
    capability: 'Fetch a single record with enriched attribute formatting.',
    boundaries:
      'search or filter result sets; use records.search* tools instead.',
    constraints:
      'Requires resource_type and record_id; optional fields filter output.',
    recoveryHint: 'Validate record IDs with records.search before retrying.',
  }),
  inputSchema: getRecordDetailsSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
