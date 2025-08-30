import axios from 'axios';

const token = process.env.ATTIO_API_KEY;
if (!token) {
  console.error('ATTIO_API_KEY required');
  process.exit(1);
}

const http = axios.create({
  baseURL: (process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2').replace(/\/+$/,''),
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
});

async function main() {
  console.log('🧪 Testing pure axios against Attio API...');
  
  const probe = await http.get('/objects/companies');
  console.log('✅ probe companies keys:', Object.keys(probe.data || {}));
  console.log('✅ probe response:', probe.data);

  const create = await http.post('/objects/companies/records', {
    data: { values: { name: 'E2E Smoke Co', domains: [{ domain: `e2e-smoke-${Date.now()}.example.com` }] } },
  });
  console.log('✅ create status:', create.status, 'body keys:', Object.keys(create.data || {}));
  console.log('✅ create response ID:', create.data?.data?.id?.record_id);
}

main().catch((e) => {
  console.error('❌ SMOKE ERROR', e?.response?.status, e?.response?.data || e?.message);
  process.exit(1);
});