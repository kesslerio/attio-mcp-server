/**
 * Interface for command arguments
 */
interface AttributesCommandArgs {
    object?: string;
    all?: boolean;
    output?: string;
    reset?: boolean;
    apiKey?: string;
    [key: string]: unknown;
}
/**
 * Gets all available objects from Attio
 *
 * @param apiKey - The Attio API key
 * @returns Array of object slugs
 */
export declare function getAvailableObjects(apiKey: string): Promise<string[]>;
/**
 * Discovers attributes for a specific object
 *
 * @param objectSlug - The object slug (e.g., 'companies')
 * @param apiKey - The Attio API key
 * @returns Map of attribute titles to API slugs
 */
export declare function getObjectAttributes(objectSlug: string, apiKey: string): Promise<Record<string, string>>;
/**
 * Command handler for discovering attributes
 *
 * @param argv - Command arguments
 */
export declare function discoverAttributes(argv: AttributesCommandArgs): Promise<void>;
export {};
//# sourceMappingURL=attributes.d.ts.map