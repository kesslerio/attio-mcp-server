/**
 * Unit tests for extract-text.cjs
 * Tests the extraction of final assistant responses from Claude execution files
 *
 * Run: node scripts/workflows/claude/extract-text.test.cjs
 * Or:  npm run test:extract-text
 */

const {
  extractAllTextFromSession,
  dedupeAdjacent,
  extractStreamingDeltas,
} = require('./extract-text.cjs');

// Test: Should extract final response (message without tool_use)
function testFinalResponse() {
  const session = JSON.stringify([
    {
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me check the files...' },
          { type: 'tool_use', id: 'tool1', name: 'Read', input: {} },
        ],
      },
    },
    {
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool1',
            content: 'file contents',
          },
        ],
      },
    },
    {
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Here is my analysis:\n\n## Summary\nThe code looks good.',
          },
        ],
      },
    },
  ]);

  const result = extractAllTextFromSession(session);
  const expected = 'Here is my analysis:\n\n## Summary\nThe code looks good.';

  if (result.length !== 1 || result[0] !== expected) {
    console.error('FAIL: testFinalResponse');
    console.error('Expected:', [expected]);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testFinalResponse');
}

// Test: Should fall back to last text when all messages have tool_use
function testFallbackToLastText() {
  const session = JSON.stringify([
    {
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'First thought...' },
          { type: 'tool_use', id: 'tool1', name: 'Read', input: {} },
        ],
      },
    },
    {
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Second thought with more context...' },
          { type: 'tool_use', id: 'tool2', name: 'Read', input: {} },
        ],
      },
    },
  ]);

  const result = extractAllTextFromSession(session);

  // Should get the last text, even though it has tool_use
  if (
    result.length !== 1 ||
    result[0] !== 'Second thought with more context...'
  ) {
    console.error('FAIL: testFallbackToLastText');
    console.error('Expected:', ['Second thought with more context...']);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testFallbackToLastText');
}

// Test: Should handle empty/no response gracefully
function testEmptyResponse() {
  const session = JSON.stringify([
    {
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
    },
  ]);

  const result = extractAllTextFromSession(session);

  if (result.length !== 0) {
    console.error('FAIL: testEmptyResponse');
    console.error('Expected: []');
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testEmptyResponse');
}

// Test: Should handle NDJSON format
function testNdjsonFormat() {
  const session = [
    JSON.stringify({
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Intermediate...' },
          { type: 'tool_use', id: 't1' },
        ],
      },
    }),
    JSON.stringify({
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Final answer!' }],
      },
    }),
  ].join('\n');

  const result = extractAllTextFromSession(session);

  if (result.length !== 1 || result[0] !== 'Final answer!') {
    console.error('FAIL: testNdjsonFormat');
    console.error('Expected:', ['Final answer!']);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testNdjsonFormat');
}

// Test: dedupeAdjacent
function testDedupeAdjacent() {
  const input = ['a', 'a', 'b', 'b', 'b', 'a'];
  const result = dedupeAdjacent(input);
  const expected = ['a', 'b', 'a'];

  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    console.error('FAIL: testDedupeAdjacent');
    console.error('Expected:', expected);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testDedupeAdjacent');
}

// Test: Streaming delta fallback (--output-format stream-json)
function testStreamingDeltas() {
  // Simulate streaming output with content_block_delta events
  const session = JSON.stringify([
    { type: 'content_block_start', content_block: { type: 'text', text: '' } },
    {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Hello ' },
    },
    {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'world!' },
    },
    { type: 'content_block_stop' },
  ]);

  const result = extractAllTextFromSession(session);

  if (result.length !== 1 || result[0] !== 'Hello world!') {
    console.error('FAIL: testStreamingDeltas');
    console.error('Expected:', ['Hello world!']);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testStreamingDeltas');
}

// Test: extractStreamingDeltas directly
function testExtractStreamingDeltasDirect() {
  const entries = [
    {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Part 1 ' },
    },
    { type: 'content_block_delta', delta: { type: 'tool_use', name: 'Read' } }, // should be ignored
    {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Part 2' },
    },
  ];

  const result = extractStreamingDeltas(entries);

  if (result !== 'Part 1 Part 2') {
    console.error('FAIL: testExtractStreamingDeltasDirect');
    console.error('Expected: "Part 1 Part 2"');
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testExtractStreamingDeltasDirect');
}

// Test: Assistant messages take priority over streaming deltas
function testAssistantMessagePriority() {
  // Session with both streaming deltas AND a final assistant message
  // The assistant message should be preferred
  const session = JSON.stringify([
    {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Streaming...' },
    },
    {
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Final message from assistant' }],
      },
    },
  ]);

  const result = extractAllTextFromSession(session);

  if (result.length !== 1 || result[0] !== 'Final message from assistant') {
    console.error('FAIL: testAssistantMessagePriority');
    console.error('Expected:', ['Final message from assistant']);
    console.error('Got:', result);
    process.exit(1);
  }
  console.log('PASS: testAssistantMessagePriority');
}

// Run all tests
console.log('Running extract-text.cjs tests...\n');
testFinalResponse();
testFallbackToLastText();
testEmptyResponse();
testNdjsonFormat();
testDedupeAdjacent();
testStreamingDeltas();
testExtractStreamingDeltasDirect();
testAssistantMessagePriority();
console.log('\nAll tests passed!');
