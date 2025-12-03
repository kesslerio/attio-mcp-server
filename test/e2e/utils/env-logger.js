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
