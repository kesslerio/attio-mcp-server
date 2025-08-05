/**
 * Configuration for resource-specific tools that don't require objectSlug
 * These tools have a predefined resource type built into their implementation
 */

export const RESOURCE_SPECIFIC_CREATE_TOOLS = [
  'create-company',
  'create-person',
] as const;
export type ResourceSpecificCreateTool =
  (typeof RESOURCE_SPECIFIC_CREATE_TOOLS)[number];

/**
 * Resource mapping for specific create tools
 */
export const RESOURCE_TYPE_MAP: Record<ResourceSpecificCreateTool, string> = {
  'create-company': 'companies',
  'create-person': 'people',
};

/**
 * Validation rules for resource-specific tools
 */
export const VALIDATION_RULES: Record<
  ResourceSpecificCreateTool,
  (attributes: any) => string | null
> = {
  'create-company': (attributes) => {
    if (!attributes.name) {
      return 'Company name is required for create-company tool';
    }
    return null;
  },
  'create-person': (attributes) => {
    if (!(attributes.name || attributes.email)) {
      return 'Person name or email is required for create-person tool';
    }
    return null;
  },
};
