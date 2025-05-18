/**
 * Test various attribute mapping variations
 */

async function testMappingVariations() {
  const { getAttributeSlug } = await import('./dist/utils/attribute-mapping/index.js');
  const { translateAttributeNamesInFilters } = await import('./dist/utils/attribute-mapping/index.js');
  const { ResourceType } = await import('./dist/types/attio.js');
  
  // Test variations of B2B segment
  const variations = [
    "b2b_segment",
    "B2B_Segment", 
    "B2B Segment",
    "b2b segment",
    "type_persona",
    "Type Persona"
  ];
  
  console.log('=== Direct Attribute Mapping Tests ===');
  variations.forEach(v => {
    const result = getAttributeSlug(v);
    console.log(`"${v}" -> "${result}"`);
  });
  
  // Test filter translations
  console.log('\n=== Filter Translation Tests ===');
  const testFilters = variations.map(v => ({
    filters: [{
      attribute: { slug: v },
      condition: "contains",
      value: "test"
    }]
  }));
  
  testFilters.forEach((filter, i) => {
    console.log(`\nInput: ${variations[i]}`);
    console.log('Original:', JSON.stringify(filter, null, 2));
    try {
      const translated = translateAttributeNamesInFilters(filter, ResourceType.COMPANIES);
      console.log('Translated:', JSON.stringify(translated, null, 2));
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
  
  // Test exact casing from error
  console.log('\n=== Exact Error Case Test ===');
  const errorFilter = {
    filters: [{
      attribute: { slug: "b2b_segment" },
      condition: "contains",
      value: "Plastic Surgeon"
    }]
  };
  
  console.log('Testing exact error case:', JSON.stringify(errorFilter, null, 2));
  const translated = translateAttributeNamesInFilters(errorFilter, ResourceType.COMPANIES);
  console.log('Result:', JSON.stringify(translated, null, 2));
}

testMappingVariations().catch(console.error);