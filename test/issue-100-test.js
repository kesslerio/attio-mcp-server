/**
 * Test to reproduce Issue #100 - Company creation fails with undefined ResourceType
 */
import dotenv from 'dotenv';
import { createCompany } from '../dist/objects/companies.js';
import { ResourceType } from '../dist/types/attio.js';
import { initializeAttioClient } from '../dist/api/attio-client.js';

dotenv.config();

// Initialize the API client
if (!process.env.ATTIO_API_KEY) {
  console.error('ATTIO_API_KEY environment variable is not set');
  process.exit(1);
}

initializeAttioClient({
  apiKey: process.env.ATTIO_API_KEY,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    maxRetryDelay: 10000,
    retryCondition: (error) => {
      return error.response?.status >= 500 || error.response?.status === 429;
    }
  }
});

async function testCompanyCreation() {
  console.log('Testing company creation - Issue #100');
  console.log('ResourceType.COMPANIES:', ResourceType.COMPANIES);
  console.log('Type of ResourceType.COMPANIES:', typeof ResourceType.COMPANIES);
  
  try {
    const result = await createCompany({
      name: 'Test Company Issue 100'
    });
    console.log('Company created successfully:', result);
  } catch (error) {
    console.error('Error creating company:', error.message);
    
    // Check if the error is related to URL construction
    if (error.response?.config?.url) {
      console.error('API URL:', error.response.config.url);
      if (error.response.config.url.includes('undefined')) {
        console.error('⚠️  BUG CONFIRMED: URL contains "undefined"');
      }
    }
    
    // Check the full error details
    if (error.response?.data) {
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Log the config if available
    if (error.config) {
      console.error('Request config URL:', error.config.url);
      console.error('Request config data:', error.config.data);
    }
  }
}

// Check ResourceType enum
console.log('ResourceType enum:', ResourceType);
console.log('ResourceType values:');
for (const [key, value] of Object.entries(ResourceType)) {
  console.log(`  ${key}: "${value}"`);
}

testCompanyCreation().catch(console.error);