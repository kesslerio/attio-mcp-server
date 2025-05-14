/**
 * Attio API client and related utilities
 */
import { AxiosInstance } from "axios";
/**
 * Creates and configures an Axios instance for the Attio API
 *
 * @param apiKey - The Attio API key
 * @returns Configured Axios instance
 */
export declare function createAttioClient(apiKey: string): AxiosInstance;
/**
 * Initializes the global API client with the provided API key
 *
 * @param apiKey - The Attio API key
 */
export declare function initializeAttioClient(apiKey: string): void;
/**
 * Gets the global API client instance
 *
 * @returns The Axios instance for the Attio API
 * @throws If the API client hasn't been initialized
 */
export declare function getAttioClient(): AxiosInstance;
//# sourceMappingURL=attio-client.d.ts.map