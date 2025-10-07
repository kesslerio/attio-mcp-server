#!/usr/bin/env node
/**
 * Test Attio API operator support ($equals, $in, $contains)
 * Part of Issue #885 investigation (Step 1)
 */

import 'dotenv/config';

const API_KEY = process.env.ATTIO_API_KEY;
const BASE_URL = 'https://api.attio.com/v2';

if (!API_KEY) {
  console.error('❌ ATTIO_API_KEY not found in environment');
  process.exit(1);
}

console.log(`✓ API Key loaded (${API_KEY.length} characters)`);
console.log('Testing Attio API operators...\n');

async function testOperator(name, endpoint, payload) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      const resultCount = data?.data?.length ?? 0;
      console.log(
        `✅ ${name}: WORKS (${response.status}, ${resultCount} results)`
      );
      return true;
    } else {
      console.log(`❌ ${name}: FAILED (${response.status})`);
      console.log(
        `   Error: ${data?.code ?? 'unknown'} - ${data?.message ?? 'no message'}`
      );
      if (data?.detail) {
        console.log(
          `   Detail: ${JSON.stringify(data.detail).substring(0, 100)}`
        );
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: EXCEPTION`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function main() {
  const tests = [
    {
      name: '$eq on domains (companies)',
      endpoint: '/objects/companies/records/query',
      payload: {
        filter: { domains: { $eq: 'google.com' } },
        limit: 1,
      },
    },
    {
      name: '$contains on domains (companies)',
      endpoint: '/objects/companies/records/query',
      payload: {
        filter: { domains: { $contains: 'google' } },
        limit: 1,
      },
    },
    {
      name: '$starts_with on domains (companies)',
      endpoint: '/objects/companies/records/query',
      payload: {
        filter: { domains: { $starts_with: 'google' } },
        limit: 1,
      },
    },
    {
      name: '$eq on email_addresses (people)',
      endpoint: '/objects/people/records/query',
      payload: {
        filter: { email_addresses: { $eq: 'test@example.com' } },
        limit: 1,
      },
    },
    {
      name: '$contains on email_addresses (people)',
      endpoint: '/objects/people/records/query',
      payload: {
        filter: { email_addresses: { $contains: '@example.com' } },
        limit: 1,
      },
    },
    {
      name: '$not_empty on domains (companies)',
      endpoint: '/objects/companies/records/query',
      payload: {
        filter: { domains: { $not_empty: true } },
        limit: 1,
      },
    },
  ];

  console.log('─'.repeat(60));
  for (const test of tests) {
    await testOperator(test.name, test.endpoint, test.payload);
  }
  console.log('─'.repeat(60));

  console.log('\n📝 Summary:');
  console.log('   ✅ Use $eq (not $equals) for exact matches');
  console.log('   ✅ Fast path enabled for domain/email/phone queries');
  console.log(
    '   ✅ Fallback to $contains + client-side scoring for fuzzy searches'
  );
  console.log('\n📖 Findings documented in src/api/operations/search.ts:73-81');
}

main().catch(console.error);
