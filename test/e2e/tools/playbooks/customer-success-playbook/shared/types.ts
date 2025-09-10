/**
 * Shared types and interfaces for Customer Success Playbook test suite
 */
// import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';
export type ToolResult = any;

export interface PlaybookTestResult {
  success: boolean;
  prompt: string;
  expectedOutcome: string;
  actualResult?: ToolResult;
  error?: string;
  duration: number;
  validationLevel?: ValidationLevel;
  validationDetails?: ValidationResult;
}

export enum ValidationLevel {
  FRAMEWORK_ERROR = 'FRAMEWORK_ERROR',
  API_ERROR = 'API_ERROR',
  DATA_ERROR = 'DATA_ERROR',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FULL_SUCCESS = 'FULL_SUCCESS',
}

export interface ValidationResult {
  frameworkSuccess: boolean;
  apiSuccess: boolean;
  dataValid: boolean;
  businessLogicValid: boolean;
  errorDetails: string[];
  warningDetails: string[];
}
