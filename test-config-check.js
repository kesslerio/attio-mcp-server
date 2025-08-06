import dotenv from 'dotenv';

// Load main env
dotenv.config();

// Load test env
dotenv.config({ path: '.env.test' });

console.log('Configuration Check:');
console.log('===================');
console.log(
  'ATTIO_API_KEY:',
  process.env.ATTIO_API_KEY ? '✓ Set' : '✗ Missing'
);
console.log('TEST_COMPANY_ID:', process.env.TEST_COMPANY_ID || 'Not set');
console.log('TEST_PERSON_ID:', process.env.TEST_PERSON_ID || 'Not set');
console.log('TEST_LIST_ID:', process.env.TEST_LIST_ID || 'Not set');
console.log('TEST_DEAL_ID:', process.env.TEST_DEAL_ID || 'Not set');
console.log('\nTest Behavior:');
console.log(
  'SKIP_INCOMPLETE_TESTS:',
  process.env.SKIP_INCOMPLETE_TESTS || 'Not set'
);
console.log('CLEANUP_TEST_DATA:', process.env.CLEANUP_TEST_DATA || 'Not set');
console.log('TEST_DATA_PREFIX:', process.env.TEST_DATA_PREFIX || 'Not set');
