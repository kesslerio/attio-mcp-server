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
 * Command handler for discovering attributes
 *
 * @param argv - Command arguments
 */
export declare function discoverAttributes(argv: AttributesCommandArgs): Promise<void>;
export {};
//# sourceMappingURL=attributes.d.ts.map