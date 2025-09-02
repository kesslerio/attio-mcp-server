import { testDataRegistry } from './test-data-registry.js';

const MOCK_RE = /^mock-(person|company)-/i;

// Try common keys first; then shallow-scan values.
export function findMockAlias(obj: any): string | null {
  if (!process.env.E2E_MODE) return null;
  if (!obj || typeof obj !== 'object') return null;
  const keys = [
    'mock_id',
    'test_alias',
    'alias',
    'external_id',
    'test_id',
    'id_alias',
  ];
  for (const k of keys) {
    const v = (obj as any)[k];
    if (typeof v === 'string' && MOCK_RE.test(v)) return v;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && MOCK_RE.test(v)) return v;
  }
  return null;
}

export function registerMockAliasIfPresent(recordData: any, realId: string) {
  const alias = findMockAlias(recordData);
  if (alias && realId) testDataRegistry.set(alias, realId);
}
