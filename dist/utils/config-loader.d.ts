/**
 * Interface for mapping configuration
 */
export interface MappingConfig {
    version: string;
    metadata?: Record<string, any>;
    mappings: {
        attributes: {
            common: Record<string, string>;
            objects: Record<string, Record<string, string>>;
            custom: Record<string, string>;
        };
        objects: Record<string, string>;
        lists: Record<string, string>;
        relationships: Record<string, string>;
        [key: string]: any;
    };
}
/**
 * Loads and merges the mapping configuration from default and user files
 *
 * @returns The merged mapping configuration
 */
export declare function loadMappingConfig(): MappingConfig;
/**
 * Writes a mapping configuration to a file
 *
 * @param config - The configuration to write
 * @param filePath - The file path to write to (defaults to user.json)
 */
export declare function writeMappingConfig(config: MappingConfig, filePath?: string): Promise<void>;
/**
 * Updates a specific section of the mapping configuration
 *
 * @param section - The section to update (e.g., 'attributes.common')
 * @param mappings - The mappings to set or merge
 * @param merge - Whether to merge with existing mappings (default: true)
 * @param filePath - The file path to write to (defaults to user.json)
 */
export declare function updateMappingSection(section: string, mappings: Record<string, any>, merge?: boolean, filePath?: string): Promise<void>;
//# sourceMappingURL=config-loader.d.ts.map