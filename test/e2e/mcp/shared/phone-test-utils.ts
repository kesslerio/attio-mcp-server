/**
 * Shared utilities for phone validation E2E tests
 * Reduces duplication between phone-normalization.mcp.test.ts and remote-phone-validation.mcp.test.ts
 */

import type { TestResult } from './quality-gates.js';

/**
 * Phone number test case definition
 */
export interface PhoneTestCase {
  country: string;
  format: string;
  description?: string;
}

/**
 * Standard phone test cases for E.164 normalization
 */
export const E164_TEST_CASES: PhoneTestCase[] = [
  {
    country: 'US',
    format: '+1 202 555 0134',
    description: 'US format with spaces',
  },
  { country: 'UK', format: '+44 20 7946 0958', description: 'UK format' },
  { country: 'JP', format: '+81 3 1234 5678', description: 'Japan format' },
  { country: 'AU', format: '+61 2 9374 4000', description: 'Australia format' },
];

/**
 * Create person data for phone testing
 */
export function createPhoneTestPerson(
  suffix: string | number,
  phoneData: Record<string, unknown> | Record<string, unknown>[]
): {
  name: string;
  email_addresses: string[];
  phone_numbers: Record<string, unknown>[];
} {
  const timestamp = typeof suffix === 'number' ? suffix : Date.now();
  const phones = Array.isArray(phoneData) ? phoneData : [phoneData];

  return {
    name: `Phone Test Person ${suffix}`,
    email_addresses: [`phone.test.${timestamp}@example.com`],
    phone_numbers: phones,
  };
}

/**
 * Create person data with metadata fields
 */
export function createPhoneTestPersonWithMetadata(
  suffix: string | number,
  phone: string,
  metadata: {
    label?: string;
    type?: string;
    extension?: string;
    is_primary?: boolean;
  }
): ReturnType<typeof createPhoneTestPerson> {
  return createPhoneTestPerson(suffix, {
    phone_number: phone,
    ...metadata,
  });
}

/**
 * Test result tracking helper
 */
export function createResultTracker(): {
  results: TestResult[];
  track: (testName: string, passed: boolean, error?: string) => void;
  getSummary: () => { passed: number; total: number };
} {
  const results: TestResult[] = [];

  return {
    results,
    track: (testName: string, passed: boolean, error?: string) => {
      results.push({ testName, passed, error });
    },
    getSummary: () => ({
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    }),
  };
}

/**
 * Check if an error message contains phone format guidance
 */
export function hasPhoneFormatGuidance(errorMsg: string): boolean {
  const lowerMsg = errorMsg.toLowerCase();
  return (
    lowerMsg.includes('phone') ||
    lowerMsg.includes('format') ||
    lowerMsg.includes('e.164') ||
    lowerMsg.includes('valid')
  );
}
