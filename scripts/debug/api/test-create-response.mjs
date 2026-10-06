import { coreOperationsToolConfigs } from '../../dist/handlers/tool-configs/universal/core/index.js';

async function test() {
  console.log('Testing records_create response structure...');

  try {
    const result = await coreOperationsToolConfigs['records_create'].handler({
      resource_type: 'companies',
      record_data: {
        name: `Test Company ${Date.now()}`,
        website: 'https://test.com',
      },
    });

    console.log('Create result:', JSON.stringify(result, null, 2));
    console.log('Has id?', !!result?.id);
    console.log('Has record_id?', !!result?.id?.record_id);
    console.log('Result keys:', Object.keys(result || {}));

    // Clean up
    if (result?.id?.record_id) {
      await coreOperationsToolConfigs['records_delete'].handler({
        resource_type: 'companies',
        record_id: result.id.record_id,
      });
      console.log('Cleaned up test record');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
