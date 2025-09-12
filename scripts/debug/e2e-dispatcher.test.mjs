// node scripts/debug/e2e-dispatcher.test.mjs
import { executeToolRequest } from '../../dist/handlers/tools/dispatcher/core.js';

const request = {
  // MCP "tools/call" shape (minimal)
  method: 'tools/call',
  params: {
    name: 'update-record',
    arguments: {
      record_id: '8e0788ab-ed95-44c1-9542-10e89eb4988e',
      resource_type: 'companies',
      // Intentionally invalid to exercise the enhanced error path:
      record_data: { trade_show_event_name: 'Med Spa Show 2025' },
    },
  },
};

// Optional: helps the dispatcher return raw JSON for record ops in tests
process.env.E2E_MODE = 'true';

try {
  const res = await executeToolRequest(request);
  if (res?.isError && /Invalid option/.test(res.error?.message || '')) {
    console.log('✅ E2E pass (dispatcher → MCP):', res.error.message);
    process.exit(0);
  } else if (res?.isError) {
    console.error('❌ E2E got error, but not enhanced:', res.error);
    process.exit(1);
  } else {
    console.log('ℹ️ E2E success (no error):', res);
    process.exit(0);
  }
} catch (e) {
  console.error('❌ E2E threw unexpectedly:', e);
  process.exit(1);
}
