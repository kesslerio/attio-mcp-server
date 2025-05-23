/**
 * Minimal test to understand B2B segment transformation
 */

// Set up minimal environment
process.env.NODE_ENV = 'development';

// Import through Node require (CommonJS)
async function test() {
  const { transformFiltersToApiFormat } = await import(
    './dist/utils/filter-utils.js'
  );
  const { translateAttributeNamesInFilters } = await import(
    './dist/utils/attribute-mapping/index.js'
  );
  const { FilterConditionType, ResourceType } = await import(
    './dist/types/attio.js'
  );

  // Test case: B2B segment filter
  const originalFilter = {
    filters: [
      {
        attribute: { slug: 'b2b_segment' },
        condition: FilterConditionType.CONTAINS,
        value: 'Plastic Surgeon',
      },
    ],
  };

  console.log('\n=== Original Filter ===');
  console.log(JSON.stringify(originalFilter, null, 2));

  // Step 1: Translate attributes
  console.log('\n=== After Translation ===');
  const translatedFilter = translateAttributeNamesInFilters(
    originalFilter,
    ResourceType.COMPANIES
  );
  console.log(JSON.stringify(translatedFilter, null, 2));

  // Step 2: Transform to API format
  console.log('\n=== After API Transformation ===');
  try {
    const apiFormat = transformFiltersToApiFormat(translatedFilter);
    console.log(JSON.stringify(apiFormat, null, 2));
  } catch (error) {
    console.error('Transform error:', error.message);
  }

  // Also test with pre-translated
  console.log('\n=== Pre-translated Filter ===');
  const preTranslated = {
    filters: [
      {
        attribute: { slug: 'type_persona' },
        condition: FilterConditionType.CONTAINS,
        value: 'Plastic Surgeon',
      },
    ],
  };

  console.log(JSON.stringify(preTranslated, null, 2));

  console.log('\n=== Pre-translated API Transformation ===');
  try {
    const apiFormat2 = transformFiltersToApiFormat(preTranslated);
    console.log(JSON.stringify(apiFormat2, null, 2));
  } catch (error) {
    console.error('Transform error:', error.message);
  }
}

test().catch(console.error);
