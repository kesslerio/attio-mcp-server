import { extractResourceTypeFromFormatArgs } from '@/handlers/tool-configs/universal/core/utils.js';
import { detailedInfoResultContract } from '@/handlers/tools/result-schemas.js';
import { assertReadSuccess } from '@/handlers/tool-configs/universal/read-result-adapters.js';
import { ErrorService } from '@/services/ErrorService.js';
import {
  UniversalToolConfig,
  UniversalDetailedInfoParams,
} from '@/handlers/tool-configs/universal/types.js';
import {
  getDetailedInfoSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import {
  handleUniversalGetDetailedInfo,
  getSingularResourceType,
} from '@/handlers/tool-configs/universal/shared-handlers.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

export const getDetailedInfoConfig: UniversalToolConfig<
  UniversalDetailedInfoParams,
  Record<string, unknown>
> = {
  name: 'records_get_info',
  ...detailedInfoResultContract,
  structuredOutput: (result) => ({ data: assertReadSuccess(result) }),
  handler: async (params: UniversalDetailedInfoParams) => {
    try {
      const sanitized = validateUniversalToolParams('records_get_info', params);
      return assertReadSuccess(await handleUniversalGetDetailedInfo(sanitized));
    } catch (error) {
      throw ErrorService.createUniversalError(
        'records_get_info',
        params?.resource_type ?? '',
        error
      );
    }
  },
  formatResult: (info: Record<string, unknown>, ...args: unknown[]): string => {
    const resourceType = extractResourceTypeFromFormatArgs(args);
    const detailedInfoType =
      args[0] && typeof args[0] === 'object' && 'info_type' in args[0]
        ? (args[0].info_type as string | undefined)
        : (args[1] as string | undefined);
    if (!info) {
      return 'No detailed information found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    let infoTypeLabel = 'detailed';
    if (detailedInfoType) {
      switch (detailedInfoType) {
        case 'contact':
          infoTypeLabel = 'contact';
          break;
        case 'business':
          infoTypeLabel = 'business';
          break;
        case 'social':
          infoTypeLabel = 'social';
          break;
        default:
          infoTypeLabel = 'detailed';
      }
    }

    let result = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} ${infoTypeLabel} information:\n\n`;

    if (typeof info === 'object' && info.values) {
      Object.entries(info.values as Record<string, unknown>).forEach(
        ([field, values]: [string, unknown]) => {
          if (Array.isArray(values) && values.length > 0) {
            const value = (values[0] as { value: string }).value;
            if (value) {
              const displayField =
                field.charAt(0).toUpperCase() + field.slice(1);
              result += `${displayField}: ${value}\n`;
            }
          }
        }
      );
    } else if (typeof info === 'object') {
      Object.entries(info).forEach(([key, value]: [string, unknown]) => {
        if (value && typeof value === 'string' && value.length < 200) {
          const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
          result += `${displayKey}: ${value}\n`;
        }
      });
    } else {
      result += JSON.stringify(info, null, 2);
    }

    return result;
  },
};

export const getDetailedInfoDefinition = {
  name: 'records_get_info',
  description: formatToolDescription({
    capability:
      'Retrieve the full record using its standard resource endpoint.',
    boundaries: 'search lists of records or mutate data.',
    constraints: 'Requires resource_type and record_id.',
    recoveryHint: 'Use records_get_details for enriched attribute formatting.',
  }),
  inputSchema: getDetailedInfoSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
