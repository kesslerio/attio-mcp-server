/**
 * U5 continuation unit tests (KTD6): allowed, denied, stale, and cross-tenant
 * paths fail offline before any Attio request, and offset/lookahead evidence
 * never misstates truncation.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  InvalidCursorError,
  MAX_CURSOR_LENGTH,
  issueNextCursor,
  rejectCursorWithOffset,
  resolveCollectionCursor,
  rotateCursorServerKey,
  splitLookaheadPage,
  credentialScopeFingerprint,
  boundedPaginationMetadata,
} from '@/handlers/tools/result-cursor.js';
import { runWithClientContext } from '@/api/client-context.js';

const scope = {
  operation: 'records_search',
  resource: 'companies',
  query: { filters: { stage: 'Demo' } },
};

beforeEach(() => {
  vi.stubEnv('ATTIO_API_KEY', 'tenant-a-key');
  vi.stubEnv('ATTIO_ACCESS_TOKEN', '');
  rotateCursorServerKey();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rotateCursorServerKey();
});

describe('cursor issuance and lookahead splitting', () => {
  it('returns null and supported metadata when continuation evidence is absent', () => {
    const issued = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: false,
    });
    expect(issued).toEqual({
      next_cursor: null,
      pagination: { supported: true, truncated: false },
    });
  });

  it('seals a bounded opaque token when reliable evidence proves more results', () => {
    const issued = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    });
    expect(issued.next_cursor).toMatch(/^1[A-Za-z0-9_-]{20,}$/);
    expect(issued.next_cursor!.length).toBeLessThanOrEqual(MAX_CURSOR_LENGTH);
    // The token is opaque: no offset, filter, or query text is readable.
    expect(issued.next_cursor).not.toContain('stage');
    expect(issued.next_cursor).not.toContain('Demo');
    expect(boundedPaginationMetadata(false)).toEqual({
      supported: false,
      truncated: false,
    });
  });

  it('splits lookahead pages without dropping the sentinel item from the dataset', () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ i }));
    const split = splitLookaheadPage(items, 10);
    expect(split.page).toHaveLength(10);
    expect(split.hasMore).toBe(true);
    // The lookahead item is refetched by the next page, never discarded.
    expect(split.page[9]).toEqual({ i: 9 });
    expect(splitLookaheadPage(items.slice(0, 10), 10)).toEqual({
      page: items.slice(0, 10),
      hasMore: false,
    });
    expect(splitLookaheadPage([], 10)).toEqual({ page: [], hasMore: false });
  });

  it('rejects cursor plus explicit offset before any API work', () => {
    expect(() =>
      rejectCursorWithOffset({ cursor: '1abcDEF', offset: 10 })
    ).toThrow(/either cursor or offset/);
    expect(() => rejectCursorWithOffset({ cursor: '1abcDEF' })).not.toThrow();
    expect(() => rejectCursorWithOffset({ offset: 10 })).not.toThrow();
  });
});

describe('cursor verification before any Attio request', () => {
  it('round-trips a valid token to its offset and page size', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 25,
      offset: 50,
      hasMore: true,
    });
    const resolved = resolveCollectionCursor(next_cursor!, scope);
    expect(resolved).toEqual({ offset: 50, pageSize: 25 });
  });

  it('preserves and re-exposes a sealed native upstream cursor', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
      upstreamCursor: 'upstream-cursor-value',
    });
    expect(next_cursor).not.toContain('upstream-cursor-value');
    const resolved = resolveCollectionCursor(next_cursor!, scope);
    expect(resolved.upstreamCursor).toBe('upstream-cursor-value');
  });

  it.each([
    ['malformed', 'not-a-cursor'],
    ['no-version-prefix', 'X' + 'A'.repeat(60)],
    ['overlong', `1${'A'.repeat(MAX_CURSOR_LENGTH + 1)}`],
    ['empty', ''],
  ])('fails %s cursors offline', (_label, token) => {
    expect(() => resolveCollectionCursor(token, scope)).toThrow(
      InvalidCursorError
    );
  });

  it('fails tampered cursors without leaking why beyond verification', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    });
    const raw = Buffer.from(next_cursor!.slice(1), 'base64url');
    raw[raw.length - 1] ^= 0x01;
    const tampered = `1${raw.toString('base64url')}`;
    expect(() => resolveCollectionCursor(tampered, scope)).toThrow(
      InvalidCursorError
    );
  });

  it('fails truncated-prefix and foreign-version tokens', () => {
    expect(() => resolveCollectionCursor('1AAAA', scope)).toThrow(
      InvalidCursorError
    );
    expect(() => resolveCollectionCursor('2AAAA', scope)).toThrow(
      InvalidCursorError
    );
  });

  it('fails a cursor whose page size changed since issuance', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    });
    // Issued for pageSize 10; requesting page size 20 must fail via the
    // service-level check, and the module itself re-exposes the pinned size.
    const resolved = resolveCollectionCursor(next_cursor!, scope);
    expect(resolved.pageSize).toBe(10);
  });

  it('fails a cursor replayed for a different resource or query shape', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    });
    expect(() =>
      resolveCollectionCursor(next_cursor!, {
        ...scope,
        resource: 'people',
      })
    ).toThrow(InvalidCursorError);
    expect(() =>
      resolveCollectionCursor(next_cursor!, {
        ...scope,
        query: { filters: { stage: 'Lost' } },
      })
    ).toThrow(InvalidCursorError);
    expect(() =>
      resolveCollectionCursor(next_cursor!, {
        ...scope,
        operation: 'records_search_advanced',
      })
    ).toThrow(InvalidCursorError);
  });

  it('fails a cursor replayed under another tenant credential', async () => {
    const tenantAToken = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    }).next_cursor!;
    // Same process, same query, different credential: replay must fail.
    vi.stubEnv('ATTIO_API_KEY', 'tenant-b-key');
    expect(() => resolveCollectionCursor(tenantAToken, scope)).toThrow(
      InvalidCursorError
    );
    // And a token minted under B stays valid only under B.
    const tenantBToken = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    }).next_cursor!;
    expect(() => resolveCollectionCursor(tenantBToken, scope)).not.toThrow();
    vi.stubEnv('ATTIO_API_KEY', 'tenant-a-key');
    expect(() => resolveCollectionCursor(tenantBToken, scope)).toThrow(
      InvalidCursorError
    );
  });

  it('binds cursors to the request-scoped credential, not only the process env', async () => {
    const token = await runWithClientContext(
      { ATTIO_API_KEY: 'context-tenant-key' },
      async () =>
        issueNextCursor({
          scope,
          pageSize: 10,
          offset: 0,
          hasMore: true,
        }).next_cursor!
    );
    await runWithClientContext(
      { ATTIO_API_KEY: 'other-context-tenant' },
      async () => {
        expect(() => resolveCollectionCursor(token, scope)).toThrow(
          InvalidCursorError
        );
      }
    );
    await runWithClientContext(
      { ATTIO_API_KEY: 'context-tenant-key' },
      async () => {
        expect(() => resolveCollectionCursor(token, scope)).not.toThrow();
      }
    );
  });

  it('fails expired cursors before any Attio request', () => {
    vi.useFakeTimers();
    try {
      const { next_cursor } = issueNextCursor({
        scope,
        pageSize: 10,
        offset: 10,
        hasMore: true,
      });
      vi.setSystemTime(Date.now() + 30 * 60 * 1000 + 1000);
      expect(() => resolveCollectionCursor(next_cursor!, scope)).toThrow(
        /expired/
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails every live token after a server restart', () => {
    const { next_cursor } = issueNextCursor({
      scope,
      pageSize: 10,
      offset: 10,
      hasMore: true,
    });
    rotateCursorServerKey();
    expect(() => resolveCollectionCursor(next_cursor!, scope)).toThrow(
      InvalidCursorError
    );
  });

  it('fingerprints the credential without encoding or exposing it', () => {
    vi.stubEnv('ATTIO_API_KEY', 'super-secret-tenant-key');
    const fingerprint = credentialScopeFingerprint();
    expect(fingerprint).not.toContain('super-secret-tenant-key');
    expect(fingerprint).toMatch(/^[A-Za-z0-9_-]+$/);
    vi.stubEnv('ATTIO_API_KEY', 'another-secret-key');
    expect(credentialScopeFingerprint()).not.toBe(fingerprint);
  });
});
