/**
 * Test Data Registry for E2E mock ID resolution
 *
 * Provides seamless mapping from mock aliases (like "mock-person-123")
 * to real UUIDs returned by Attio API during E2E test runs.
 */
class TestDataRegistry {
  private map = new Map<string, string>();

  set(alias: string, realId: string) {
    this.map.set(alias, realId);
  }

  get(alias: string) {
    return this.map.get(alias);
  }

  resolve(alias: string) {
    return this.map.get(alias);
  }

  clear() {
    this.map.clear();
  }

  size() {
    return this.map.size;
  }
}

export const TestData = new TestDataRegistry();

export const testDataRegistry = new TestDataRegistry();

/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export function resolveMockId(id: string | undefined | null): string | null {
  if (!id) return null;
  if (UUID_RE.test(id)) return id;
  if (!process.env.E2E_MODE) return id;
  return testDataRegistry.resolve(id) ?? id;
}
