// Debug script to test companies module import
console.log('Starting companies module import test...');

try {
  // Import from compiled dist
  const companiesModule = await import('./dist/objects/companies/index.js');
  console.log('✅ Companies module imported successfully');
  console.log('Available exports:', Object.keys(companiesModule));
  console.log(
    'advancedSearchCompanies type:',
    typeof companiesModule.advancedSearchCompanies
  );

  if (companiesModule.advancedSearchCompanies) {
    console.log('✅ advancedSearchCompanies is available');
  } else {
    console.log('❌ advancedSearchCompanies is not available');
  }
} catch (error) {
  console.error('❌ Error importing companies module:', error);
}

// Also test the search module directly
try {
  const searchModule = await import('./dist/objects/companies/search.js');
  console.log('✅ Search module imported successfully');
  console.log('Search module exports:', Object.keys(searchModule));
  console.log(
    'advancedSearchCompanies type in search module:',
    typeof searchModule.advancedSearchCompanies
  );
} catch (error) {
  console.error('❌ Error importing search module:', error);
}
