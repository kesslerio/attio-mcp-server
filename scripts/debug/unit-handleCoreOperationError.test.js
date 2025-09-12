// ESM test: node scripts/debug/unit-handleCoreOperationError.test.mjs
const mod = await import('../../dist/utils/axios-error-mapper.js');
const handleCoreOperationError =
  mod.handleCoreOperationError ??
  mod.default?.handleCoreOperationError ??
  mod.default;

// Mock an Attio 400 invalid select option error
const axiosErr = {
  response: {
    status: 400,
    data: {
      code: 'value_not_found',
      message: 'Cannot find select option with title "Med Spa Show 2025".',
    },
  },
};

try {
  await handleCoreOperationError(axiosErr, 'update', 'companies', {
    trade_show_event_name: 'Med Spa Show 2025',
  });
  console.error('❌ Expected a thrown structured error');
  process.exit(1);
} catch (e) {
  if (
    e &&
    typeof e.status === 'number' &&
    e.body?.message?.includes('Invalid option')
  ) {
    console.log('✅ Unit pass:', e.body.message);
    process.exit(0);
  } else {
    console.error('❌ Unit fail:', e);
    process.exit(1);
  }
}
