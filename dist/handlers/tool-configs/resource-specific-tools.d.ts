/**
 * Configuration for resource-specific tools that don't require objectSlug
 * These tools have a predefined resource type built into their implementation
 */
export declare const RESOURCE_SPECIFIC_CREATE_TOOLS: readonly ["create-company", "create-person"];
export type ResourceSpecificCreateTool = typeof RESOURCE_SPECIFIC_CREATE_TOOLS[number];
/**
 * Resource mapping for specific create tools
 */
export declare const RESOURCE_TYPE_MAP: Record<ResourceSpecificCreateTool, string>;
/**
 * Validation rules for resource-specific tools
 */
export declare const VALIDATION_RULES: Record<ResourceSpecificCreateTool, (attributes: any) => string | null>;
//# sourceMappingURL=resource-specific-tools.d.ts.map