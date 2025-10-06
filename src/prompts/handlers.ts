/**
 * Request handlers for prompt endpoints
 */
import { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ServerContext } from '@/server/createServer.js';
import { setGlobalContext } from '@/api/lazy-client.js';
import {
  getAllPrompts,
  getPromptById,
  getPromptsByCategory,
  getAllCategories,
} from '@/prompts/templates/index.js';
import { PromptTemplate, PromptExecutionRequest } from '@/prompts/types.js';
import { createErrorResult } from '@/prompts/error-handler.js';
import { getPromptsListPayload } from '@/utils/mcp-discovery.js';
import { getAllPromptsV1, getPromptV1ByName, isV1Prompt } from './v1/index.js';
import {
  validateArguments,
  checkTokenBudget,
  createValidationError,
  createBudgetExceededError,
} from './v1/utils/validation.js';
import { calculatePromptTokens } from './v1/utils/token-metadata.js';
import {
  logPromptTelemetry,
  createTelemetryEvent,
} from './v1/utils/telemetry.js';
import { isDevMetaEnabled } from './v1/constants.js';

// Import Handlebars using ES module import
// This avoids the "require is not defined in ES module scope" error
import Handlebars from 'handlebars';

// Define template delegate type since it's not exported by the Handlebars module
type HandlebarsTemplateDelegate = (
  context: Record<string, unknown>,
  options?: Record<string, unknown>
) => string;

/**
 * Interface for template cache options
 */
interface TemplateCacheOptions {
  maxSize: number;
}

/**
 * Template cache implementation for storing compiled Handlebars templates
 * Provides caching with size limits to prevent memory leaks
 */
class TemplateCache {
  private cache = new Map<string, HandlebarsTemplateDelegate>();
  private options: TemplateCacheOptions;

  /**
   * Create a new template cache
   *
   * @param options - Cache configuration options
   */
  constructor(options: Partial<TemplateCacheOptions> = {}) {
    this.options = {
      maxSize: 100, // Sized for typical production load (50-100 unique prompts with parameter variations)
      ...options,
    };
  }

  /**
   * Get a compiled template from the cache
   *
   * @param key - Template key
   * @returns The compiled template or undefined if not found
   */
  get(key: string): HandlebarsTemplateDelegate | undefined {
    return this.cache.get(key);
  }

  /**
   * Store a compiled template in the cache
   *
   * @param key - Template key
   * @param template - Compiled template to store
   */
  set(key: string, template: HandlebarsTemplateDelegate): void {
    // Check if we need to evict entries (simple LRU implementation)
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      // Delete the first entry (oldest)
      const firstKeyValue = this.cache.keys().next();
      if (!firstKeyValue.done && firstKeyValue.value) {
        this.cache.delete(firstKeyValue.value);
      }
    }

    this.cache.set(key, template);
  }

  /**
   * Check if a template exists in the cache
   *
   * @param key - Template key
   * @returns True if the template exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all templates from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   *
   * @returns Number of templates in the cache
   */
  size(): number {
    return this.cache.size;
  }
}

// Create the template cache instance
const templateCache = new TemplateCache({ maxSize: 100 });

// Register Handlebars helpers
Handlebars.registerHelper(
  'if',
  function (
    this: Record<string, unknown>,
    conditional: unknown,
    options: {
      fn: (context: unknown) => string;
      inverse: (context: unknown) => string;
    }
  ): string {
    if (conditional) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  }
);

