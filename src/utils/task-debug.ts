/**
 * Task debugging utilities
 */
import { debug, OperationType } from './logger.js';

export function taskDebugEnabled(): boolean {
  const v = (process.env.TASKS_DEBUG || '').toLowerCase();
  return v === '1' || v === 'true' || process.env.E2E_MODE === 'true';
}

export function logTaskDebug(
  scope: string,
  message: string,
  details?: Record<string, unknown>,
  op: OperationType = OperationType.DATA_PROCESSING
): void {
  if (!taskDebugEnabled()) return;
  try {
    debug(`tasks.${scope}`, message, details, scope, op);
  } catch {
    // Fallback to console if logger fails for any reason
    // Avoid throwing in debug paths

    console.error(`[tasks.${scope}] ${message}`, details || {});
  }
}

export function sanitizePayload<T = unknown>(value: T): T {
  const seen = new WeakSet();
  const redact = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v === 'string') {
      // Redact email-like strings
      const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      let s = v.replace(emailRegex, '***@***');
      // Truncate very long strings (e.g. content)
      if (s.length > 250) s = s.slice(0, 250) + '…';
      return s;
    }
    if (typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(redact);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      // Common sensitive keys
      if (
        k.toLowerCase().includes('token') ||
        k.toLowerCase().includes('api_key')
      ) {
        out[k] = '***';
        continue;
      }
      out[k] = redact(val);
    }
    return out;
  };
  return redact(value);
}

export function inspectTaskRecordShape(record: any): Record<string, unknown> {
  const shape: Record<string, unknown> = {
    hasId: !!record?.id,
    idKeys: record?.id ? Object.keys(record.id) : [],
    hasValues: !!record?.values,
    valueKeys: record?.values ? Object.keys(record.values) : [],
    topLevelAssignees:
      Array.isArray(record?.assignees) && record.assignees.length > 0,
    firstTopAssignee: record?.assignees?.[0] || null,
    valuesAssignee:
      Array.isArray(record?.values?.assignee) &&
      record.values.assignee.length > 0,
    firstValuesAssignee: record?.values?.assignee?.[0] || null,
  };
  return shape;
}
