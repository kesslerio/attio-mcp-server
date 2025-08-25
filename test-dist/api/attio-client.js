/**
 * Attio API client and related utilities
 */
import axios from 'axios';
import { createAttioError } from '../utils/error-handler.js';
import { debug, error as logError, OperationType } from '../utils/logger.js';
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
        baseURL: 'https://api.attio.com/v2',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    // Add response interceptor for error handling
    client.interceptors.response.use((response) => {
        // Debug logging for ALL successful responses to understand what's happening
        debug('attio-client', 'Response interceptor called', {
            url: response.config?.url,
            method: response.config?.method,
            status: response.status,
            hasData: !!response.data,
            isTasksRequest: response.config?.url?.includes('/tasks'),
        }, 'api-request', OperationType.API_CALL);
        // More detailed logging for tasks requests
        if (response.config?.url?.includes('/tasks')) {
            debug('attio-client', 'Tasks request succeeded', {
                url: response.config?.url,
                method: response.config?.method,
                status: response.status,
                responseData: response.data,
                responseType: typeof response,
                responseKeys: Object.keys(response),
            }, 'api-request', OperationType.API_CALL);
        }
        // IMPORTANT: Must return the response object for it to be available to the caller
        return response;
    }, (error) => {
        // Log ALL errors to understand what's happening
        debug('attio-client', 'Error interceptor called', {
            url: error.config?.url,
            method: error.config?.method,
            message: error.message,
            code: error.code,
            hasResponse: !!error.response,
            responseStatus: error.response?.status,
            isTasksRequest: error.config?.url?.includes('/tasks'),
        }, 'api-request', OperationType.API_CALL);
        if (error.config?.url?.includes('/tasks')) {
            const errorData = {
                url: error.config?.url,
                method: error.config?.method,
                requestHeaders: error.config?.headers,
                requestData: error.config?.data,
                requestDataType: typeof error.config?.data,
                responseStatus: error.response?.status,
                responseData: error.response?.data,
                validationErrors: error.response?.data
                    ?.validation_errors,
            };
            logError('attio-client', 'Tasks request failed', error, errorData, 'api-request', OperationType.API_CALL);
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
    return apiInstance;
}
/**
 * Gets the global API client instance
 *
 * @returns The Axios instance for the Attio API
 * @throws If the API client hasn't been initialized and no API key is available
 */
export function getAttioClient() {
    if (!apiInstance) {
        // Fallback: try to initialize from environment variable
        const apiKey = process.env.ATTIO_API_KEY;
        if (apiKey) {
            debug('attio-client', 'API client not initialized, auto-initializing from environment variable', undefined, 'initialization', OperationType.SYSTEM);
            return initializeAttioClient(apiKey);
        }
        throw new Error('API client not initialized. Call initializeAttioClient first or set ATTIO_API_KEY environment variable.');
    }
    return apiInstance;
}
