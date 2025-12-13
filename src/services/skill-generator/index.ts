/**
 * Workspace Schema Skill Generator
 *
 * Exports services and types for generating Claude Skills from Attio workspace schemas.
 *
 * @see Issue #983
 */

export { WorkspaceSchemaService } from './WorkspaceSchemaService.js';
export { SchemaFormatterService } from './SchemaFormatterService.js';
export { OutputWriterService } from './OutputWriterService.js';
export type {
  GenerateSkillConfig,
  WorkspaceSchema,
  ObjectSchema,
  AttributeSchema,
  AttributeOption,
  FormattedOutput,
  SkillOutput,
  FetchSchemaOptions,
} from './types.js';
