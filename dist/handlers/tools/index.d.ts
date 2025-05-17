/**
 * Main entry point for tool handlers - maintains backward compatibility
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
/**
 * Registers tool-related request handlers with the server
 *
 * @param server - The MCP server instance
 */
export declare function registerToolHandlers(server: Server): void;
export { TOOL_DEFINITIONS, TOOL_CONFIGS } from "./registry.js";
export { findToolConfig } from "./registry.js";
export { executeToolRequest } from "./dispatcher.js";
export { formatSearchResults, formatRecordDetails, formatListEntries, formatBatchResults, formatResponse } from "./formatters.js";
//# sourceMappingURL=index.d.ts.map