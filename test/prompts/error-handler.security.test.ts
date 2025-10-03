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
    // Verify script tags are completely removed (not just encoded) - Issue #836
    expect(JSON.stringify(result)).not.toContain('<script>');
    expect(JSON.stringify(result)).not.toContain('</script>');
    expect(result.content[0]?.text).not.toContain('<script>');
    // Verify alert() is also sanitized
    expect(JSON.stringify(result)).toContain('[JS_REDACTED]');
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
    // HTML tags and event handlers are completely removed - Issue #836
    expect(JSON.stringify(result)).not.toContain('<img');
    expect(JSON.stringify(result)).not.toContain('onerror=');
    expect(JSON.stringify(result)).not.toContain('alert(');
    // The entire malicious payload is sanitized away
    expect(JSON.stringify(result)).not.toContain('XSS');
  });

  it('removes data URI injections', () => {
    const maliciousMessage =
      '<iframe src="data:text/html,<script>alert(1)</script>">';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      400,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    expect(JSON.stringify(result)).not.toContain('data:text/html');
    expect(JSON.stringify(result)).not.toContain('<script>');
  });

  it('removes javascript protocol handlers', () => {
    const maliciousMessage =
      '<a href="javascript:alert(document.cookie)">Click</a>';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      400,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    expect(JSON.stringify(result)).not.toContain('javascript:');
    expect(JSON.stringify(result)).not.toContain('javascript:alert');
  });

  it('removes vbscript and file protocol handlers', () => {
    const testCases = [
      '<a href="vbscript:msgbox(1)">VBScript</a>',
      '<a href="file:///etc/passwd">File</a>',
    ];

    testCases.forEach((maliciousMessage) => {
      const result = createErrorResult(
        new Error('Synthetic failure'),
        maliciousMessage,
        400,
        TOOL_METADATA
      );

      // Dangerous URL schemes should be removed/stripped
      expect(JSON.stringify(result)).not.toContain('vbscript:');
      expect(JSON.stringify(result)).not.toContain('file:///');
      expect(JSON.stringify(result)).not.toContain('file:/');
    });
  });

  it('handles nested XSS payloads', () => {
    const maliciousMessage =
      '<div><span><script>alert("nested")</script></span></div>';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      500,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'An internal error occurred while processing the prompt.'
    );
    // Verify all HTML tags are completely removed - Issue #836
    expect(JSON.stringify(result)).not.toContain('<script>');
    expect(JSON.stringify(result)).not.toContain('<div>');
    expect(JSON.stringify(result)).not.toContain('<span>');
    expect(JSON.stringify(result)).not.toContain('</script>');
    expect(JSON.stringify(result)).not.toContain('</div>');
    expect(JSON.stringify(result)).not.toContain('</span>');
    // Verify JavaScript execution patterns are removed/redacted
    expect(JSON.stringify(result)).toContain('[JS_REDACTED]');
    // Text content may remain, but executable patterns are neutralized
    expect(JSON.stringify(result)).not.toContain('alert("nested")');
  });

  it('prevents double-encoding bypass', () => {
    const maliciousMessage = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      maliciousMessage,
      400,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    // Should be double-encoded, not decoded
    expect(JSON.stringify(result)).toContain('&amp;lt;script&amp;gt;');
    expect(JSON.stringify(result)).not.toContain('<script>');
  });

  it('handles multiple event handler variations', () => {
    const testCases = [
      '<img onclick="alert(1)">',
      '<body onload="alert(2)">',
      '<div onmouseover="alert(3)">',
      '<input onfocus="alert(4)">',
    ];

    testCases.forEach((maliciousMessage) => {
      const result = createErrorResult(
        new Error('Synthetic failure'),
        maliciousMessage,
        400,
        TOOL_METADATA
      );

      expect(JSON.stringify(result)).not.toContain('onclick=');
      expect(JSON.stringify(result)).not.toContain('onload=');
      expect(JSON.stringify(result)).not.toContain('onmouseover=');
      expect(JSON.stringify(result)).not.toContain('onfocus=');
    });
  });

  it('sanitizes comparison operators to prevent HTML tag confusion', () => {
    const messageWithSpecialChars = 'Value must be < 100 and > 0';
    const result = createErrorResult(
      new Error('Synthetic failure'),
      messageWithSpecialChars,
      400,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    // Comparison operators are removed to prevent potential HTML tag confusion - Issue #836
    // This is overly cautious but prioritizes security over message clarity
    const detailString = String(result.error.details?.sanitizedDetail);
    expect(detailString).not.toContain('< 100');
    expect(detailString).not.toContain('> 0');
    // The sanitized message should still be present
    expect(detailString).toContain('Value must be');
  });

  it('handles empty error messages gracefully', () => {
    const result = createErrorResult(new Error(), '', 400, TOOL_METADATA);

    expect(result.error.message).toBe(
      'Invalid prompt request. Please review the provided parameters.'
    );
    expect(result.error.code).toBe(400);
    expect(result.isError).toBe(true);
    // Should have sanitized detail even with empty message
    expect(result.error.details?.sanitizedDetail).toBeDefined();
  });

  it('handles whitespace-only error messages gracefully', () => {
    const result = createErrorResult(
      new Error(),
      '   \n\t  ',
      500,
      TOOL_METADATA
    );

    expect(result.error.message).toBe(
      'An internal error occurred while processing the prompt.'
    );
    expect(result.error.code).toBe(500);
    // Whitespace should be preserved in sanitized detail
    expect(result.error.details?.sanitizedDetail).toBeDefined();
  });
});
