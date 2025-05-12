/**
 * Request handlers for prompt endpoints
 */
import { Request, Response } from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { 
  getAllPrompts, 
  getPromptById, 
  getPromptsByCategory,
  getAllCategories 
} from './templates/index.js';
import { PromptTemplate } from './types.js';
import Handlebars, { HandlebarsTemplateDelegate } from 'handlebars';
import { createErrorResult } from './error-handler.js';

// Template cache for compiled Handlebars templates
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

// Register Handlebars helpers
Handlebars.registerHelper('if', function(this: Record<string, unknown>, conditional: any, options: any): string {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

/**
 * List all available prompts
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function listPrompts(req: Request, res: Response): Promise<void> {
  try {
    const category = req.query.category as string | undefined;
    
    const prompts = category 
      ? getPromptsByCategory(category)
      : getAllPrompts();
    
    res.json({
      success: true,
      data: prompts
    });
  } catch (error: any) {
    const errorObj = new Error('Failed to list prompts');
    const errorResult = createErrorResult(
      errorObj,
      error.message || 'Unknown error',
      500
    );
    res.status(Number(errorResult.error.code)).json(errorResult);
  }
}

/**
 * List all available prompt categories
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function listPromptCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = getAllCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    const errorObj = new Error('Failed to list prompt categories');
    const errorResult = createErrorResult(
      errorObj,
      error.message || 'Unknown error',
      500
    );
    res.status(Number(errorResult.error.code)).json(errorResult);
  }
}

/**
 * Get details for a specific prompt
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getPromptDetails(req: Request, res: Response): Promise<void> {
  try {
    const promptId = req.params.id;
    const prompt = getPromptById(promptId);
    
    if (!prompt) {
      const errorObj = new Error('Prompt not found');
      const errorResult = createErrorResult(
        errorObj,
        `No prompt found with ID: ${promptId}`,
        404
      );
      res.status(Number(errorResult.error.code)).json(errorResult);
      return;
    }
    
    res.json({
      success: true,
      data: prompt
    });
  } catch (error: any) {
    const errorObj = new Error('Failed to get prompt details');
    const errorResult = createErrorResult(
      errorObj,
      error.message || 'Unknown error',
      500
    );
    res.status(Number(errorResult.error.code)).json(errorResult);
  }
}

/**
 * Validate parameters against prompt definition
 * 
 * @param prompt - Prompt template to validate against
 * @param parameters - Parameters to validate
 * @returns Object with validation result and any error messages
 */
function validateParameters(
  prompt: PromptTemplate, 
  parameters: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required parameters
  prompt.parameters.forEach(param => {
    if (param.required && (parameters[param.name] === undefined || parameters[param.name] === null)) {
      errors.push(`Missing required parameter: ${param.name}`);
    }
  });
  
  // Check enum values
  prompt.parameters.forEach(param => {
    if (
      param.enum && 
      parameters[param.name] !== undefined && 
      !param.enum.includes(parameters[param.name])
    ) {
      errors.push(
        `Invalid value for parameter ${param.name}. ` +
        `Expected one of: ${param.enum.join(', ')}`
      );
    }
  });
  
  // Check parameter types
  prompt.parameters.forEach(param => {
    if (parameters[param.name] !== undefined) {
      const paramValue = parameters[param.name];
      let typeError = false;
      
      switch (param.type) {
        case 'string':
          typeError = typeof paramValue !== 'string';
          break;
        case 'number':
          typeError = typeof paramValue !== 'number';
          break;
        case 'boolean':
          typeError = typeof paramValue !== 'boolean';
          break;
        case 'array':
          typeError = !Array.isArray(paramValue);
          break;
        case 'object':
          typeError = typeof paramValue !== 'object' || Array.isArray(paramValue) || paramValue === null;
          break;
      }
      
      if (typeError) {
        errors.push(`Invalid type for parameter ${param.name}. Expected ${param.type}.`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply default values to missing parameters
 * 
 * @param prompt - Prompt template with parameter definitions
 * @param parameters - User-provided parameters
 * @returns Parameters with defaults applied
 */
function applyDefaultValues(
  prompt: PromptTemplate, 
  parameters: Record<string, any>
): Record<string, any> {
  const result = { ...parameters };
  
  prompt.parameters.forEach(param => {
    if (
      (result[param.name] === undefined || result[param.name] === null) && 
      param.default !== undefined
    ) {
      result[param.name] = param.default;
    }
  });
  
  return result;
}

/**
 * Execute a prompt with provided parameters
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function executePrompt(req: Request, res: Response): Promise<void> {
  try {
    const promptId = req.params.id;
    const prompt = getPromptById(promptId);
    
    if (!prompt) {
      const errorObj = new Error('Prompt not found');
      const errorResult = createErrorResult(
        errorObj,
        `No prompt found with ID: ${promptId}`,
        404
      );
      res.status(Number(errorResult.error.code)).json(errorResult);
      return;
    }
    
    const executionRequest = req.body as PromptExecutionRequest;
    
    // Validate parameters
    const validation = validateParameters(prompt, executionRequest.parameters);
    if (!validation.valid) {
      const errorObj = new Error('Invalid parameters');
      const errorResult = createErrorResult(
        errorObj,
        validation.errors.join(', '),
        400
      );
      res.status(Number(errorResult.error.code)).json(errorResult);
      return;
    }
    
    // Apply default values
    const parameters = applyDefaultValues(prompt, executionRequest.parameters);
    
    // Get or compile template with caching
    let template = templateCache.get(promptId);
    if (!template) {
      template = Handlebars.compile(prompt.template);
      templateCache.set(promptId, template);
    }
    const result = template(parameters);
    
    res.json({
      success: true,
      data: {
        prompt: prompt.id,
        result
      }
    });
  } catch (error: any) {
    const errorObj = new Error('Failed to execute prompt');
    const errorResult = createErrorResult(
      errorObj,
      error.message || 'Unknown error',
      500
    );
    res.status(Number(errorResult.error.code)).json(errorResult);
  }
}

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
export function registerPromptHandlers(server: Server): void {
  // Register handler for prompts/list endpoint
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = getAllPrompts();
    return {
      prompts: prompts.map(prompt => ({
        id: prompt.id,
        name: prompt.title, // Map title to name as required by MCP
        description: prompt.description,
        category: prompt.category
      }))
    };
  });

  // Register handler for prompts/get endpoint
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptId = request.params.promptId as string;
    const prompt = getPromptById(promptId);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }
    
    return {
      prompt: {
        id: prompt.id,
        name: prompt.title, // Map title to name as required by MCP
        description: prompt.description,
        category: prompt.category,
        parameters: prompt.parameters.map(param => ({
          name: param.name,
          type: param.type,
          description: param.description,
          required: param.required,
          default: param.default,
          enum: param.enum
        })),
        template: prompt.template
      }
    };
  });
}
