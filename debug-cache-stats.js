import { CachingService } from './dist/services/CachingService.js';

console.log('Testing CachingService.getCacheStats() structure...');

// Clear cache to start fresh
CachingService.clearTasksCache();

// Get initial stats
let stats = CachingService.getCacheStats();
console.log('Initial stats structure:', JSON.stringify(stats, null, 2));

// Add some tasks to cache
CachingService.setCachedTasks('test1', [{ id: { record_id: '1' }, values: {} }]);
CachingService.setCachedTasks('test2', [{ id: { record_id: '2' }, values: {} }]);

// Get updated stats
stats = CachingService.getCacheStats();
console.log('Stats after adding tasks:', JSON.stringify(stats, null, 2));

// Check what properties exist
console.log('Available properties:');
console.log('- tasks:', stats.tasks);
console.log('- tasksCacheSize (expected by test):', stats.tasksCacheSize);
console.log('- tasksCacheEntries (expected by test):', stats.tasksCacheEntries);
console.log('- totalEntries:', stats.totalEntries);

CachingService.clearTasksCache();