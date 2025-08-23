// Test import from compiled dist to debug the issue
import * from '../../dist/objects/companies/index.js';

console.log('advancedSearchCompanies:', typeof advancedSearchCompanies);
console.log('Function exists:', advancedSearchCompanies !== undefined);

if (typeof advancedSearchCompanies === 'function') {
  console.log('✅ Function is available');
} else {
  console.log('❌ Function is not available');
  console.log('Actual value:', advancedSearchCompanies);
}