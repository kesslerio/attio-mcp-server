# Secure Logging Migration Guide

This guide documents the transition to the SecureLogger and the sanitization pipeline that protects sensitive data across the Attio MCP server.

## Why SecureLogger?

Security audit #771 identified that diagnostic logs occasionally included bearer tokens, email addresses, and raw API responses. The new secure logging stack introduces:

- **Recursive sanitization** for every structured payload logged through `@/utils/logger`.
- **Context-aware masking** for identifiers, emails, phone numbers, tokens, API keys, and credit card-like patterns.
- **Error scrubbing** that rewrites exception messages via the existing `sanitizeErrorMessage` helpers.
- **Test harness protections** that wrap `console.*` during Vitest runs to guarantee redaction in fixture output.
- **Debug script guardrails** that surface production-data warnings before any manual script execution.

## CLI Console Usage Exception

**Note**: Direct `console.*` usage remains in `src/cli.ts` for help/version output. This is an intentional exception as:

- CLI output is user-facing documentation (--help, --version)
- These outputs do not contain sensitive data
- They are necessary for command-line interface functionality
- Test harness sanitization does not apply to CLI help text

All other console usage in `src/` directories must use structured logging via `logger.*` methods.

## Migration Checklist

1. Import the scoped logger via `createScopedLogger` (returns a `SecureLogger` instance) instead of using `console` directly.
2. Pass raw request/response payloads to `logger.*`—the sanitizer handles masking automatically.
3. Avoid manual redaction logic; rely on `sanitizeLogPayload` to ensure consistent masking.
4. For custom scripts/tests, reuse sanitizers via `@/utils/log-sanitizer` when formatting output manually.
5. Validate new log fields by running `npm run test:offline`—unit tests assert 100% coverage for `SecureLogger` pathways.

## Backward Compatibility

The secure logger preserves the existing JSON log structure:

```json
{
  "message": "Operation successful: createRecord",
  "metadata": {
    "module": "records/create",
    "level": "INFO",
    "timestamp": "2024-05-01T12:34:56.789Z"
  },
  "data": {
    "recordId": "1234…abcd",
    "warnings": []
  }
}
```

Logs remain machine-parseable and continue to emit via `stderr`, so existing ingestion pipelines require no changes.

## Performance Budget

`sanitizeLogPayload` was profiled with nested payloads and averages **<1ms** per invocation (upper bound <5ms enforced by unit tests). This keeps logging overhead negligible while meeting the security acceptance criteria.

## Testing

- `npm run test:offline` – ensures SecureLogger behaviour is exercised with 100% coverage.
- `npm run test` – includes console wrapper checks for test-only redaction.

## CodeQL & Compliance

All sensitive-field sinks are routed through the sanitizers, eliminating prior CodeQL warnings. Masking guarantees GDPR-aligned handling of personal data, and debug scripts now block accidental use against production tenants.

For any new logging surface, ensure it routes through `createScopedLogger` or imports the sanitization helpers defined in `@/utils/log-sanitizer`.
