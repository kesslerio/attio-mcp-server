/**
 * Tool dispatcher module - handles tool execution dispatch and routing
 */
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
/**
 * Execute a tool request and return formatted results
 *
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export declare function executeToolRequest(request: CallToolRequest): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
//# sourceMappingURL=dispatcher.d.ts.map