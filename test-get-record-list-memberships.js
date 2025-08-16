// Test script to invoke get-record-list-memberships tool
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';

const testRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "get-record-list-memberships",
    arguments: {
      recordId: "test-record-id"
    }
  }
};

console.log('Testing get-record-list-memberships tool...');
console.log('Request:', JSON.stringify(testRequest, null, 2));

const child = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

child.on('close', (code) => {
  console.log('\n--- STDOUT ---');
  console.log(output);
  
  if (errorOutput) {
    console.log('\n--- STDERR ---');
    console.log(errorOutput);
  }
  
  console.log('\n--- EXIT CODE ---');
  console.log(code);
});

// Send the request
child.stdin.write(JSON.stringify(testRequest) + '\n');
child.stdin.end();

// Timeout after 5 seconds
setTimeout(() => {
  child.kill();
  console.log('\nTest timed out after 5 seconds');
}, 5000);