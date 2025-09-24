/**
 * Deal defaults configuration
 *
 * This module provides configurable defaults for deal creation.
 * Users can set environment variables to customize default behavior.
 *
 * AVAILABLE DEAL FIELDS IN ATTIO:
 * - name: Deal title (required, formatted as array with {value: "text"})
 * - stage: Deal stage/status (required, formatted as array with {status: "stage_name"})
 * - value: Deal amount (number only - Attio handles currency formatting)
 * - owner: Deal owner (workspace member reference)
 * - associated_company: Link to company record
 * - associated_people: Links to people/contact records
 *
 * FIELDS THAT DON'T EXIST (use custom fields instead):
 * - description: Use notes API after deal creation
 * - close_date/expected_close_date: Use custom date field
 * - probability: Use custom number field or encode in stage names
 * - source/lead_source: Use custom field
 * - type/deal_type: Use custom field or stages
 *
 * ENVIRONMENT VARIABLES (Runtime Behavior Configuration):
 *
 * @env ATTIO_DEFAULT_DEAL_STAGE - Default stage for new deals (default: "Interested")
 *      Example: ATTIO_DEFAULT_DEAL_STAGE="Qualified"
 *      Impact: Changes default fallback stage when none provided
 *
 * @env ATTIO_DEFAULT_DEAL_OWNER - Default owner workspace member ID
 *      Example: ATTIO_DEFAULT_DEAL_OWNER="member-uuid-here"
 *      Impact: Auto-assigns deals to specified owner when none provided
 *
 * @env ATTIO_DEFAULT_CURRENCY - Default currency code (default: "USD")
 *      Example: ATTIO_DEFAULT_CURRENCY="EUR"
 *      Impact: Sets currency for deal values when not specified
 *
 * @env STRICT_DEAL_STAGE_VALIDATION - Enable strict stage validation (default: false)
 *      Values: "true" | "false" | undefined
 *      Example: STRICT_DEAL_STAGE_VALIDATION="true"
 *      Impact: When "true", throws errors for invalid stages instead of silent fallbacks
 *      WARNING: Changing this in production can cause previously working deals to fail
 *
 * PRODUCTION SAFETY NOTES:
 * - Environment variables change runtime behavior and can cause production inconsistencies
 * - Test all environment variable combinations before deploying
 * - Document environment variables in deployment guides
 * - Consider gradual rollout when changing validation strictness
 * - Monitor error rates when enabling strict validation
 */

import { warn, error } from '../utils/logger.js';

export interface DealDefaults {
  stage?: string;
  owner?: string;
  currency?: string;
}

/**
 * Clear all caches (useful for testing or when configuration changes)
 */
export function clearDealCaches(): void {
  stageCache = null;
  stageCacheTimestamp = 0;
  errorCache = null;
}

/**
 * Pre-warm the stage cache (useful at startup to avoid first-request latency)
 */
export async function prewarmStageCache(): Promise<void> {
  try {
    await getAvailableDealStages();
  } catch {
    // Cache pre-warming is optional - silently continue if it fails
  }
}

// Cache for available deal stages to avoid repeated API calls
let stageCache: string[] | null = null;
let stageCacheTimestamp: number = 0;
const STAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Error cache to prevent repeated failed API calls during outages
let errorCache: { timestamp: number; error: unknown } | null = null;
const ERROR_CACHE_TTL = 30 * 1000; // 30 seconds - shorter TTL for errors

/**
 * Get deal defaults from environment configuration
 *
 * Environment variables:
 * - ATTIO_DEFAULT_DEAL_STAGE: Default stage for new deals (e.g., "Interested")
 * - ATTIO_DEFAULT_DEAL_OWNER: Default owner workspace member ID
 * - ATTIO_DEFAULT_CURRENCY: Default currency code (e.g., "USD")
 */
export function getDealDefaults(): DealDefaults {
  return {
    stage: process.env.ATTIO_DEFAULT_DEAL_STAGE || 'Interested',
    owner: process.env.ATTIO_DEFAULT_DEAL_OWNER,
    currency: process.env.ATTIO_DEFAULT_CURRENCY || 'USD',
  };
}

