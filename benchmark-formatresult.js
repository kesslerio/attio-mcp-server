#!/usr/bin/env node

/**
 * Performance benchmark for formatResult pattern changes
 * Measures impact of string templates vs JSON.stringify approach
 */

const NUM_ITERATIONS = 10000;

// Sample data representing typical formatResult input
const sampleData = {
  id: { record_id: 'rec_123456789' },
  values: {
    name: [{ value: 'Acme Corporation' }],
    website: [{ value: 'https://acme.com' }],
    industry: [{ value: 'Technology' }],
    employee_count: [{ value: 500 }],
    revenue: [{ value: 10000000 }]
  },
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-08-12T15:45:00Z'
};

// Old approach: JSON.stringify based
function formatResultOld(result) {
  return JSON.stringify({
    id: result.id?.record_id || 'Unknown',
    name: result.values?.name?.[0]?.value || 'Unknown',
    website: result.values?.website?.[0]?.value || 'Not provided',
    details: result
  }, null, 2);
}

// New approach: String template based
function formatResultNew(result) {
  const id = result.id?.record_id || 'Unknown';
  const name = result.values?.name?.[0]?.value || 'Unknown';
  const website = result.values?.website?.[0]?.value || 'Not provided';
  
  return `Company: ${name} (ID: ${id})
Website: ${website}
Created: ${result.created_at || 'Unknown'}
Updated: ${result.updated_at || 'Unknown'}`;
}

// Benchmark function
function benchmark(name, fn, iterations = NUM_ITERATIONS) {
  const startMemory = process.memoryUsage();
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn(sampleData);
  }
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage();
  
  const duration = endTime - startTime;
  const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
  
  return {
    name,
    duration: Math.round(duration * 100) / 100,
    avgPerOperation: Math.round((duration / iterations) * 10000) / 10000,
    memoryDelta: Math.round(memoryDelta / 1024),
    iterations
  };
}

// Run benchmarks
console.log('🚀 formatResult Performance Benchmark');
console.log('=======================================');
console.log(`Testing ${NUM_ITERATIONS} iterations...\n`);

const oldResult = benchmark('JSON.stringify (Old)', formatResultOld);
const newResult = benchmark('String Template (New)', formatResultNew);

// Calculate improvements
const speedImprovement = ((oldResult.duration - newResult.duration) / oldResult.duration * 100);
const memoryImprovement = oldResult.memoryDelta - newResult.memoryDelta;

console.log('📊 Results:');
console.log('----------');
console.log(`Old Approach: ${oldResult.duration}ms total (${oldResult.avgPerOperation}ms/op)`);
console.log(`New Approach: ${newResult.duration}ms total (${newResult.avgPerOperation}ms/op)`);
console.log('');
console.log('💾 Memory Usage:');
console.log(`Old Approach: ${oldResult.memoryDelta}KB delta`);
console.log(`New Approach: ${newResult.memoryDelta}KB delta`);
console.log('');
console.log('📈 Performance Impact:');

if (speedImprovement > 0) {
  console.log(`✅ Speed: ${speedImprovement.toFixed(1)}% faster`);
} else {
  console.log(`⚠️  Speed: ${Math.abs(speedImprovement).toFixed(1)}% slower`);
}

if (memoryImprovement > 0) {
  console.log(`✅ Memory: ${memoryImprovement}KB less used`);
} else if (memoryImprovement < 0) {
  console.log(`⚠️  Memory: ${Math.abs(memoryImprovement)}KB more used`);
} else {
  console.log(`➡️  Memory: No significant change`);
}

console.log('');
console.log('🏁 Conclusion:');
if (speedImprovement > 5 && memoryImprovement >= 0) {
  console.log('✅ Significant performance improvement detected');
} else if (speedImprovement > 0 && memoryImprovement >= 0) {
  console.log('✅ Modest performance improvement detected');
} else if (speedImprovement > -5 && memoryImprovement >= -50) {
  console.log('➡️  No significant performance regression');
} else {
  console.log('⚠️  Performance regression detected - review required');
}

// Sample outputs for verification
console.log('\n📋 Sample Outputs:');
console.log('==================');
console.log('\nOld Format:');
console.log(formatResultOld(sampleData));
console.log('\nNew Format:');
console.log(formatResultNew(sampleData));