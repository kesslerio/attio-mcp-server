// Developer aid script to quickly exercise create-record in E2E helpers
// Usage: node scripts/debug_create_record-test.js
import { callUniversalTool } from '../test/e2e/utils/enhanced-tool-caller.js';
import { testDataGenerator } from '../test/e2e/fixtures/index.js';

async function debugCreateRecord() {
  const companyData = testDataGenerator.companies.basicCompany();
  console.log('Creating company with data:', JSON.stringify(companyData, null, 2));

  const response = await callUniversalTool('create-record', {
    resource_type: 'companies',
    record_data: companyData,
  });

  console.log('Response structure:', JSON.stringify(response, null, 2));
}

debugCreateRecord().catch((e) => {
  console.error(e);
  process.exit(1);
});

