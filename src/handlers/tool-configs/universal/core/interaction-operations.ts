/**
 * Interaction metadata operations (Issue #1116)
 *
 * Fetches interaction timestamps (first/last email, calendar, general interaction)
 * from person and company records. These are system-generated attributes in Attio.
 *
 * Note: Attio does NOT expose full email content/threads/subjects via the API —
 * only interaction timestamps and owner actor metadata.
 */

import {
  UniversalToolConfig,
  GetRecordInteractionsParams,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import {
  getRecordInteractionsSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { getObjectRecord } from '@/objects/records/index.js';
import { getPersonDetails } from '@/objects/people/basic.js';

/** Interaction attribute names on Attio person/company records */
const INTERACTION_ATTRIBUTES = [
  'first_email_interaction',
  'last_email_interaction',
  'first_calendar_interaction',
  'last_calendar_interaction',
  'next_calendar_interaction',
  'first_interaction',
  'last_interaction',
  'next_interaction',
] as const;

/** Shape of a single Attio interaction value entry */
interface AttioInteractionEntry {
  interaction_type?: string;
  interacted_at?: string;
  owner_actor?: {
    type?: string;
    id?: string;
  };
}

/** Formatted interaction result for a single attribute */
interface FormattedInteraction {
  date: string | null;
  interaction_type: string | null;
  owner_actor_type: string | null;
  owner_actor_id: string | null;
}

/** Full result shape returned by the tool */
export interface InteractionsResult {
  record_id: string;
  resource_type: string;
  record_name: string | null;
  interactions: Record<string, FormattedInteraction | null>;
}

function extractInteraction(
  values: Record<string, unknown>,
  attributeName: string
): FormattedInteraction | null {
  const raw = values[attributeName];
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const entry = raw[0] as AttioInteractionEntry;
  if (!entry || !entry.interacted_at) {
    return null;
  }

  return {
    date: entry.interacted_at,
    interaction_type: entry.interaction_type ?? null,
    owner_actor_type: entry.owner_actor?.type ?? null,
    owner_actor_id: entry.owner_actor?.id ?? null,
  };
}

function extractRecordName(values: Record<string, unknown>): string | null {
  // Person name
  const nameArr = values.name as
    | Array<{ full_name?: string; value?: string }>
    | undefined;
  if (Array.isArray(nameArr) && nameArr[0]) {
    return nameArr[0].full_name || nameArr[0].value || null;
  }
  // Fallback for string name
  if (typeof values.name === 'string') {
    return values.name;
  }
  return null;
}

export const getRecordInteractionsConfig: UniversalToolConfig<
  GetRecordInteractionsParams,
  InteractionsResult
> = {
  name: 'get_record_interactions',
  handler: async (
    params: GetRecordInteractionsParams
  ): Promise<InteractionsResult> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'get_record_interactions',
        params
      );

      const { resource_type, record_id } = sanitizedParams;

      // Only people and companies have interaction metadata
      if (
        resource_type !== UniversalResourceType.PEOPLE &&
        resource_type !== UniversalResourceType.COMPANIES
      ) {
        throw new Error(
          `Interaction metadata is only available for people and companies, ` +
            `not ${resource_type}. Use get_record_details for other resource types.`
        );
      }

      // Fetch the full record
      let record: Record<string, unknown>;
      if (resource_type === UniversalResourceType.PEOPLE) {
        record = (await getPersonDetails(record_id)) as unknown as Record<
          string,
          unknown
        >;
      } else {
        record = (await getObjectRecord(
          'companies',
          record_id
        )) as unknown as Record<string, unknown>;
      }

      const values = (record.values ?? {}) as Record<string, unknown>;

      // Extract all interaction attributes
      const interactions: Record<string, FormattedInteraction | null> = {};
      for (const attr of INTERACTION_ATTRIBUTES) {
        interactions[attr] = extractInteraction(values, attr);
      }

      return {
        record_id,
        resource_type,
        record_name: extractRecordName(values),
        interactions,
      };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Interaction metadata is only available')
      ) {
        throw error;
      }

      throw ErrorService.createUniversalError(
        'get_record_interactions',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (result: InteractionsResult): string => {
    if (!result || !result.interactions) {
      return 'No interaction data found.';
    }

    const { record_name, record_id, resource_type, interactions } = result;
    const displayName = record_name || record_id;
    const lines: string[] = [
      `Interactions for ${resource_type} "${displayName}" (${record_id}):`,
      '',
    ];

    const labelMap: Record<string, string> = {
      first_email_interaction: 'First Email',
      last_email_interaction: 'Last Email',
      first_calendar_interaction: 'First Meeting',
      last_calendar_interaction: 'Last Meeting',
      next_calendar_interaction: 'Next Meeting',
      first_interaction: 'First Interaction',
      last_interaction: 'Last Interaction',
      next_interaction: 'Next Interaction',
    };

    let hasAny = false;
    for (const attr of INTERACTION_ATTRIBUTES) {
      const interaction = interactions[attr];
      const label = labelMap[attr] || attr;

      if (interaction) {
        hasAny = true;
        const date = new Date(interaction.date!).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const type = interaction.interaction_type
          ? ` (${interaction.interaction_type})`
          : '';
        const owner = interaction.owner_actor_id
          ? ` — owner: ${interaction.owner_actor_type}/${interaction.owner_actor_id}`
          : '';
        lines.push(`  ${label}: ${date}${type}${owner}`);
      }
    }

    if (!hasAny) {
      lines.push('  No interaction history recorded.');
    }

    return lines.join('\n');
  },
};

export const getRecordInteractionsDefinition = {
  name: 'get_record_interactions',
  description: formatToolDescription({
    capability:
      'Fetch interaction metadata (first/last email, calendar, interaction timestamps and owners) for a person or company record.',
    boundaries:
      'retrieve full email content or activity feeds; Attio only exposes interaction timestamps and owner actors.',
    constraints:
      'Requires resource_type (people or companies) and record_id. Returns system-generated interaction attributes.',
    recoveryHint:
      'If no interactions found, verify the record exists with get_record_details. For activity content, use search_records_by_content with content_type=activity.',
  }),
  inputSchema: getRecordInteractionsSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
