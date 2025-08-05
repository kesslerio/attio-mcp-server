/**
 * Debug script for tracing B2B segment attribute mapping issue
 */

import type { ListEntryFilters } from '../api/operations/index.js';
import { advancedSearchCompanies } from '../objects/companies/index.js';
import { FilterConditionType, ResourceType } from '../types/attio.js';
import { translateAttributeNamesInFilters } from './attribute-mapping/index.js';

// Add temporary console logging to trace the flow
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Enable logging temporarily
console.log = (...args: any[]) => {
  if (
    args[0]?.includes?.('b2b_segment') ||
    args[0]?.includes?.('type_persona') ||
    args[0]?.includes?.('[translateAttributeNamesInFilters]') ||
    args[0]?.includes?.('[transformFiltersToApiFormat]') ||
    args[0]?.includes?.('[advancedSearchObject]')
  ) {
    originalConsoleLog(`[DEBUG] ${new Date().toISOString()}:`, ...args);
  }
};

console.error = (...args: any[]) => {
  if (
    args[0]?.includes?.('b2b_segment') ||
    args[0]?.includes?.('type_persona') ||
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

    console.log('[TEST] Original filters:', JSON.stringify(filters, null, 2));

    // Test translation directly
    const translatedFilters = translateAttributeNamesInFilters(
      filters,
      ResourceType.COMPANIES
    );
    console.log(
      '[TEST] Translated filters:',
      JSON.stringify(translatedFilters, null, 2)
    );

    // Test the search
    console.log('[TEST] Calling advancedSearchCompanies...');
    try {
      const results = await advancedSearchCompanies(translatedFilters);
      console.log('[TEST] Search succeeded! Results:', results.length);
    } catch (error: any) {
      console.error('[TEST] Search failed:', error.message);
      console.error('[TEST] Full error:', error);
    }
  } catch (error: any) {
    console.error('[TEST] Debug script error:', error);
  } finally {
    // Restore original console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
}

// Run the debug script
debugB2BSegmentMapping();
