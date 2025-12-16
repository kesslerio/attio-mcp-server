/**
 * Type definitions for the Workspace Schema Skill Generator
 *
 * These types support the generation of Claude Skills from Attio workspace schemas,
 * addressing the common issue where LLMs make errors due to unknown attribute values.
 *
 * @see Issue #983
 */

/**
 * Configuration for the generate-skill CLI command
 */
export interface GenerateSkillConfig {
  /** Object slugs to include in the generated skill */
  objects: string[];

  /** Output format: Claude Skill, plain Markdown, or JSON */
  format: 'skill' | 'markdown' | 'json';

  /** Output directory path */
  outputDir: string;

  /** Whether to package output as ZIP file */
  zip: boolean;

  /** Maximum options to display per attribute (default: 20) */
  maxOptionsPerAttribute: number;

  /** Whether to include archived options */
  includeArchived: boolean;

  /** Delay between attribute option fetches in milliseconds (default: 100) */
  optionFetchDelayMs?: number;

  /** Attio API key for authentication */
  apiKey: string;
}

/**
 * Complete workspace schema containing multiple objects
 */
export interface WorkspaceSchema {
  /** Metadata about the schema generation */
  metadata: {
    /** ISO 8601 timestamp when schema was generated */
    generatedAt: string;

    /** Workspace identifier or name */
    workspace: string;

    /** List of object slugs included in this schema */
    objects: string[];
  };

  /** Array of object schemas */
  objects: ObjectSchema[];
}

/**
 * Schema for a single Attio object (companies, people, deals, etc.)
 */
export interface ObjectSchema {
  /** API slug of the object (e.g., 'companies', 'people') */
  objectSlug: string;

  /** Human-readable display name (e.g., 'Companies', 'People') */
  displayName: string;

  /** Array of attribute schemas for this object */
  attributes: AttributeSchema[];
}

/**
 * Schema for a single attribute within an object
 */
export interface AttributeSchema {
  /** API slug used in API calls (e.g., 'team_size', 'industry') */
  apiSlug: string;

  /** Display name shown in Attio UI */
  displayName: string;

  /** Attribute type (e.g., 'text', 'select', 'location', 'personal-name') */
  type: string;

  /** Whether this attribute accepts multiple values */
  isMultiselect: boolean;

  /** Whether this attribute has a uniqueness constraint */
  isUnique: boolean;

  /** Whether this attribute is required for record creation */
  isRequired: boolean;

  /** Whether this attribute can be modified */
  isWritable: boolean;

  /** Optional description of the attribute's purpose */
  description?: string;

  /** For select/status attributes: array of valid options */
  options?: AttributeOption[];

  /** Whether options were truncated due to maxOptionsPerAttribute limit */
  optionsTruncated?: boolean;

  /** Total number of options available (before truncation) */
  totalOptions?: number;

  /** For complex types: structure definition with field types */
  complexTypeStructure?: Record<string, unknown>;

  /** For relationship attributes: target object and cardinality */
  relationship?: {
    /** Target object slug (e.g., 'companies', 'people') */
    targetObject: string;

    /** Relationship cardinality */
    cardinality: string;
  };
}

/**
 * A single option for select or status attributes
 */
export interface AttributeOption {
  /** Unique identifier for this option */
  id: string;

  /** Display title shown in Attio UI */
  title: string;

  /** API value used in API calls */
  value: string;

  /** Whether this option is archived */
  isArchived?: boolean;
}

/**
 * Formatted output ready for writing to disk
 */
export interface FormattedOutput {
  /** Output format type */
  format: 'skill' | 'markdown' | 'json';

  /** Map of relative file paths to file contents */
  files: Record<string, string>;
}

/**
 * Result of writing skill output to disk
 */
export interface SkillOutput {
  /** Output format that was written */
  format: 'skill' | 'markdown' | 'json';

  /** Absolute path to the output directory or file */
  path: string;

  /** List of files that were created */
  files: string[];
}

/**
 * Options for fetching object schema
 */
export interface FetchSchemaOptions {
  /** Maximum options to retrieve per attribute */
  maxOptionsPerAttribute: number;

  /** Whether to include archived options */
  includeArchived: boolean;

  /** Delay between attribute option fetches in milliseconds (default: 100) */
  optionFetchDelayMs?: number;
}
