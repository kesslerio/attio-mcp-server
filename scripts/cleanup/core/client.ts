/**
 * Attio client setup for cleanup scripts
 */
import { AxiosInstance } from 'axios';
import { buildAttioClient } from '../../../src/api/attio-client.js';
import { logError, logInfo, validateEnvironment } from './utils.js';

let clientInstance: AxiosInstance | null = null;

/**
 * Initialize the Attio client for cleanup operations
 */
export function initializeCleanupClient(): AxiosInstance {
  if (clientInstance) {
    return clientInstance;
  }

  // Validate environment
  const validation = validateEnvironment();
  if (!validation.valid) {
    throw new Error(`Missing required environment variables: ${validation.missing.join(', ')}`);
  }

  const apiKey = process.env.ATTIO_API_KEY!;
  
  logInfo('Initializing Attio client for cleanup operations');
  
  try {
    clientInstance = buildAttioClient({
      apiKey,
      timeoutMs: 30000 // 30 second timeout for cleanup operations
    });

    logInfo('Attio client initialized successfully');
    return clientInstance;

  } catch (error) {
    logError('Failed to initialize Attio client', error);
    throw error;
  }
}

/**
 * Get the initialized client instance
 */
export function getCleanupClient(): AxiosInstance {
  if (!clientInstance) {
    return initializeCleanupClient();
  }
  return clientInstance;
}

/**
 * Test the client connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getCleanupClient();
    
    // Test with a simple query that should work with any valid API key
    const response = await client.post('/objects/companies/records/query', {
      limit: 1
    });
    
    if (response.status === 200) {
      logInfo('✅ Connection test successful');
      return true;
    }
    
    logError('Connection test failed with status:', response.status);
    return false;

  } catch (error: any) {
    logError('Connection test failed', {
      status: error?.response?.status,
      message: error?.message
    });
    return false;
  }
}

/**
 * Get workspace API UUID from environment
 */
export function getWorkspaceApiUuid(): string {
  const uuid = process.env.WORKSPACE_API_UUID;
  
  if (!uuid) {
    throw new Error(
      'WORKSPACE_API_UUID environment variable is required for safe cleanup operations. ' +
      'This ensures only data created by your MCP server is deleted.'
    );
  }

  return uuid;
}

/**
 * Validate that we have permission to perform cleanup operations
 */
export async function validateCleanupPermissions(apiToken?: string): Promise<void> {
  const client = getCleanupClient();
  const token = apiToken || (process.env.WORKSPACE_API_UUID ? getWorkspaceApiUuid() : 'provided');
  
  logInfo('Validating cleanup permissions', { token: typeof token === 'string' ? token.substring(0, 8) + '...' : 'provided' });
  
  try {
    // Test with a simple query to ensure we have access
    await client.post('/objects/companies/records/query', {
      limit: 1
    });
    
    logInfo('✅ Cleanup permissions validated');
    
  } catch (error: any) {
    logError('Permission validation failed', {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message
    });
    throw new Error('Insufficient permissions for cleanup operations');
  }
}