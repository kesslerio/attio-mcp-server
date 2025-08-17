/**
 * Test cleanup utilities for E2E and integration tests
 * Provides utilities for cleaning up test data and validating test environment
 */

import { getAttioClient } from '../../src/api/attio-client.js';

/**
 * Validates that required environment variables are set
 * @throws Error if required environment variables are missing
 */
export function validateTestEnvironment(): void {
  const requiredVars = ['ATTIO_API_KEY'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for integration tests: ${missing.join(', ')}\n` +
        'Please ensure you have a .env file with ATTIO_API_KEY set, or export the variable.'
    );
  }

  // Validate API key format (basic check)
  const apiKey = process.env.ATTIO_API_KEY;
  if (apiKey && !apiKey.startsWith('sk_')) {
    console.warn(
      'Warning: ATTIO_API_KEY should start with "sk_". Please verify you are using a valid API key.'
    );
  }
}

/**
 * Cleanup test data created during integration tests
 * @param testPrefix - Prefix used for test data (e.g., "TEST_", "E2E_")
 */
export async function cleanupTestData(
  testPrefix: string = 'TEST_'
): Promise<void> {
  try {
    const client = getAttioClient();

    // Clean up test people
    await cleanupTestPeople(client, testPrefix);

    // Clean up test companies
    await cleanupTestCompanies(client, testPrefix);

    // Clean up test tasks
    await cleanupTestTasks(client, testPrefix);

    console.log(`Test data cleanup completed for prefix: ${testPrefix}`);
  } catch (error) {
    console.error('Error during test data cleanup:', error);
    // Don't throw - cleanup errors shouldn't fail tests
  }
}

/**
 * Clean up test people records
 */
async function cleanupTestPeople(
  client: any,
  testPrefix: string
): Promise<void> {
  try {
    const response = await client.post('/api/v2/objects/people/records/query', {
      filter: {
        any_of: [
          {
            attribute: 'name',
            operator: 'starts_with',
            value: testPrefix,
          },
          {
            attribute: 'email_addresses',
            operator: 'contains',
            value: `${testPrefix.toLowerCase()}`,
          },
        ],
      },
    });

    const records = response.data?.data || [];
    for (const record of records) {
      await client.delete(
        `/api/v2/objects/people/records/${record.id.record_id}`
      );
      console.log(`Deleted test person: ${record.id.record_id}`);
    }
  } catch (error) {
    console.error('Error cleaning up test people:', error);
  }
}

/**
 * Clean up test company records
 */
async function cleanupTestCompanies(
  client: any,
  testPrefix: string
): Promise<void> {
  try {
    const response = await client.post(
      '/api/v2/objects/companies/records/query',
      {
        filter: {
          attribute: 'name',
          operator: 'starts_with',
          value: testPrefix,
        },
      }
    );

    const records = response.data?.data || [];
    for (const record of records) {
      await client.delete(
        `/api/v2/objects/companies/records/${record.id.record_id}`
      );
      console.log(`Deleted test company: ${record.id.record_id}`);
    }
  } catch (error) {
    console.error('Error cleaning up test companies:', error);
  }
}

/**
 * Clean up test tasks
 */
async function cleanupTestTasks(
  client: any,
  testPrefix: string
): Promise<void> {
  try {
    const response = await client.post('/api/v2/tasks/query', {
      filter: {
        attribute: 'content',
        operator: 'starts_with',
        value: testPrefix,
      },
    });

    const tasks = response.data?.data || [];
    for (const task of tasks) {
      await client.delete(`/api/v2/tasks/${task.id.task_id}`);
      console.log(`Deleted test task: ${task.id.task_id}`);
    }
  } catch (error) {
    console.error('Error cleaning up test tasks:', error);
  }
}

/**
 * Wait for a specified time to avoid rate limiting
 * @param ms - Milliseconds to wait
 */
export async function waitForRateLimit(ms: number = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        if (response?.status === 429) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`Rate limited. Retrying in ${delay}ms...`);
          await waitForRateLimit(delay);
          continue;
        }
      }

      // For other errors, retry with backoff
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Error occurred. Retrying in ${delay}ms...`);
        await waitForRateLimit(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Get a detailed error message from an API error
 * @param error - The error object
 */
export function getDetailedErrorMessage(error: any): string {
  if (error?.response) {
    const status = error.response.status;
    const statusText = error.response.statusText;
    const data = error.response.data;

    let message = `API Error ${status}: ${statusText}`;

    if (status === 401) {
      message += '\nAuthentication failed. Please check your ATTIO_API_KEY.';
    } else if (status === 429) {
      message += '\nRate limit exceeded. Please wait before retrying.';
    } else if (data?.error) {
      message += `\n${data.error}`;
    }

    return message;
  }

  return error?.message || 'Unknown error occurred';
}