/**
 * Apply field name conversions for legacy compatibility
 * Handles company_id → associated_company, deal_name → name
 */
function applyFieldNameConversions(
  dealData: Record<string, unknown>
): Record<string, unknown> {
  // Handle company field name conversion (company_id → associated_company)
  if (dealData.company_id && !dealData.associated_company) {
    dealData.associated_company = dealData.company_id;
    delete dealData.company_id;
  }
  if (dealData.company && !dealData.associated_company) {
    dealData.associated_company = dealData.company;
    delete dealData.company;
  }

  // Handle deal name field name conversion
  if (dealData.deal_name && !dealData.name) {
    dealData.name = dealData.deal_name;
    delete dealData.deal_name;
  }

  // Ensure name is properly formatted as array (if it's not already)
  if (dealData.name && typeof dealData.name === 'string') {
    dealData.name = [{ value: dealData.name }];
  }

  return dealData;
}

/**
 * Apply stage defaults and convert stage formats
 * Handles deal_stage → stage conversion and proper array formatting
 */
function applyStageDefaults(
  dealData: Record<string, unknown>,
  defaults: DealDefaults
): Record<string, unknown> {
  // Apply stage default if not provided, or convert to proper format
  if (!dealData.stage && !dealData.deal_stage && defaults.stage) {
    dealData.stage = [{ status: defaults.stage }];
  } else if (dealData.stage && typeof dealData.stage === 'string') {
    // Convert string stage to proper array format
    dealData.stage = [{ status: dealData.stage }];
  } else if (dealData.deal_stage && typeof dealData.deal_stage === 'string') {
    // Convert deal_stage to stage with proper format
    dealData.stage = [{ status: dealData.deal_stage }];
    delete dealData.deal_stage;
  }

  return dealData;
}

/**
 * Apply owner defaults
 * Note: Attio accepts email addresses directly in the owner field
 */
function applyOwnerDefaults(
  dealData: Record<string, unknown>,
  defaults: DealDefaults
): Record<string, unknown> {
  // Apply owner default if not provided
  if (!dealData.owner && defaults.owner) {
    dealData.owner = defaults.owner;
  }

  return dealData;
}

/**
 * Apply value/currency defaults and convert various formats
 * Handles object formats, arrays, and legacy deal_value field
 */
function applyValueDefaults(
  dealData: Record<string, unknown>
): Record<string, unknown> {
  // Handle various value formats - Attio accepts simple numbers for currency fields
  if (dealData.value && typeof dealData.value === 'number') {
    // Simple number format: value: 9780 - Attio accepts this directly
    return dealData;
  }

  if (
    dealData.value &&
    typeof dealData.value === 'object' &&
    !Array.isArray(dealData.value)
  ) {
    // Handle different object formats - convert to simple number
    if ('value' in dealData.value) {
      dealData.value = dealData.value.value;
    } else if ('amount' in dealData.value) {
      dealData.value = dealData.value.amount;
    } else if ('currency_value' in dealData.value) {
      dealData.value = dealData.value.currency_value;
    }
  } else if (
    dealData.value &&
    Array.isArray(dealData.value) &&
    dealData.value[0]
  ) {
    // If already an array, extract the numeric value
    const firstValue = dealData.value[0];
    if (typeof firstValue === 'object' && 'currency_value' in firstValue) {
      dealData.value = firstValue.currency_value;
    } else if (typeof firstValue === 'number') {
      dealData.value = firstValue;
    }
  } else if (dealData.deal_value && typeof dealData.deal_value === 'number') {
    // Legacy deal_value field
    dealData.value = dealData.deal_value;
    delete dealData.deal_value;
  }

  return dealData;
}

/**
 * Apply deal defaults and handle all field conversions
 *
 * This function:
 * 1. Applies configured defaults to deal data
 * 2. Handles all legacy field name conversions
 * 3. Formats values to proper Attio API format
 * 4. Allows user-provided values to override defaults
 */
