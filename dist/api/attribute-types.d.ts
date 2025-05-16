/**
 * Interface for Attio attribute metadata
 */
export interface AttioAttributeMetadata {
    id: {
        workspace_id: string;
        object_id: string;
        attribute_id: string;
    };
    api_slug: string;
    title: string;
    description?: string;
    type: string;
    is_system_attribute?: boolean;
    is_writable?: boolean;
    is_required?: boolean;
    is_unique?: boolean;
    is_multiselect?: boolean;
    is_default_value_enabled?: boolean;
    is_archived?: boolean;
    default_value?: any;
    relationship?: any;
    created_at?: string;
    config?: {
        currency?: {
            default_currency_code?: string | null;
            display_type?: string | null;
        };
        record_reference?: {
            allowed_object_ids?: string[] | null;
        };
        select?: {
            options?: Array<{
                id: string;
                title: string;
                value: string;
            }>;
        };
    };
}
/**
 * Fetches and caches attribute metadata for a specific object type
 *
 * @param objectSlug - The object type (e.g., 'companies', 'people')
 * @returns Map of attribute slug to metadata
 */
export declare function getObjectAttributeMetadata(objectSlug: string): Promise<Map<string, AttioAttributeMetadata>>;
/**
 * Detects the field type of a specific attribute
 *
 * @param objectSlug - The object type (e.g., 'companies', 'people')
 * @param attributeSlug - The attribute slug (e.g., 'name', 'products')
 * @returns The detected field type
 */
export declare function detectFieldType(objectSlug: string, attributeSlug: string): Promise<string>;
/**
 * Gets detailed type information for an attribute
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @returns Detailed type information
 */
export declare function getAttributeTypeInfo(objectSlug: string, attributeSlug: string): Promise<{
    fieldType: string;
    isArray: boolean;
    isRequired: boolean;
    isUnique: boolean;
    attioType: string;
    metadata: AttioAttributeMetadata | null;
}>;
/**
 * Clears the attribute cache for a specific object type or all types
 *
 * @param objectSlug - Optional object type to clear (clears all if not provided)
 */
export declare function clearAttributeCache(objectSlug?: string): void;
/**
 * Gets field validation rules based on attribute metadata
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @returns Validation rules for the field
 */
export declare function getFieldValidationRules(objectSlug: string, attributeSlug: string): Promise<{
    type: string;
    required: boolean;
    unique: boolean;
    allowMultiple: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    enum?: any[];
}>;
/**
 * Formats an attribute value according to Attio's expected format
 *
 * @param objectSlug - The object type
 * @param attributeSlug - The attribute slug
 * @param value - The raw value to format
 * @returns The formatted value in Attio's expected structure
 */
export declare function formatAttributeValue(objectSlug: string, attributeSlug: string, value: any): Promise<any>;
/**
 * Validates and formats all attributes for an object
 *
 * @param objectSlug - The object type
 * @param attributes - Raw attributes object
 * @returns Formatted attributes ready for Attio API
 */
export declare function formatAllAttributes(objectSlug: string, attributes: Record<string, any>): Promise<Record<string, any>>;
//# sourceMappingURL=attribute-types.d.ts.map