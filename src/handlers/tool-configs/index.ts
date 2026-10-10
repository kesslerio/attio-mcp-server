/**
 * Export all tool configurations
 *
 * The resource-specific groups retired with the v2 migration (companies,
 * people, deals, records, tasks, general) are no longer re-exported here. The
 * surviving registration surface is universal operations plus the list and
 * workspace-member groups; see `src/handlers/tools/registry.ts`.
 */
export { listsToolConfigs, listsToolDefinitions } from './lists.js';
export { promptsToolConfigs, promptsToolDefinitions } from './prompts.js';
export {
  workspaceMembersToolConfigs,
  workspaceMembersToolDefinitions,
} from './workspace-members.js';