export function applyDealDefaults(
  recordData: Record<string, unknown>
): Record<string, unknown> {
  const defaults = getDealDefaults();
  let dealData = { ...recordData };

  // Apply transformations in logical order
  dealData = applyFieldNameConversions(dealData);
  dealData = applyStageDefaults(dealData, defaults);
  dealData = applyOwnerDefaults(dealData, defaults);
  dealData = applyValueDefaults(dealData);

  return dealData;
}

/**
 * Input validation helper for deal data
 * Provides immediate feedback on common mistakes before API calls
 */
export function validateDealInput(recordData: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for common field name mistakes
  if (recordData.company_id) {
    suggestions.push(
      'Use "associated_company" instead of "company_id" for linking to companies'
    );
  }

  if (recordData.company) {
    suggestions.push(
      'Use "associated_company" instead of "company" for linking to companies'
    );
  }

  if (recordData.deal_stage) {
    suggestions.push('Use "stage" instead of "deal_stage" for deal status');
  }

  if (recordData.deal_value) {
    suggestions.push('Use "value" instead of "deal_value" for deal amount');
  }

  if (recordData.deal_name) {
    suggestions.push('Use "name" instead of "deal_name" for deal title');
  }

  // Check value format
  if (
    recordData.value &&
    typeof recordData.value !== 'number' &&
    typeof recordData.value !== 'object'
  ) {
    errors.push('Deal value must be a number (e.g., 9780) or currency object');
    suggestions.push('Example: value: 9780 (as a simple number)');
  }

  // Check for required fields (name is required)
  if (!recordData.name && !recordData.deal_name) {
    errors.push('Deal name is required');
    suggestions.push('Add a "name" field with the deal title');
  }

  // Check stage format
  if (
    recordData.stage &&
    typeof recordData.stage === 'object' &&
    Array.isArray(recordData.stage)
  ) {
    if (!recordData.stage[0]?.status) {
      warnings.push('Stage array format detected but missing status field');
      suggestions.push(
        'Stage should be: [{"status": "stage_name"}] or just "stage_name"'
      );
    }
  }

  // Check owner format
  if (recordData.owner && typeof recordData.owner === 'string') {
    warnings.push(
      'Owner should be in proper format for workspace member reference'
    );
    suggestions.push(
      'Owner will be auto-formatted to proper workspace member reference'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Get available deal stages from Attio API with caching
 *
 * NOTE: This function makes an API call and should NOT be used in error handling paths
 * to prevent cascading failures during high error rates.
 */
async function getAvailableDealStages(): Promise<string[]> {
  const now = Date.now();

  // Return cached stages if still valid
  if (stageCache && now - stageCacheTimestamp < STAGE_CACHE_TTL) {
    return stageCache;
  }

  // Check error cache to prevent repeated failed requests
  if (errorCache && now - errorCache.timestamp < ERROR_CACHE_TTL) {
    // Return common fallback stages when API is unavailable
    return getCommonDealStages();
  }

  try {
    // Import here to avoid circular dependencies
    const { getStatusOptions } = await import('../api/attio-client.js');

    // Get status options for the deal stage attribute
    const statusOptions = await getStatusOptions('deals', 'stage');

    // Extract stage titles from the status options
    const stages = statusOptions
      .filter((option) => !option.is_archived) // Only include active stages
      .map((option) => option.title)
      .filter((title) => typeof title === 'string' && title.length > 0);

    // Update cache and clear error cache on success
    stageCache = stages;
    stageCacheTimestamp = now;
    errorCache = null;

    return stages;
  } catch (error: unknown) {
    // Cache the error to prevent cascading failures
    errorCache = { timestamp: now, error };

    // Log warning about falling back to common stages
    warn(
      'deal-defaults',
      'Failed to fetch deal stages from API, falling back to common stages',
      { error: error instanceof Error ? error.message : String(error) }
    );

    // Return previously cached stages if available, otherwise use common fallback stages
    return stageCache || getCommonDealStages();
  }
}

/**
 * Get common deal stages as fallback when API is unavailable
 * These are typical stages found in most CRM systems
 */
function getCommonDealStages(): string[] {
  return [
    'Interested',
    'Qualified',
    'Demo Scheduled',
    'Demo',
    'Demo No Show',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
  ];
}

/**
 * Validate and correct deal stage
 * Returns the validated stage or the default if invalid
 *
 * @param stage - The stage to validate
 * @param skipApiCall - If true, skip API call and use cached data only
 */
export async function validateDealStage(
  stage: string | undefined,
  skipApiCall: boolean = false
): Promise<string | undefined> {
  if (!stage) {
    return undefined;
  }

  try {
    // If skipApiCall is true, only use cached data
    let availableStages: string[] = [];

    if (skipApiCall) {
      // Use cached stages if available, otherwise skip validation
      if (stageCache) {
        availableStages = stageCache;
      } else {
        // No cache available and can't make API call, return original
        return stage;
      }
    } else {
      availableStages = await getAvailableDealStages();
    }

    // Check if provided stage exists (case-insensitive)
    const validStage = availableStages.find(
      (s) => s.toLowerCase() === stage.toLowerCase()
    );

    if (validStage) {
      return validStage; // Return the correctly cased version
    }

    // Stage not found - either fail or use default based on strict validation mode
    const defaults = getDealDefaults();
    const availableStagesText =
      availableStages.length > 0
        ? availableStages.join(', ')
        : 'Unable to fetch available stages from API';

    const errorMessage = `Deal stage "${stage}" not found. Available stages: ${availableStagesText}`;

    // If strict validation is enabled, throw an error instead of silent fallback
    // WARNING: This environment variable changes runtime behavior
    // Production Impact: Previously working deals may start failing
    if (process.env.STRICT_DEAL_STAGE_VALIDATION === 'true') {
      const { UniversalValidationError, ErrorType } = await import(
        '../handlers/tool-configs/universal/schemas.js'
      );
      throw new UniversalValidationError(errorMessage, ErrorType.USER_ERROR, {
        field: 'stage',
        suggestion: `Use one of the available stages: ${availableStagesText}`,
      });
    }

    // Otherwise, log warning and return default (existing behavior)
    warn(
      'deal-defaults',
      `${errorMessage}. Using default: "${defaults.stage}"`
    );

    return defaults.stage;
  } catch (err: unknown) {
    error('deal-defaults', 'Stage validation failed', err);
    return stage; // Return original stage if validation fails
  }
}

/**
 * Get available deal stages for error reporting
 * This is a non-caching version for immediate error feedback
 */
export async function getAvailableStagesForErrors(): Promise<string[]> {
  try {
    // Try to get from cache first (fast path)
    if (stageCache && Date.now() - stageCacheTimestamp < STAGE_CACHE_TTL) {
      return stageCache;
    }

    // If no valid cache, return common stages for immediate error reporting
    return getCommonDealStages();
  } catch {
    // Always return common stages if anything fails
    return getCommonDealStages();
  }
}

/**
 * Enhanced apply deal defaults with stage validation
 *
 * @param recordData - The deal data to process
 * @param skipValidation - Skip API validation (used in error paths to prevent cascading failures)
 */
export async function applyDealDefaultsWithValidation(
  recordData: Record<string, unknown>,
  skipValidation: boolean = false
): Promise<Record<string, unknown>> {
  const dealData = applyDealDefaults(recordData);

  // Validate stage if present
  if (
    dealData.stage &&
    Array.isArray(dealData.stage) &&
    dealData.stage[0]?.status
  ) {
    // Pass skipValidation flag to validateDealStage to control API calls
    const validatedStage = await validateDealStage(
      dealData.stage[0].status,
      skipValidation // Skip API calls when in error paths
    );
    if (validatedStage) {
      dealData.stage = [{ status: validatedStage }];
    }
  }

  return dealData;
}
