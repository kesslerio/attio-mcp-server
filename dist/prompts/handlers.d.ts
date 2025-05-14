/**
 * Request handlers for prompt endpoints
 */
import { Request, Response } from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
/**
 * List all available prompts
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export declare function listPrompts(req: Request, res: Response): Promise<void>;
/**
 * List all available prompt categories
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export declare function listPromptCategories(req: Request, res: Response): Promise<void>;
/**
 * Get details for a specific prompt
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export declare function getPromptDetails(req: Request, res: Response): Promise<void>;
/**
 * Execute a prompt with provided parameters
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export declare function executePrompt(req: Request, res: Response): Promise<void>;
/**
 * Register MCP prompt handlers with the server
 *
 * This function registers handlers for the MCP prompts/list and prompts/get endpoints
 * required by the Model Context Protocol specification. These endpoints enable
 * Claude Desktop to discover and retrieve prompt templates from the server.
 *
 * @param server - MCP server instance
 * @example
 * ```typescript
 * const server = new Server();
 * registerPromptHandlers(server);
 * ```
 */
export declare function registerPromptHandlers(server: Server): void;
//# sourceMappingURL=handlers.d.ts.map