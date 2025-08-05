#!/usr/bin/env node
'use strict';

const fs = require('fs');

const filePath = './test/integration/real-api-integration.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove all .skipIf(SKIP_INTEGRATION_TESTS) patterns
content = content.replace(/it\.skipIf\(SKIP_INTEGRATION_TESTS\)/g, 'it');

// Fix type issues
content = content.replace(
  /expect\(company\.values\.name\[0\]\.value\)/g,
  'expect(company.values.name?.[0]?.value)'
);
content = content.replace(
  /expect\(details\.values\.name\[0\]\.value\)/g,
  'expect(details.values.name?.[0]?.value)'
);
content = content.replace(
  /expect\(updated\.values\.industry\[0\]\.value\)/g,
  'expect(updated.values.industry?.[0]?.value)'
);
content = content.replace(
  /expect\(updated\.values\.description\[0\]\.value\)/g,
  'expect(updated.values.description?.[0]?.value)'
);

// Fix person email type
content = content.replace(
  /\.some\(e => e\.email_address/g,
  '.some((e: any) => e.email_address'
);

// Fix company_id
content = content.replace(
  'company: createdCompanyId',
  'company_id: createdCompanyId'
);

// Remove the SKIP_INTEGRATION_TESTS setup from beforeAll
content = content.replace(
  `beforeAll(() => {
    if (SKIP_INTEGRATION_TESTS) {
      console.log('Skipping integration tests - no API key found');
      return;
    }
    
    // Initialize the API client with real credentials
    const apiKey = process.env.ATTIO_API_KEY!;
    initializeAttioClient(apiKey);
  });`,
  `beforeAll(() => {    
    // Initialize the API client with real credentials
    const apiKey = process.env.ATTIO_API_KEY!;
    initializeAttioClient(apiKey);
  });`
);

// Remove the check from afterAll
content = content.replace('if (SKIP_INTEGRATION_TESTS) return;', '');

fs.writeFileSync(filePath, content);
console.log('Fixed real API tests');
