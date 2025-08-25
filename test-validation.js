#!/usr/bin/env node

// Simple test to verify validation works outside of vitest mocking
import { advancedSearchCompanies } from './dist/objects/companies/search.js';

async function testValidation() {
  console.log('Testing validation with missing attribute...');
  
  const filters = {
    filters: [
      {
        // Missing attribute
        condition: 'contains',
        value: 'test',
      },
    ],
  };
  
  try {
    const result = await advancedSearchCompanies(filters);
    console.log('ERROR: Function should have thrown, but returned:', result);
  } catch (error) {
    console.log('SUCCESS: Function threw error as expected:', error.message);
  }
}

testValidation().catch(console.error);