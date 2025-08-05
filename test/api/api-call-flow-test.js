/**
 * Test the complete API call flow to find where untranslated filter is used
 */

import { getAttioClient } from '../../dist/api/attio-client.js';
import { advancedSearchObject } from '../../dist/api/attio-operations.js';
import { FilterConditionType, ResourceType } from '../../dist/types/attio.js';
import { translateAttributeNamesInFilters } from '../../dist/utils/attribute-mapping/index.js';
import { transformFiltersToApiFormat } from '../../dist/utils/filter-utils.js';

// Create a proxy to intercept the actual HTTP calls
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  console.log('\n[FETCH INTERCEPT] Request:', {
    url,
    method: options?.method,
    body: options?.body,
  });

  // Check if body contains untranslated attribute
  if (options?.body) {
    const bodyStr = JSON.stringify(options.body);
    if (bodyStr.includes('b2b_segment')) {
      console.error(
        '[FETCH] ERROR: Untranslated attribute "b2b_segment" in request body!'
      );
    }
  }

  // Mock the API error for b2b_segment
  if (options?.body && JSON.stringify(options.body).includes('b2b_segment')) {
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: 'Unknown attribute slug: b2b_segment' }),
    };
  }

  // Mock success for other cases
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  };
};

// Also intercept axios if it's being used
const Module = await import('module');
const require = Module.createRequire(import.meta.url);
try {
  const axios = require('axios');
  const originalPost = axios.post;
  axios.post = (url, data, config) => {
    console.log('\n[AXIOS INTERCEPT] POST:', {
      url,
      data: JSON.stringify(data, null, 2),
    });

    if (JSON.stringify(data).includes('b2b_segment')) {
      console.error(
        '[AXIOS] ERROR: Untranslated attribute "b2b_segment" in request!'
      );
      const error = new Error('Unknown attribute slug: b2b_segment');
      error.response = {
        status: 400,
        data: { error: 'Unknown attribute slug: b2b_segment' },
      };
      return Promise.reject(error);
    }

    return Promise.resolve({ data: { data: [] } });
  };
} catch (e) {
  console.log('Axios not available, skipping axios interception');
}

async function testCompleteFlow() {
  try {
    // Original filter with b2b_segment
    const originalFilter = {
      filters: [
        {
          attribute: { slug: 'b2b_segment' },
          condition: FilterConditionType.CONTAINS,
          value: 'Plastic Surgeon',
        },
      ],
    };

    console.log('\n=== Starting Complete Flow Test ===');
    console.log('Original filter:', JSON.stringify(originalFilter, null, 2));

    // Step 1: Translate
    console.log('\n--- Step 1: Translation ---');
    const translated = translateAttributeNamesInFilters(
      originalFilter,
      ResourceType.COMPANIES
    );
    console.log('Translated filter:', JSON.stringify(translated, null, 2));

    // Step 2: Transform to API format
    console.log('\n--- Step 2: API Format Transformation ---');
    const apiFormat = transformFiltersToApiFormat(translated);
    console.log('API format:', JSON.stringify(apiFormat, null, 2));

    // Step 3: Make the actual API call
    console.log('\n--- Step 3: API Call ---');
    try {
      const results = await advancedSearchObject(
        ResourceType.COMPANIES,
        translated
      );
      console.log('Search succeeded:', results.length, 'results');
    } catch (error) {
      console.error('Search failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  } catch (error) {
    console.error('Test error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test with proper error handling
testCompleteFlow().catch((error) => {
  console.error('Fatal error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
