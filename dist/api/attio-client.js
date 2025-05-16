/**
 * Attio API client and related utilities
 */
import axios from "axios";
import { createAttioError } from "../utils/error-handler.js";
// Global API client instance
let apiInstance = null;
/**
 * Creates and configures an Axios instance for the Attio API
 *
 * @param apiKey - The Attio API key
 * @returns Configured Axios instance
 */
export function createAttioClient(apiKey) {
    const client = axios.create({
        baseURL: "https://api.attio.com/v2",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
    });
    // Add response interceptor for error handling
    client.interceptors.response.use(response => response, error => {
        if (process.env.NODE_ENV === 'development') {
            console.error('[Attio API] Request failed:');
            console.error('URL:', error.config?.url);
            console.error('Method:', error.config?.method);
            console.error('Data:', error.config?.data);
            console.error('Response status:', error.response?.status);
            console.error('Response data:', error.response?.data);
        }
        const enhancedError = createAttioError(error);
        return Promise.reject(enhancedError);
    });
    return client;
}
/**
 * Initializes the global API client with the provided API key
 *
 * @param apiKey - The Attio API key
 */
export function initializeAttioClient(apiKey) {
    apiInstance = createAttioClient(apiKey);
}
/**
 * Gets the global API client instance
 *
 * @returns The Axios instance for the Attio API
 * @throws If the API client hasn't been initialized
 */
export function getAttioClient() {
    if (!apiInstance) {
        throw new Error("API client not initialized. Call initializeAttioClient first.");
    }
    return apiInstance;
}
//# sourceMappingURL=attio-client.js.map