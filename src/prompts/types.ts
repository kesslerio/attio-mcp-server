/**
 * Type definitions for MCP Prompts
 */

/**
 * Prompt parameter definition
 */
export interface PromptParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
}

/**
 * Prompt template definition
 */
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: 'people' | 'companies' | 'lists' | 'notes' | 'general';
  parameters: PromptParameter[];
  template: string;
}

/**
 * Prompt execution request
 */
export interface PromptExecutionRequest {
  parameters: Record<string, any>;
}

/**
 * Prompt execution response
 */
export interface PromptExecutionResponse {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Prompt list response
 */
export interface PromptListResponse {
  prompts: PromptTemplate[];
}

/**
 * Prompt categories response
 */
export interface PromptCategoriesResponse {
  categories: string[];
}
