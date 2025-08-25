/**
 * Test cleanup utilities for E2E and integration tests
 * Provides utilities for cleaning up test data and validating test environment
 */

import { getAttioClient } from '../../src/api/attio-client.js';

/**
 * Interface for Attio API client
 */
interface AttioClient {
  post(url: string, data: any): Promise<any>;
  delete(url: string): Promise<any>;
  get(url: string): Promise<any>;
}

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

  // Validate API key presence (removed incorrect sk_ format check)
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    console.warn('Warning: ATTIO_API_KEY environment variable not set.');
  }
}

/**
 * Cleanup test data created during integration tests
 * @param testPrefix - Prefix used for test data (e.g., "TEST_", "E2E_")
 * @param options - Optional cleanup configuration
 */
export async function cleanupTestData(
  testPrefix: string = 'TEST_',
  options: {
    includeCompanies?: boolean;
    includePeople?: boolean;
    includeTasks?: boolean;
    includeLists?: boolean;
    includeNotes?: boolean;
    parallel?: boolean;
    maxRetries?: number;
  } = {}
): Promise<void> {
  const {
    includeCompanies = true,
    includePeople = true,
    includeTasks = true,
    includeLists = true,
    includeNotes = true,
    parallel = false,
    maxRetries = 3,
  } = options;

  try {
    const client = getAttioClient();

    if (parallel) {
      // Run cleanup operations in parallel for faster execution
      const cleanupPromises: Promise<void>[] = [];

      if (includeCompanies) {
        cleanupPromises.push(
          cleanupTestCompanies(client, testPrefix, maxRetries)
        );
      }
      if (includePeople) {
        cleanupPromises.push(cleanupTestPeople(client, testPrefix, maxRetries));
      }
      if (includeTasks) {
        cleanupPromises.push(cleanupTestTasks(client, testPrefix, maxRetries));
      }
      if (includeLists) {
        cleanupPromises.push(cleanupTestLists(client, testPrefix, maxRetries));
      }
      if (includeNotes) {
        cleanupPromises.push(cleanupTestNotes(client, testPrefix, maxRetries));
      }

      await Promise.allSettled(cleanupPromises);
    } else {
      // Run cleanup operations sequentially
      if (includeCompanies) {
        await cleanupTestCompanies(client, testPrefix, maxRetries);
      }
      if (includePeople) {
        await cleanupTestPeople(client, testPrefix, maxRetries);
      }
      if (includeTasks) {
        await cleanupTestTasks(client, testPrefix, maxRetries);
      }
      if (includeLists) {
        await cleanupTestLists(client, testPrefix, maxRetries);
      }
      if (includeNotes) {
        await cleanupTestNotes(client, testPrefix, maxRetries);
      }
    }

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
  client: AttioClient,
  testPrefix: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    const response = await client.post('/objects/people/records/query', {
      filter: {
        $or: [
          { name: { $starts_with: testPrefix } },
          { email_addresses: { $contains: testPrefix.toLowerCase() } },
        ],
      },
    });

    const records = response.data?.data ?? [];
    for (const record of records) {
      await client.delete(`/objects/people/records/${record.id.record_id}`);
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
  client: AttioClient,
  testPrefix: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    const response = await client.post('/objects/companies/records/query', {
      filter: {
        name: { $starts_with: testPrefix },
      },
    });

    const records = response.data?.data ?? [];
    for (const record of records) {
      await client.delete(`/objects/companies/records/${record.id.record_id}`);
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
  client: AttioClient,
  testPrefix: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    // Get all tasks and filter client-side since tasks API doesn't support POST query
    const response = await client.get('/tasks?pageSize=500');

    const tasks = response.data?.data ?? [];
    const filteredTasks = tasks.filter((task: any) => {
      const content = task.content || task.content_plaintext || '';
      const title = task.title || '';
      return content.startsWith(testPrefix) || title.startsWith(testPrefix);
    });

    for (const task of filteredTasks) {
      await client.delete(`/tasks/${task.id.task_id}`);
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

/**
 * Clean up test lists
 */
async function cleanupTestLists(
  client: AttioClient,
  testPrefix: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    const response = await retryWithBackoff(async () => {
      return client.get('/lists?limit=500');
    }, maxRetries);

    const allLists = response.data?.data ?? [];

    // Filter lists by name prefix
    const testLists = allLists.filter(
      (list: any) => list.name && list.name.startsWith(testPrefix)
    );

    for (const list of testLists) {
      try {
        await retryWithBackoff(async () => {
          await client.delete(`/lists/${list.id.list_id}`);
        }, maxRetries);

        console.log(`Deleted test list: ${list.id.list_id}`);

        // Small delay between deletions to avoid overwhelming the API
        await waitForRateLimit(200);
      } catch (error) {
        console.error(
          `Failed to delete list ${list.id.list_id}:`,
          getDetailedErrorMessage(error)
        );
      }
    }
  } catch (error) {
    console.error('Error cleaning up test lists:', error);
  }
}

/**
 * Clean up test notes
 * Note: This is a placeholder implementation as the notes API endpoints
 * need to be researched and confirmed.
 */
async function cleanupTestNotes(
  client: AttioClient,
  testPrefix: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    // TODO: Research and implement notes cleanup once API endpoints are confirmed
    // Possible endpoints might be:
    // - /api/v2/notes/query
    // - /api/v2/objects/notes/records/query
    // - Notes might be attached to other records as relationships

    console.log(
      'Notes cleanup not yet implemented - API endpoints need research'
    );

    // Placeholder logic if notes have a direct API:
    // const response = await retryWithBackoff(async () => {
    //   return client.post('/api/v2/notes/query', {
    //     filter: {
    //       attribute: 'content',
    //       operator: 'starts_with',
    //       value: testPrefix,
    //     },
    //   });
    // }, maxRetries);

    // const notes = response.data?.data ?? [];
    // for (const note of notes) {
    //   await retryWithBackoff(async () => {
    //     await client.delete(`/api/v2/notes/${note.id.note_id}`);
    //   }, maxRetries);
    //   console.log(`Deleted test note: ${note.id.note_id}`);
    // }
  } catch (error) {
    console.error('Error cleaning up test notes:', error);
  }
}

/**
 * Enhanced cleanup function that supports multiple prefixes
 * @param prefixes - Array of prefixes to clean up
 * @param options - Cleanup options
 */
export async function cleanupMultiplePrefixes(
  prefixes: string[],
  options: {
    includeCompanies?: boolean;
    includePeople?: boolean;
    includeTasks?: boolean;
    includeLists?: boolean;
    includeNotes?: boolean;
    parallel?: boolean;
    maxRetries?: number;
  } = {}
): Promise<void> {
  console.log(`Cleaning up test data for prefixes: ${prefixes.join(', ')}`);

  for (const prefix of prefixes) {
    await cleanupTestData(prefix, options);
    // Small delay between prefix cleanups to avoid rate limiting
    await waitForRateLimit(500);
  }

  console.log('Multi-prefix cleanup completed');
}
