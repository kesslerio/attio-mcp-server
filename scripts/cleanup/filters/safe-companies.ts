/**
 * Safe companies that should NEVER be deleted
 * These are real businesses that may have been created via API but are legitimate data
 */

export const SAFE_COMPANY_NAMES = [
  'BASS Medical Group',
  'Bee Well Clinic & Med Spa',
  'Blooming Wellness & Weightloss',
  'Dr Lewis Plastic Surgery',
  'Elite Styles & Beauty',
  'Flawless Aesthetic Group',
  'IC Medical SPA',
  'Illuminate Mee Aesthetics Center',
  'The Plastics Doc',
  'Ultra Body Contour',
  'Tbeau Laser & Skin Rejuvenation Centre',
  'Viva Boutique Wellness & Beauty',
  'Weight+Liberation',
  'Kaizen Innovations',
  'LA Ortho & Wellness',
  'Lenox Hill Plastic Surgery Center',
  'Michel Campos Personal Training',
  'MODE Gym'
];

/**
 * Patterns that indicate TEST data (safe to delete)
 */
export const TEST_PATTERNS = [
  /^Test Company/i,
  /^Perf Test/i,
  /^Perf Compare/i,
  /^Demo CS Co/i,
  /^DEBUG_Test/i,
  /^QA Test/i,
  /^QA Batch/i,
  /^Batch Test/i,
  /^Batch Company/i,
  /TEST_company_\d+/i,
  /E2E_TEST_company/i,
  /^ConcurrentSearch_/i,
  /^Debug Test/i,
  /^Generic Record Test/i,
  /^Incremental Test/i,
  /^Industry Update Test/i,
  /^Linked Company \d+/i,
  /^Test Custom Company/i,
  /^Updated Name \d+$/i,
  /^C\d+$/i,  // C1, C2, etc.
  /^Unknown$/i,
  /\{"malformed":/i,
  // Additional patterns for edge cases
  /.*Fallback Test.*\d{13}/i,  // "Single-Industry Fallback Test 1757182615335"
  /.*Test.*\d{13}/i,           // Any "Test" with 13-digit timestamp
  /.*Test \d{13}$/i,           // "Test" followed by timestamp at end
  /Perf.*Company.*\d+/i,       // Performance test companies with numbers
  /^Test \w+\s+\d{13}/i,       // "Test [word] [timestamp]"
  /^Single-Industry/i,         // Single-Industry tests
  /^Minimal Schema Test/i,     // Schema tests
  /^Updated Minimal/i          // Updated test entries
];

/**
 * Check if a company name is safe (real business)
 */
export function isSafeCompany(name: string): boolean {
  if (!name) return false;
  return SAFE_COMPANY_NAMES.includes(name);
}

/**
 * Check if a company name matches test patterns
 */
export function isTestCompany(name: string): boolean {
  if (!name) return false;
  return TEST_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Filter companies to only include test data (excluding safe companies)
 */
export function filterTestCompanies(companies: any[]): { safe: any[], toDelete: any[] } {
  const safe: any[] = [];
  const toDelete: any[] = [];

  for (const company of companies) {
    const name = company.values?.name?.[0]?.value || company.name || 'Unknown';
    
    if (isSafeCompany(name)) {
      safe.push(company);
    } else if (isTestCompany(name)) {
      toDelete.push(company);
    } else {
      // If it doesn't match test patterns and isn't in safe list,
      // err on the side of caution and mark as safe
      safe.push(company);
    }
  }

  return { safe, toDelete };
}