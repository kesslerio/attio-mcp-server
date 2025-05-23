const { getCompanyDetails } = require('../dist/objects/companies');
const { initializeAttioClient } = require('../dist/api/attio-client');

async function checkServicesFormat() {
  try {
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY environment variable is required');
    }
    initializeAttioClient(apiKey);

    const companyId = '49b11210-df4c-5246-9eda-2add14964eb4';
    const company = await getCompanyDetails(companyId);

    console.log('Full services structure:');
    console.log(JSON.stringify(company.values?.services, null, 2));

    // Let's also check another field to understand the pattern
    console.log('\nType persona structure:');
    console.log(JSON.stringify(company.values?.type_persona, null, 2));

    console.log('\nCategories structure:');
    console.log(JSON.stringify(company.values?.categories, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkServicesFormat();
