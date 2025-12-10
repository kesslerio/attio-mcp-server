import {
  UniversalToolConfig,
  UniversalAttributesParams,
  UniversalResourceType,
  UniversalGetAttributeOptionsParams,
} from '../types.js';
import {
  getAttributesSchema,
  discoverAttributesSchema,
  getAttributeOptionsSchema,
  validateUniversalToolParams,
} from '../schemas.js';
import {
  handleUniversalGetAttributes,
  handleUniversalDiscoverAttributes,
  handleUniversalGetAttributeOptions,
  getSingularResourceType,
} from '../shared-handlers.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import type { AttributeOptionsResult } from '@/services/metadata/index.js';

export const getAttributesConfig: UniversalToolConfig<
  UniversalAttributesParams,
  Record<string, unknown> | { error: string; success: boolean }
> = {
  name: 'records_get_attributes',
  handler: async (
    params: UniversalAttributesParams
  ): Promise<Record<string, unknown> | { error: string; success: boolean }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_get_attributes',
        params
      );
      return await handleUniversalGetAttributes(sanitizedParams);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage, success: false };
    }
  },
  formatResult: (
    attributes: Record<string, unknown>,
    ...args: unknown[]
  ): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
    if (!attributes) {
      return 'No attributes found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    if (Array.isArray(attributes)) {
      return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${attributes.length}):\n${attributes
        .map((attr: Record<string, unknown>, index: number) => {
          const name =
            attr.title || attr.api_slug || attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          return `${index + 1}. ${name} (${type})`;
        })
        .join('\n')}`;
    }

    if (typeof attributes === 'object' && attributes !== null) {
      if (attributes.all && Array.isArray(attributes.all)) {
        return `Available ${resourceTypeName} attributes (${(attributes.all as []).length}):\n${(
          attributes.all as Record<string, unknown>[]
        )
          .map((attr: Record<string, unknown>, index: number) => {
            const name =
              attr.title ||
              attr.api_slug ||
              attr.name ||
              attr.slug ||
              'Unnamed';
            const type = attr.type || 'unknown';
            return `${index + 1}. ${name} (${type})`;
          })
          .join('\n')}`;
      }

      if (attributes.attributes && Array.isArray(attributes.attributes)) {
        return `Available ${resourceTypeName} attributes (${(attributes.attributes as []).length}):\n${(
          attributes.attributes as Record<string, unknown>[]
        )
          .map((attr: Record<string, unknown>, index: number) => {
            const name = attr.name || attr.api_slug || attr.slug || 'Unnamed';
            const type = attr.type || 'unknown';
            return `${index + 1}. ${name} (${type})`;
          })
          .join('\n')}`;
      }

      const keys = Object.keys(attributes);
      if (keys.length > 0) {
        return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${keys.length}):\n${keys
          .map((key, index) => {
            const value = attributes[key];
            if (typeof value === 'string') {
              return `${index + 1}. ${key}: "${value}"`;
            }
            return `${index + 1}. ${key}`;
          })
          .join('\n')}`;
      }
    }

    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes available`;
  },
};

export const discoverAttributesConfig: UniversalToolConfig<
  { resource_type: UniversalResourceType; categories?: string[] },
  Record<string, unknown> | { error: string; success: boolean }
> = {
  name: 'records_discover_attributes',
  handler: async (params: {
    resource_type: UniversalResourceType;
    categories?: string[];
  }): Promise<
    Record<string, unknown> | { error: string; success: boolean }
  > => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_discover_attributes',
        params
      );
      return await handleUniversalDiscoverAttributes(
        sanitizedParams.resource_type,
        {
          categories: sanitizedParams.categories,
        }
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage, success: false };
    }
  },
  formatResult: (schema: unknown, ...args: unknown[]): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
    if (!schema) {
      return 'No attribute schema found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    if (Array.isArray(schema)) {
      return `Available ${resourceTypeName} attributes (${schema.length}):\n${schema
        .map((attr: Record<string, unknown>, index: number) => {
          const name =
            attr.title || attr.api_slug || attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          const required = attr.required ? ' (required)' : '';
          return `${index + 1}. ${name} (${type})${required}`;
        })
        .join('\n')}`;
    }

    if (typeof schema === 'object' && schema !== null) {
      const schemaRecord = schema as Record<string, unknown>;
      if (schemaRecord.all && Array.isArray(schemaRecord.all)) {
        return `Available ${resourceTypeName} attributes (${schemaRecord.all.length}):\n${schemaRecord.all
          .map((attr: Record<string, unknown>, index: number) => {
            const name =
              attr.title ||
              attr.api_slug ||
              attr.name ||
              attr.slug ||
              'Unnamed';
            const type = attr.type || 'unknown';
            const required = attr.required ? ' (required)' : '';
            return `${index + 1}. ${name} (${type})${required}`;
          })
          .join('\n')}`;
      }

      if (schemaRecord.attributes && Array.isArray(schemaRecord.attributes)) {
        return `Available ${resourceTypeName} attributes (${schemaRecord.attributes.length}):\n${schemaRecord.attributes
          .map((attr: Record<string, unknown>, index: number) => {
            const name =
              attr.title ||
              attr.api_slug ||
              attr.name ||
              attr.slug ||
              'Unnamed';
            const type = attr.type || 'unknown';
            const required = attr.required ? ' (required)' : '';
            return `${index + 1}. ${name} (${type})${required}`;
          })
          .join('\n')}`;
      }

      if (schemaRecord.standard || schemaRecord.custom) {
        const standard =
          (schemaRecord.standard as Record<string, unknown>[]) || [];
        const custom = (schemaRecord.custom as Record<string, unknown>[]) || [];
        const total = standard.length + custom.length;

        let result = `Available ${resourceTypeName} attributes (${total} total):\n`;

        if (standard.length > 0) {
          result += `\nStandard attributes (${standard.length}):\n${standard
            .map((attr: Record<string, unknown>, index: number) => {
              const name =
                attr.title ||
                attr.api_slug ||
                attr.name ||
                attr.slug ||
                'Unnamed';
              const type = attr.type || 'unknown';
              return `${index + 1}. ${name} (${type})`;
            })
            .join('\n')}`;
        }

        if (custom.length > 0) {
          result += `\n\nCustom attributes (${custom.length}):\n${custom
            .map((attr: Record<string, unknown>, index: number) => {
              const name =
                attr.title ||
                attr.api_slug ||
                attr.name ||
                attr.slug ||
                'Unnamed';
              const type = attr.type || 'unknown';
              return `${standard.length + index + 1}. ${name} (${type})`;
            })
            .join('\n')}`;
        }

        return result;
      }
    }

    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attribute schema available`;
  },
};

