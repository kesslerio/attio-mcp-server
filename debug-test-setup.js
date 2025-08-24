#!/usr/bin/env node

/**
 * Debug script to trace the path from dispatcher to test assertion
 * Specifically investigating the isError flag discrepancy
 */

import { executeToolRequest } from './dist/handlers/tools/dispatcher.js';
import { CompanyFactory } from './dist/test/e2e/fixtures/index.js';

console.log('🔍 DEBUG: Testing dispatcher response vs enhanced-tool-caller processing');
console.log('');

// Test parameters matching the failing test
const companyData = CompanyFactory.create();
console.log('📝 Company data created:', JSON.stringify(companyData, null, 2));
console.log('');

// Step 1: Call dispatcher directly
console.log('🎯 Step 1: Direct dispatcher call');
const request = {
  method: 'tools/call',
  params: {
    name: 'create-record',
    arguments: {
      resource_type: 'companies',
      record_data: companyData
    },
  },
};

try {
  const dispatcherResponse = await executeToolRequest(request);
  
  console.log('📊 Raw dispatcher response structure:');
  console.log('- Type:', typeof dispatcherResponse);
  console.log('- Keys:', Object.keys(dispatcherResponse || {}));
  console.log('- isError:', dispatcherResponse?.isError);
  console.log('- error:', dispatcherResponse?.error);
  console.log('- content type:', typeof dispatcherResponse?.content);
  console.log('- content length:', Array.isArray(dispatcherResponse?.content) ? dispatcherResponse.content.length : 'N/A');
  
  if (Array.isArray(dispatcherResponse?.content) && dispatcherResponse.content[0]) {
    console.log('- content[0] type:', dispatcherResponse.content[0].type);
    console.log('- content[0] has text:', !!dispatcherResponse.content[0].text);
    
    // If there's text content, check for error indicators
    if (dispatcherResponse.content[0].text) {
      const text = dispatcherResponse.content[0].text;
      console.log('- text length:', text.length);
      console.log('- text starts with:', text.substring(0, 100));
      
      // Check for error keywords that might trigger false positives
      const errorKeywords = ['error', 'Error', 'ERROR', 'failed', 'Failed', 'FAILED'];
      const foundKeywords = errorKeywords.filter(keyword => text.includes(keyword));
      if (foundKeywords.length > 0) {
        console.log('⚠️ Found error keywords in text:', foundKeywords);
      }
    }
  }
  
  console.log('');
  console.log('📋 Full dispatcher response:');
  console.log(JSON.stringify(dispatcherResponse, null, 2));
  
} catch (error) {
  console.error('❌ Dispatcher call failed:', error.message);
  console.error('Stack:', error.stack);
}

console.log('');
console.log('🎯 Step 2: Testing enhanced-tool-caller error detection logic');

// Simulate the error detection logic from enhanced-tool-caller.ts
function testErrorDetection(finalResponse) {
  let isErrorResponse = false;
  let errorInfo = undefined;

  console.log('🔍 Testing error detection conditions:');
  
  // Condition 1: finalResponse?.isError === true
  console.log('- Condition 1 (isError === true):', finalResponse?.isError === true);
  if (finalResponse?.isError === true) {
    isErrorResponse = true;
  }
  
  // Condition 2: finalResponse?.error exists
  console.log('- Condition 2 (error exists):', !!finalResponse?.error);
  if (finalResponse?.error) {
    isErrorResponse = true;
  }
  
  // Condition 3: content[0]?.type === 'error'
  const hasErrorType = Array.isArray(finalResponse?.content) && finalResponse.content[0]?.type === 'error';
  console.log('- Condition 3 (content type error):', hasErrorType);
  if (hasErrorType) {
    isErrorResponse = true;
  }
  
  console.log('- Final isErrorResponse:', isErrorResponse);
  
  return { isErrorResponse, errorInfo };
}

// Re-run the dispatcher call and test error detection
try {
  const finalResponse = await executeToolRequest(request);
  const { isErrorResponse } = testErrorDetection(finalResponse);
  
  console.log('');
  console.log('🔬 ANALYSIS RESULTS:');
  console.log('- Dispatcher isError:', finalResponse?.isError);
  console.log('- Enhanced tool caller would detect error:', isErrorResponse);
  console.log('- Discrepancy exists:', (finalResponse?.isError !== isErrorResponse));
  
} catch (error) {
  console.error('❌ Second dispatcher call failed:', error.message);
}