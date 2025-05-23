/**
 * Minimal test to trace where the untranslated filter is coming from
 */

// Override console to capture all logs
const logs = [];
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  logs.push({ type: 'log', args });
  originalLog.apply(console, args);
};

console.error = (...args) => {
  logs.push({ type: 'error', args });
  originalError.apply(console, args);
};

async function traceHandlerFlow() {
  const { handleToolCall } = await import('./dist/handlers/tools.js');

  // Create a mock request similar to what Claude Code would send
  const request = {
    params: {
      name: 'advanced-search-companies',
      arguments: {
        filters: {
          filters: [
            {
              attribute: { slug: 'b2b_segment' },
              condition: 'contains',
              value: 'Plastic Surgeon',
            },
          ],
        },
      },
    },
  };

  console.log('\n=== Mock Request ===');
  console.log(JSON.stringify(request, null, 2));

  try {
    // Call the handler
    const result = await handleToolCall(request);
    console.log('\n=== Handler Result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n=== Handler Error ===');
    console.error(error.message);
  }

  // Analyze logs for b2b_segment references
  console.log('\n=== Log Analysis ===');
  const b2bLogs = logs.filter(
    (log) =>
      JSON.stringify(log.args).includes('b2b_segment') ||
      JSON.stringify(log.args).includes('type_persona')
  );

  console.log('Found', b2bLogs.length, 'relevant log entries:');
  b2bLogs.forEach((log, i) => {
    console.log(`\n--- Log ${i + 1} (${log.type}) ---`);
    console.log(...log.args);
  });
}

// Run with minimal error handling
traceHandlerFlow().catch((e) => console.error('Fatal error:', e));
