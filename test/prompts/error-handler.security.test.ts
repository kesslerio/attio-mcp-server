import { describe, expect, it } from 'vitest';

import { createErrorResult } from '@/prompts/error-handler.js';

const TOOL_METADATA = {
  toolName: 'tests.prompts.security',
  userId: 'test-user',
  requestId: 'test-request',
};

describe('createErrorResult security hardening', () => {
  it('removes executable payloads from client responses', () => {
    const maliciousMessage = "<script>alert('XSS')</script>";
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      400,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    expect(JSON.stringify(result)).not.toContain('<script>');
    expect(result.error.details?.sanitizedDetail).toContain('[blocked_script]');
    expect(result.content[0]?.text).not.toContain('<script>');
  });

  it('encodes common HTML event handler injections', () => {
    const maliciousMessage = '<img src=x onerror=alert("XSS")>';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      500,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'An internal error occurred while processing the prompt.'
    );
    expect(result.error.details?.sanitizedDetail).toContain('&lt;img');
    expect(JSON.stringify(result)).not.toContain('onerror=');
  });
});
