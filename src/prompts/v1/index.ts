/**
 * V1 Prompts Registry
 *
 * Central registry for all v1 MCP prompts. Exports the catalog and
 * provides lookup functions for handlers.
 */

import { PromptV1Definition } from './types.js';

// Import all v1 prompts
import peopleSearchPrompt from './people-search.v1.js';
import companySearchPrompt from './company-search.v1.js';
import dealSearchPrompt from './deal-search.v1.js';
import meetingPrepPrompt from './meeting-prep.v1.js';
import pipelineHealthPrompt from './pipeline-health.v1.js';
import logActivityPrompt from './log-activity.v1.js';
import createTaskPrompt from './create-task.v1.js';
import advanceDealPrompt from './advance-deal.v1.js';
import addToListPrompt from './add-to-list.v1.js';
import qualifyLeadPrompt from './qualify-lead.v1.js';

/**
 * Complete v1 prompts catalog (10 prompts)
 */
export const v1PromptsCatalog: PromptV1Definition[] = [
  // Search prompts (Phase 2)
  peopleSearchPrompt,
  companySearchPrompt,
  dealSearchPrompt,
  meetingPrepPrompt,
  pipelineHealthPrompt,

  // Activity/Write prompts (Phase 3)
  logActivityPrompt,
  createTaskPrompt,
  advanceDealPrompt,
  addToListPrompt,

  // Complex analysis prompt (Phase 4)
  qualifyLeadPrompt,
];

/**
 * Get a v1 prompt by name
 *
 * @param name - Prompt name (e.g., "people_search.v1")
 * @returns Prompt definition or undefined if not found
 */
export function getPromptV1ByName(
  name: string
): PromptV1Definition | undefined {
  return v1PromptsCatalog.find((p) => p.metadata.name === name);
}

/**
 * Get all v1 prompts
 *
 * @returns Array of all v1 prompt definitions
 */
export function getAllPromptsV1(): PromptV1Definition[] {
  return v1PromptsCatalog;
}

/**
 * Get v1 prompts by category
 *
 * @param category - Category to filter by
 * @returns Array of prompts in the category
 */
export function getPromptsV1ByCategory(category: string): PromptV1Definition[] {
  return v1PromptsCatalog.filter((p) => p.metadata.category === category);
}

/**
 * Get all v1 prompt names
 *
 * @returns Array of prompt names
 */
export function getV1PromptNames(): string[] {
  return v1PromptsCatalog.map((p) => p.metadata.name);
}

/**
 * Check if a prompt name is a v1 prompt
 *
 * @param name - Prompt name to check
 * @returns True if this is a v1 prompt
 */
export function isV1Prompt(name: string): boolean {
  return name.endsWith('.v1');
}

// Export all prompts individually for direct imports if needed
export {
  peopleSearchPrompt,
  companySearchPrompt,
  dealSearchPrompt,
  meetingPrepPrompt,
  pipelineHealthPrompt,
  logActivityPrompt,
  createTaskPrompt,
  advanceDealPrompt,
  addToListPrompt,
  qualifyLeadPrompt,
};
