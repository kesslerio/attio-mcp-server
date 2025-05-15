/**
 * Configuration for auto-discovery
 */
export interface AutoDiscoveryConfig {
    enabled: boolean;
    runOnStartup: boolean;
    intervalMinutes?: number;
    outputPath?: string;
}
/**
 * Run attribute discovery for all objects
 */
export declare function runDiscovery(apiKey: string, outputPath?: string): Promise<void>;
/**
 * Start automatic discovery with optional periodic updates
 */
export declare function startAutoDiscovery(apiKey: string, config?: Partial<AutoDiscoveryConfig>): Promise<void>;
/**
 * Stop automatic discovery
 */
export declare function stopAutoDiscovery(): void;
//# sourceMappingURL=auto-discovery.d.ts.map