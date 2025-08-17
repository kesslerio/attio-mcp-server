// Debug script to test tool lookup
import { findToolConfig } from './dist/handlers/tools/registry.js';

const testToolName = 'get-record-list-memberships';
console.log('Testing tool lookup for:', testToolName);

try {
  const result = findToolConfig(testToolName);
  if (result) {
    console.log('Found tool config:');
    console.log('- Resource Type:', result.resourceType);
    console.log('- Tool Type:', result.toolType);
    console.log('- Tool Name:', result.toolConfig.name);
  } else {
    console.log('Tool config not found');
  }
} catch (err) {
  console.error('Error:', err.message);
}