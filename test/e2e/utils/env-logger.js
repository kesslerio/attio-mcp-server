/**
 * E2E Test Environment Logger
 *
 * This is a TEST-SIDE logger for E2E environment setup and validation.
 * It is safe to use console.* methods here because this code runs in the
 * test process, NOT inside the MCP server. The MCP server's stdout is
 * reserved for JSON-RPC messages - any console.log there would corrupt
 * the protocol stream.
 *
 * Routes info/success/error to stderr to keep stdout clean for test runners.
 * Only log() uses stdout for explicit test output.
 */

const DEFAULT_SCOPE = 'E2E';

function formatMessage(scope, prefix, message) {
  return `[${scope}] ${prefix ? `${prefix} ` : ''}${message}`;
}

function emit(writer, scope, prefix, message, extras) {
  writer(formatMessage(scope, prefix, message), ...extras);
}

export function createE2ELogger(scope = DEFAULT_SCOPE) {
  const resolvedScope = scope || DEFAULT_SCOPE;

  return {
    info(message, ...extras) {
      emit(console.error, resolvedScope, 'ℹ️', message, extras);
    },
    success(message, ...extras) {
      emit(console.error, resolvedScope, '✅', message, extras);
    },
    warn(message, ...extras) {
      emit(console.warn, resolvedScope, '⚠️', message, extras);
    },
    error(message, ...extras) {
      emit(console.error, resolvedScope, '❌', message, extras);
    },
    log(message, ...extras) {
      emit(console.log, resolvedScope, '', message, extras);
    },
  };
}
