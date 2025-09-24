// ESM test: node scripts/debug/handler-updateRecord.test.mjs
const mod = await import(
  '../../dist/handlers/tool-configs/universal/core/index.js'
);
const updateRecordConfig =
  mod.updateRecordConfig ?? mod.default?.updateRecordConfig ?? mod.default;

const payload = {
  record_id: '8e0788ab-ed95-44c1-9542-10e89eb4988e',
  record_data: { trade_show_event_name: 'Med Spa Show 2025' },
  resource_type: 'companies',
};

try {
  const result = await updateRecordConfig.handler(payload);

  if (result?.isError) {
    console.log('✅ Handler returned MCP error:');
    console.log(result.error?.message || JSON.stringify(result));
  } else {
    console.log('ℹ️ Handler succeeded:', JSON.stringify(result));
  }
} catch (e) {
  if (e && typeof e.status === 'number' && e.body?.message) {
    console.log('✅ Handler threw structured HTTP error:');
    console.log(e.body.message);
  } else {
    console.error('❌ Unexpected thrown error:', e);
    process.exit(1);
  }
}
