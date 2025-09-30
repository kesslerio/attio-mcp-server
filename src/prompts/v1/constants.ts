/**
 * Shared constants for v1 MCP prompts
 *
 * Defines defaults, limits, and configuration values
 * per the specifications in issue #774.
 */

/**
 * Prompt version identifier
 */
export const PROMPT_VERSION = 'v1' as const;

/**
 * Universal argument defaults for read prompts
 */
export const UNIVERSAL_DEFAULTS = {
  format: 'table' as const,
  fields_preset: 'sales_short' as const,
  verbosity: 'brief' as const,
} as const;

/**
 * Default values for search/query prompts
 */
export const SEARCH_DEFAULTS = {
  limit: 25,
  maxLimit: 100,
  ownerDefault: '@me',
  timeframeDefault: '30d',
} as const;

/**
 * Token budget limits (configurable via environment)
 */
export const TOKEN_LIMITS = {
  /** Default maximum tokens per prompt (env: MAX_PROMPT_TOKENS) */
  maxPromptTokens: parseInt(process.env.MAX_PROMPT_TOKENS || '1200', 10),

  /** Specific budgets for prompts that need stricter limits */
  budgets: {
    'people_search.v1': 500,
    'company_search.v1': 500,
    'deal_search.v1': 500,
    'qualify_lead.v1': 400,
    'log_activity.v1': 300,
    'create_task.v1': 300,
    'advance_deal.v1': 350,
    'add_to_list.v1': 300,
    'meeting_prep.v1': 600,
    'pipeline_health.v1': 700,
  },
} as const;

/**
 * Description length limits per MCP spec
 */
export const DESCRIPTION_LIMITS = {
  /** Maximum prompt description length */
  promptDescription: 140,
  /** Maximum argument description length */
  argumentDescription: 80,
} as const;

/**
 * Message construction limits
 */
export const MESSAGE_LIMITS = {
  /** Maximum messages per prompt (per spec: ≤2) */
  maxMessagesPerPrompt: 2,
  /** Maximum characters per message (per spec: ≤800) */
  maxCharsPerMessage: 800,
} as const;

/**
 * Web research limits for qualify_lead prompt
 */
export const WEB_RESEARCH_LIMITS = {
  /** Default number of web pages to fetch */
  defaultLimitWeb: 3,
  /** Maximum number of web pages to fetch */
  maxLimitWeb: 4,
  /** Maximum words per web page to process */
  maxWordsPerPage: 1200,
  /** Maximum evidence items in output */
  maxEvidence: 2,
} as const;

/**
 * Pagination constants
 */
export const PAGINATION = {
  /** Text to append when results exceed limit */
  moreAvailableText: 'MORE_AVAILABLE: true',
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  /** Maximum tokens per prompt */
  maxPromptTokens: 'MAX_PROMPT_TOKENS',
  /** Enable dev metadata in prompts/get */
  devMeta: 'MCP_DEV_META',
  /** Enable prompt telemetry logging */
  telemetryEnabled: 'PROMPT_TELEMETRY_ENABLED',
} as const;

/**
 * Check if dev metadata should be included
 */
export function isDevMetaEnabled(): boolean {
  return process.env[ENV_VARS.devMeta] === 'true';
}

/**
 * Check if telemetry logging is enabled
 */
export function isTelemetryEnabled(): boolean {
  return process.env[ENV_VARS.telemetryEnabled] === 'true';
}

/**
 * Get the token budget for a specific prompt
 *
 * @param promptName - Name of the prompt (e.g., "people_search.v1")
 * @returns Token budget limit for the prompt
 */
export function getPromptTokenBudget(promptName: string): number {
  return (
    TOKEN_LIMITS.budgets[promptName as keyof typeof TOKEN_LIMITS.budgets] ||
    TOKEN_LIMITS.maxPromptTokens
  );
}
