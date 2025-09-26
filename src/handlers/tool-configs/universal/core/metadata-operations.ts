import {
  UniversalToolConfig,
  UniversalAttributesParams,
  UniversalResourceType,
} from '../types.js';
import {
  getAttributesSchema,
  discoverAttributesSchema,
  validateUniversalToolParams,
} from '../schemas.js';
import {
  handleUniversalGetAttributes,
  handleUniversalDiscoverAttributes,
  getSingularResourceType,
} from '../shared-handlers.js';

export const getAttributesConfig: UniversalToolConfig<
  UniversalAttributesParams,
  Record<string, unknown> | { error: string; success: boolean }
> = {
  name: 'get-attributes',
  handler: async (
    params: UniversalAttributesParams
  ): Promise<Record<string, unknown> | { error: string; success: boolean }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'get-attributes',
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
  name: 'discover-attributes',
  handler: async (params: {
    resource_type: UniversalResourceType;
    categories?: string[];
  }): Promise<
    Record<string, unknown> | { error: string; success: boolean }
  > => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'discover-attributes',
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
  name: 'get-attributes',
  description:
    'Get attributes for any resource type (companies, people, lists, records, tasks, deals, notes)',
  inputSchema: getAttributesSchema,
};

export const discoverAttributesDefinition = {
  name: 'discover-attributes',
  description: 'Discover available attributes for any resource type',
  inputSchema: discoverAttributesSchema,
};
