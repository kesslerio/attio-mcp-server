/**
 * Debug script for tracing B2B segment attribute mapping issue
 */
import { advancedSearchCompanies } from '../objects/companies/index.js';
import { FilterConditionType } from '../types/attio.js';
import { ListEntryFilters } from '../api/operations/index.js';
import { ResourceType } from '../types/attio.js';
import { translateAttributeNamesInFilters } from './attribute-mapping/index.js';

// Add temporary console logging to trace the flow

// Enable logging temporarily
console.error = (...args: unknown[]) => {
  if (
    typeof firstArg === 'string' &&
    (firstArg.includes('b2b_segment') ||
      firstArg.includes('type_persona') ||
      firstArg.includes('[translateAttributeNamesInFilters]') ||
      firstArg.includes('[transformFiltersToApiFormat]') ||
      firstArg.includes('[advancedSearchObject]'))
  ) {
    originalConsoleLog(`[DEBUG] ${new Date().toISOString()}:`, ...args);
  }
};

console.error = (...args: unknown[]) => {
  if (
    (typeof firstArg === 'string' &&
      (firstArg.includes('b2b_segment') ||
        firstArg.includes('type_persona'))) ||
    JSON.stringify(args).includes('b2b_segment') ||
    JSON.stringify(args).includes('type_persona')
  ) {
    originalConsoleError(`[DEBUG ERROR] ${new Date().toISOString()}:`, ...args);
  }
};

async function debugB2BSegmentMapping() {
  try {
    // Test the same filter that's failing
    const filters: ListEntryFilters = {
      filters: [
        {
          attribute: { slug: 'b2b_segment' },
          condition: FilterConditionType.CONTAINS,
          value: 'Plastic Surgeon',
        },
      ],
    };

    console.error('[TEST] Original filters:', JSON.stringify(filters, null, 2));

    // Test translation directly
      filters,
      ResourceType.COMPANIES
    );
    console.error(
      '[TEST] Translated filters:',
      JSON.stringify(translatedFilters, null, 2)
    );

    // Test the search
    console.error('[TEST] Calling advancedSearchCompanies...');
    try {
      console.error('[TEST] Search succeeded! Results:', results.length);
    } catch (error: unknown) {
      console.error('[TEST] Search failed:', (error as any).message);
      console.error('[TEST] Full error:', error);
    }
  } catch (error: unknown) {
    console.error('[TEST] Debug script error:', error);
  } finally {
    // Restore original console
    console.error = originalConsoleError;
    console.error = originalConsoleError;
  }
}

// Run the debug script
debugB2BSegmentMapping();
