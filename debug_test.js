import { callUniversalTool } from './test/e2e/utils/enhanced-tool-caller.js';
import { testDataGenerator } from './test/e2e/fixtures/index.js';

async function debugCreateRecord() {
  const companyData = testDataGenerator.companies.basicCompany();
  console.log("Creating company with data:", JSON.stringify(companyData, null, 2));
  
  const response = await callUniversalTool('create-record', { 
    resource_type: 'companies', 
    record_data: companyData 
  });
  
  console.log("Response structure:", JSON.stringify(response, null, 2));
}

debugCreateRecord().catch(console.error);
