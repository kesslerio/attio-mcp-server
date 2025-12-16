/**
 * Required Fields Error Enhancer
 *
 * Detects missing required fields errors and provides specific guidance,
 * particularly for deals which require a "stage" field.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import { UniversalResourceType } from '../../types.js';
import { getSingularResourceType } from '../../shared-handlers.js';

  field.trim().toLowerCase();

  if (
    directKeys.includes('stage') ||
    directKeys.includes('deal stage') ||
    directKeys.includes('status')
  ) {
    return true;
  }

    recordData.values &&
    typeof recordData.values === 'object' &&
    recordData.values !== null
      ? (recordData.values as Record<string, unknown>)
      : null;

  if (!values) return false;

  const valueKeys = Object.keys(values).map(normalizeFieldName);
  return (
    valueKeys.includes('stage') ||
    valueKeys.includes('deal stage') ||
    valueKeys.includes('status')
  );
};

const buildMissingDealStageMessage = async (
  recordData: Record<string, unknown>
): Promise<string | null> => {
  if (hasStageField(recordData)) return null;

  try {
    const { AttributeOptionsService } = await import(
      '@/services/metadata/index.js'
    );
    const { options } = await AttributeOptionsService.getOptions(
      'deals',
      'stage'
    );
      .slice(0, 5)
      .map((option) => `"${option.title}"`)
      .join(', ');
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Common stage values: ${preview}${hasMore}\n\n` +
      `For the full list, call: records_get_attribute_options(resource_type="deals", attribute="stage").`
    );
  } catch {
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Call records_get_attribute_options(resource_type="deals", attribute="stage") to retrieve valid stage values, then retry.`
    );
  }
};

async function enhance(
  _error: unknown,
  context: CrudErrorContext
): Promise<string | null> {
    context.resourceType as UniversalResourceType
  );
  let message = `Missing required fields. Please check that all mandatory fields are provided.`;

  if (
    context.resourceType === UniversalResourceType.DEALS &&
    context.recordData
  ) {
    if (stageMessage) {
      message = stageMessage;
    }
  }

  return message;
}

function matches(error: unknown, _context: CrudErrorContext): boolean {
  return msg.includes('required field');
}

export const requiredFieldsEnhancer: ErrorEnhancer = {
  name: 'required-fields',
  matches,
  enhance,
  errorName: 'validation_error',
};