/**
 * List all available prompts
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function listPrompts(req: Request, res: Response): Promise<void> {
  try {
    const category = req.query.category as string | undefined;

    const prompts = category ? getPromptsByCategory(category) : getAllPrompts();

    res.json({
      success: true,
      data: prompts,
    });
  } catch (error: unknown) {
    const errorObj = new Error('Failed to list prompts');
    const errorResult = createErrorResult(
      errorObj,
      error instanceof Error ? error.message : 'Unknown error',
      500,
      {
        ...getRequestMetadata(req, 'prompts.list'),
        context: {
          category: req.query.category,
        },
      }
    );
    res.status(errorResult.error.code).json(errorResult);
  }
}

/**
 * List all available prompt categories
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function listPromptCategories(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const categories = getAllCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: unknown) {
    const errorObj = new Error('Failed to list prompt categories');
    const errorResult = createErrorResult(
      errorObj,
      error instanceof Error ? error.message : 'Unknown error',
      500,
      {
        ...getRequestMetadata(req, 'prompts.categories'),
        context: {},
      }
    );
    res.status(errorResult.error.code).json(errorResult);
  }
}

/**
 * Get details for a specific prompt
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getPromptDetails(
  req: Request,
  res: Response
): Promise<void> {
  const promptId = req.params.id;

  try {
    const prompt = getPromptById(promptId);

    if (!prompt) {
      const errorObj = new Error('Prompt not found');
      const errorResult = createErrorResult(
        errorObj,
        `No prompt found with ID: ${promptId}`,
        404,
        {
          ...getRequestMetadata(req, 'prompts.get'),
          context: { promptId },
        }
      );
      res.status(errorResult.error.code).json(errorResult);
      return;
    }

    res.json({
      success: true,
      data: prompt,
    });
  } catch (error: unknown) {
    const errorObj = new Error('Failed to get prompt details');
    const errorResult = createErrorResult(
      errorObj,
      error instanceof Error ? error.message : 'Unknown error',
      500,
      {
        ...getRequestMetadata(req, 'prompts.get'),
        context: { promptId },
      }
    );
    res.status(errorResult.error.code).json(errorResult);
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
  parameters: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required parameters
  prompt.parameters.forEach((param) => {
    if (
      param.required &&
      (parameters[param.name] === undefined || parameters[param.name] === null)
    ) {
      errors.push(`Missing required parameter: ${param.name}`);
    }
  });

  // Check enum values
  prompt.parameters.forEach((param) => {
    if (
      param.enum &&
      parameters[param.name] !== undefined &&
      typeof parameters[param.name] === 'string' &&
      !param.enum.includes(parameters[param.name] as string)
    ) {
      errors.push(
        `Invalid value for parameter ${param.name}. ` +
          `Expected one of: ${param.enum.join(', ')}`
      );
    }
  });

  // Check parameter types
  prompt.parameters.forEach((param) => {
    if (parameters[param.name] !== undefined) {
      const paramValue = parameters[param.name];
      let typeError = false;

      switch (param.type as string) {
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
          typeError =
            typeof paramValue !== 'object' ||
            Array.isArray(paramValue) ||
            paramValue === null;
          break;
      }

      if (typeError) {
        errors.push(
          `Invalid type for parameter ${param.name}. Expected ${param.type}.`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
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
  parameters: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...parameters };

  prompt.parameters.forEach((param) => {
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
export async function executePrompt(
  req: Request,
  res: Response
): Promise<void> {
  const promptId = req.params.id;

  try {
    const prompt = getPromptById(promptId);

    if (!prompt) {
      const errorObj = new Error('Prompt not found');
      const errorResult = createErrorResult(
        errorObj,
        `No prompt found with ID: ${promptId}`,
        404
      );
      res.status(errorResult.error.code).json(errorResult);
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
        400,
        {
          ...getRequestMetadata(req, 'prompts.execute'),
          context: {
            promptId,
            validationErrors: validation.errors,
          },
        }
      );
      res.status(errorResult.error.code).json(errorResult);
      return;
    }

    // Apply default values
    const parameters = applyDefaultValues(prompt, executionRequest.parameters);

    // Get or compile template with caching
    let template = templateCache.get(promptId);
    if (!template) {
      try {
        template = Handlebars.compile(prompt.template);
        templateCache.set(promptId, template);
      } catch (compileError: unknown) {
        const errorObj = new Error('Failed to compile template');
        const errorResult = createErrorResult(
          errorObj,
          `Template compilation error for prompt ${promptId}: ${
            compileError instanceof Error
              ? compileError.message
              : 'Unknown error'
          }`,
          500,
          {
            ...getRequestMetadata(req, 'prompts.execute'),
            context: {
              promptId,
              stage: 'compile',
            },
          }
        );
        res.status(errorResult.error.code).json(errorResult);
        return;
      }
    }

    // Execute the template with error handling
    let result: string;
    try {
      result = template(parameters);
    } catch (renderError: unknown) {
      const errorObj = new Error('Failed to render template');
      const errorResult = createErrorResult(
        errorObj,
        `Template rendering error for prompt ${promptId}: ${
          renderError instanceof Error ? renderError.message : 'Unknown error'
        }`,
        500,
        {
          ...getRequestMetadata(req, 'prompts.execute'),
          context: {
            promptId,
            stage: 'render',
          },
        }
      );
      res.status(errorResult.error.code).json(errorResult);
      return;
    }

    res.json({
      success: true,
      data: {
        prompt: prompt.id,
        result,
      },
    });
  } catch (error: unknown) {
    const errorObj = new Error('Failed to execute prompt');
    const errorResult = createErrorResult(
      errorObj,
      error instanceof Error ? error.message : 'Unknown error',
      500,
      {
        ...getRequestMetadata(req, 'prompts.execute'),
        context: {
          promptId,
          stage: 'unhandled',
        },
      }
    );
    res.status(errorResult.error.code).json(errorResult);
  }
}

/**
 * Register MCP prompt handlers with the server
 *
 * This function registers handlers for the MCP prompts/list and prompts/get endpoints
 * required by the Model Context Protocol specification. These endpoints enable
 * Claude Desktop to discover and retrieve prompt templates from the server.
 *
 * Supports both legacy Handlebars prompts and new v1 MCP-compliant prompts.
 *
 * @param server - MCP server instance
 * @param context - Optional server context
 * @example
 * ```typescript
 * const server = new Server();
 * registerPromptHandlers(server);
 * ```
 */