export const getAttributesDefinition = {
  name: 'records_get_attributes',
  description: formatToolDescription({
    capability: 'Retrieve attribute metadata for a given resource type.',
    boundaries: 'modify schema definitions or record data.',
    constraints: 'Requires resource_type; optional categories narrows groups.',
    recoveryHint:
      'Use records.discover_attributes for grouped schema discovery.',
  }),
  inputSchema: getAttributesSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export const discoverAttributesDefinition = {
  name: 'records_discover_attributes',
  description: formatToolDescription({
    capability:
      'Discover available attributes (standard/custom) for a resource.',
    boundaries: 'alter schema or create fields.',
    constraints: 'Requires resource_type; optional categories selects subsets.',
    recoveryHint:
      'Follow with records.get_attributes to inspect specific fields.',
  }),
  inputSchema: discoverAttributesSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

/**
 * Tool config for getting attribute options (select, multi-select, status)
 */
export const getAttributeOptionsConfig: UniversalToolConfig<
  UniversalGetAttributeOptionsParams,
  AttributeOptionsResult | { error: string; success: boolean }
> = {
  name: 'records_get_attribute_options',
  handler: async (
    params: UniversalGetAttributeOptionsParams
  ): Promise<AttributeOptionsResult | { error: string; success: boolean }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_get_attribute_options',
        params
      );
      return await handleUniversalGetAttributeOptions(sanitizedParams);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage, success: false };
    }
  },
  formatResult: (
    result: AttributeOptionsResult | { error: string; success: boolean },
    ...args: unknown[]
  ): string => {
    // Handle error response
    if ('error' in result && 'success' in result) {
      return `Error: ${result.error}`;
    }

    const params = args[0] as UniversalGetAttributeOptionsParams | undefined;
    const resourceType = params?.resource_type;
    const attribute = params?.attribute || 'attribute';

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    const { options, attributeType } = result;

    if (!options || !Array.isArray(options) || options.length === 0) {
      return (
        `No options found for attribute "${attribute}" on ${resourceTypeName}.\n\n` +
        `This could mean:\n` +
        `- The attribute has no configured options yet\n` +
        `- The attribute is not a select, multi-select, or status type\n\n` +
        `Hint: Use records_discover_attributes to verify the attribute type.`
      );
    }

    // Separate active and archived options
    const activeOptions = options.filter((opt) => !opt.is_archived);
    const archivedOptions = options.filter((opt) => opt.is_archived);

    const typeLabel = attributeType === 'status' ? 'status' : 'select';
    let output = `Options for "${attribute}" (${typeLabel}) attribute on ${resourceTypeName}:\n\n`;

    if (activeOptions.length > 0) {
      output += `Active options (${activeOptions.length}):\n`;
      activeOptions.forEach((opt, index) => {
        output += `  ${index + 1}. "${opt.title}"\n`;
      });
    }

    if (archivedOptions.length > 0) {
      output += `\nArchived options (${archivedOptions.length}):\n`;
      archivedOptions.forEach((opt, index) => {
        output += `  ${activeOptions.length + index + 1}. "${opt.title}" (archived)\n`;
      });
    }

    output += `\nTotal: ${options.length} option${options.length !== 1 ? 's' : ''}`;
    if (archivedOptions.length > 0) {
      output += ` (${activeOptions.length} active, ${archivedOptions.length} archived)`;
    }

    // Add helpful hint
    const exampleOption = activeOptions[0]?.title || options[0]?.title;
    output += `\n\nHint: Use the option title (e.g., "${exampleOption}") when setting this attribute value.`;

    return output;
  },
};

export const getAttributeOptionsDefinition = {
  name: 'records_get_attribute_options',
  description: formatToolDescription({
    capability:
      'Get valid options for select, multi-select, and status attributes to avoid "Cannot find select option" errors.',
    boundaries: 'return options for text, number, or other non-option types.',
    constraints: 'Requires resource_type and attribute slug/ID.',
    recoveryHint:
      'Use records_discover_attributes to find option-based attributes first.',
  }),
  inputSchema: getAttributeOptionsSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
