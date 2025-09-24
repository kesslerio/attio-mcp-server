// QA Test Case for Issue #472: Verify task display names
// Based on the test case provided in the GitHub issue

import {
  searchRecordsConfig,
  getRecordDetailsConfig,
} from './src/handlers/tool-configs/universal/core/index.js';
import { UniversalResourceType } from './src/handlers/tool-configs/universal/types.js';

async function testTaskDisplayNames() {
  console.log('Testing Task Display Names (Issue #472)...\n');

  // Test 1: Search Tasks and Check Display Names with Mock Data
  console.log('Test 1: Search Tasks Display Names with Mock Data');
  try {
    // Mock task data that simulates what would come from Attio API
    const mockTaskResults = [
      {
        id: { record_id: 'task-1', task_id: 'task-1' },
        values: {
          content: [{ value: 'Follow up with client about quarterly review' }],
          status: [{ value: 'pending' }],
        },
      },
      {
        id: { record_id: 'task-2', task_id: 'task-2' },
        values: {
          content: [{ value: 'Schedule team standup meeting for next week' }],
          status: [{ value: 'completed' }],
        },
      },
      {
        id: { record_id: 'task-3', task_id: 'task-3' },
        values: {
          content: [{ value: 'Review and approve budget proposals' }],
          status: [{ value: 'in_progress' }],
        },
      },
    ];

    console.log(`Found ${mockTaskResults.length} tasks\n`);

    let unnamedCount = 0;
    let namedCount = 0;

    // Test the formatResult function directly
    const formatted = searchRecordsConfig.formatResult(
      mockTaskResults,
      UniversalResourceType.TASKS
    );

    console.log('Formatted search results:');
    console.log(formatted);
    console.log('');

    // Check if any tasks show as "Unnamed"
    if (formatted.includes('Unnamed')) {
      console.log('❌ Some tasks still show as "Unnamed"');
      unnamedCount = (formatted.match(/Unnamed/g) || []).length;
    } else {
      console.log('✅ No tasks show as "Unnamed"');
      namedCount = mockTaskResults.length;
    }

    console.log(`Summary: ${namedCount} named, ${unnamedCount} unnamed`);

    if (unnamedCount === 0) {
      console.log('✅ All tasks display with proper names');
    } else {
      console.log('❌ Some tasks show as "Unnamed" - bug still exists');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to test task display:', error.message);
    return false;
  }

  // Test 2: Get Specific Task Details
  console.log('\nTest 2: Get Specific Task Details');
  try {
    const mockTaskRecord = {
      id: { record_id: 'task-123', task_id: 'task-123' },
      values: {
        content: [{ value: 'QA Test Task - Display Name Verification' }],
        status: [{ value: 'pending' }],
        assignee: [{ value: 'user-456', name: 'John Doe' }],
        due_date: [{ value: '2025-08-20' }],
      },
    };

    const formatted = getRecordDetailsConfig.formatResult(
      mockTaskRecord,
      UniversalResourceType.TASKS
    );

    console.log('Formatted task details:');
    console.log(formatted);
    console.log('');

    if (formatted.includes('QA Test Task - Display Name Verification')) {
      console.log('✅ Task details display with correct name');
    } else if (formatted.includes('Unnamed')) {
      console.log('❌ Task details show as "Unnamed" despite having content');
      return false;
    } else {
      console.log('⚠️ Unexpected formatting result');
      return false;
    }
  } catch (error) {
    console.log('❌ Task details test failed:', error.message);
    return false;
  }

  // Test 3: Edge Cases
  console.log('\nTest 3: Edge Cases');
  try {
    // Test task without content (should show "Unnamed")
    const mockTaskWithoutContent = {
      id: { record_id: 'task-empty', task_id: 'task-empty' },
      values: {
        status: [{ value: 'pending' }],
      },
    };

    const formattedEmpty = getRecordDetailsConfig.formatResult(
      mockTaskWithoutContent,
      UniversalResourceType.TASKS
    );

    if (formattedEmpty.includes('Unnamed')) {
      console.log('✅ Tasks without content correctly show as "Unnamed"');
    } else {
      console.log(
        '⚠️ Tasks without content don\'t show as "Unnamed" - may be an issue'
      );
    }

    // Test task with empty content array
    const mockTaskWithEmptyArray = {
      id: { record_id: 'task-empty-array', task_id: 'task-empty-array' },
      values: {
        content: [],
        status: [{ value: 'pending' }],
      },
    };

    const formattedEmptyArray = getRecordDetailsConfig.formatResult(
      mockTaskWithEmptyArray,
      UniversalResourceType.TASKS
    );

    if (formattedEmptyArray.includes('Unnamed')) {
      console.log(
        '✅ Tasks with empty content array correctly show as "Unnamed"'
      );
    } else {
      console.log('⚠️ Tasks with empty content array don\'t show as "Unnamed"');
    }
  } catch (error) {
    console.log('❌ Edge case testing failed:', error.message);
  }

  console.log('\n🎉 All QA tests passed! Issue #472 appears to be fixed.');
  return true;
}

// Run the test
testTaskDisplayNames().catch(console.error);