export function registerPromptHandlers(
  server: Server,
  context?: ServerContext
): void {
  // Set the global context for lazy initialization if provided
  if (context) {
    setGlobalContext(context);
  }

  // Register handler for prompts/list endpoint
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const legacyPrompts = getPromptsListPayload().prompts;
    const v1Prompts = getAllPromptsV1().map((p) => ({
      name: p.metadata.name,
      description: p.metadata.description,
      arguments: p.arguments.map((arg) => ({
        name: arg.name,
        description: arg.description,
        required: arg.required,
      })),
    }));

    return {
      prompts: [...legacyPrompts, ...v1Prompts],
    };
  });

  // Register handler for prompts/get endpoint
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name as string;
    const args = (request.params.arguments || {}) as Record<string, unknown>;
    const startTime = Date.now();

    // Check if this is a v1 prompt
    if (isV1Prompt(promptName)) {
      const promptDef = getPromptV1ByName(promptName);

      if (!promptDef) {
        throw new Error(`Prompt not found: ${promptName}`);
      }

      // Validate arguments
      const validation = validateArguments(args, promptDef.arguments);
      if (!validation.success) {
        const error = createValidationError(validation.errors);
        throw new Error(error.message);
      }

      // Build messages
      const messages = promptDef.buildMessages(validation.data);

      // Check token budget
      const budgetCheck = await checkTokenBudget(promptName, messages);
      if (!budgetCheck.withinBudget) {
        const error = createBudgetExceededError(budgetCheck);
        throw new Error(error.message);
      }

      // Calculate token metadata
      const tokenMetadata = await calculatePromptTokens(messages);

      // Log telemetry
      const telemetryEvent = createTelemetryEvent(
        promptName,
        tokenMetadata,
        messages.length,
        startTime,
        false // budget not exceeded (already checked above)
      );
      logPromptTelemetry(telemetryEvent);

      // Build response
      const response: Record<string, unknown> = {
        description: promptDef.metadata.description,
        messages: messages,
      };

      // Add dev metadata if enabled
      if (isDevMetaEnabled()) {
        response._meta = tokenMetadata;
      }

      return response;
    }

    // Handle legacy Handlebars prompts
    const prompt = getPromptById(promptName);

    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    return {
      description: prompt.description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt.template,
          },
        },
      ],
    };
  });
}
function getRequestMetadata(req: Request, toolName: string) {
  const requestId =
    req.header('x-request-id') ||
    req.header('x-correlation-id') ||
    req.header('x-amzn-trace-id');
  const userId = req.header('x-attio-user-id') || req.header('x-user-id');

  return {
    toolName,
    requestId: requestId ?? 'unknown',
    userId: userId ?? 'unknown',
  };
}
