/**
 * Safe collection continuation (KTD6)
 *
 * Continuation tokens are opaque, versioned, length-bounded strings sealed
 * with authenticated encryption under an ephemeral per-process server key.
 * They carry the next offset, optional sealed upstream continuation, and keyed
 * fingerprints of the effective credential scope and query shape. Raw
 * credentials and filter values are never encoded or logged. Tokens expire,
 * die with the process (restart), and are re-verified against the caller's scope before any
 * Attio request, so a valid cursor can never widen access or cross tenants.
 *
 * Tokens grant no permission and never substitute for fresh authorization.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { getContextApiKey } from '@/api/client-context.js';
import { resolveCredentialScope } from '@/utils/client-resolver.js';

/** Continuation failures use the stable INVALID_CURSOR execution code. */
export class InvalidCursorError extends Error {
  readonly code = 'INVALID_CURSOR';
  constructor(message = 'Continuation cursor is invalid for this request') {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

/** Tokens expire after 30 minutes (KTD6). */
export const CURSOR_TTL_MS = 30 * 60 * 1000;
/** Sealed tokens are bounded in length; anything longer is malformed. */
export const MAX_CURSOR_LENGTH = 512;
/** Only the current payload version verifies; older versions are stale. */
const CURSOR_VERSION = 1;
const KEY_BYTES = 32;

/**
 * Ephemeral per-process key material. It never leaves this module, is never
 * persisted, and rotating it (as on restart) invalidates every live token.
 * Each server restart generates fresh keys, so tokens become invalid on
 * restart without any persisted state.
 */
let sealKey: Buffer | null = null;
let fingerprintKey: Buffer | null = null;

function ensureCursorKeys(): { seal: Buffer; fingerprint: Buffer } {
  if (
    !sealKey ||
    sealKey.length !== KEY_BYTES ||
    !fingerprintKey ||
    fingerprintKey.length !== KEY_BYTES
  ) {
    sealKey = randomBytes(KEY_BYTES);
    fingerprintKey = randomBytes(KEY_BYTES);
  }
  return { seal: sealKey, fingerprint: fingerprintKey };
}

/** Simulate a server restart in tests by discarding the ephemeral keys. */
export function rotateCursorServerKey(): void {
  sealKey = null;
  fingerprintKey = null;
}

function encodeBinary(data: Buffer): string {
  return data.toString('base64url');
}

/** Wire format: `<version-char><base64url(nonce|tag|ciphertext)>` — one fixed
 * version byte keeps parsing unambiguous without delimiters inside the body. */
function sealCursorPayload(payload: Record<string, unknown>): string {
  const { seal } = ensureCursorKeys();
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', seal, nonce);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CURSOR_VERSION}${encodeBinary(
    Buffer.concat([nonce, tag, encrypted])
  )}`;
}

interface CursorPayload {
  v: number;
  offset: number;
  limit: number;
  scope: string;
  up?: string;
  exp: number;
}

function openCursorToken(token: string): CursorPayload {
  if (typeof token !== 'string' || token.length === 0) {
    throw new InvalidCursorError('Continuation cursor is empty');
  }
  if (token.length > MAX_CURSOR_LENGTH) {
    throw new InvalidCursorError('Continuation cursor is overlong');
  }
  const version = Number(token[0]);
  if (!Number.isInteger(version) || version !== CURSOR_VERSION) {
    throw new InvalidCursorError(
      'Continuation cursor version is not supported'
    );
  }
  const { seal } = ensureCursorKeys();
  let decoded: Buffer;
  try {
    decoded = Buffer.from(token.slice(1), 'base64url');
  } catch {
    throw new InvalidCursorError('Continuation cursor is malformed');
  }
  if (decoded.length < 12 + 16 + 2) {
    throw new InvalidCursorError('Continuation cursor is malformed');
  }
  const nonce = decoded.subarray(0, 12);
  const tag = decoded.subarray(12, 28);
  const encrypted = decoded.subarray(28);
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv('aes-256-gcm', seal, nonce);
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    // Tampering, truncation, bit flips, and cross-process replay all land here.
    throw new InvalidCursorError('Continuation cursor failed verification');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new InvalidCursorError('Continuation cursor payload is malformed');
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as CursorPayload).offset !== 'number' ||
    typeof (payload as CursorPayload).limit !== 'number' ||
    typeof (payload as CursorPayload).scope !== 'string' ||
    typeof (payload as CursorPayload).exp !== 'number' ||
    (payload as CursorPayload).v !== CURSOR_VERSION
  ) {
    throw new InvalidCursorError('Continuation cursor payload is malformed');
  }
  return payload as CursorPayload;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

/**
 * Resolve the effective credential scope through the same request-context /
 * environment precedence the Attio client uses, then reduce it to a keyed
 * fingerprint. Raw credentials are never returned, encoded, or logged.
 */
export function credentialScopeFingerprint(): string {
  // Same request-context/environment precedence as the Attio client resolver.
  const resolved = getContextApiKey() || resolveCredentialScope();
  const { fingerprint } = ensureCursorKeys();
  return createHmac('sha256', fingerprint)
    .update(resolved ?? '<no-credential>')
    .digest('base64url');
}

export interface CursorScope {
  /** Canonical operation name the token was issued for. */
  operation: string;
  /** Resource type the token was issued for. */
  resource: string;
  /** Effective query shape (filters, sorts, query text, projections). */
  query?: unknown;
}

function scopeFingerprint(scope: CursorScope): string {
  const { fingerprint } = ensureCursorKeys();
  return createHmac('sha256', fingerprint)
    .update(
      stableStringify({
        operation: scope.operation,
        resource: scope.resource,
        query: scope.query ?? null,
        tenant: credentialScopeFingerprint(),
      })
    )
    .digest('base64url');
}

export interface IssuedCollectionCursor {
  /** Opaque next-page token; interpret null together with pagination metadata. */
  next_cursor: string | null;
  /** Machine-readable truncation disclosure for this page. */
  pagination: CollectionPaginationMetadata;
}

export interface CollectionPaginationMetadata {
  /** Whether this collection supports safe continuation at all. */
  supported: boolean;
  /** Results were withheld or upstream completeness could not be established. */
  truncated: boolean;
}

/** Metadata for collections that cannot continue (finite or ranked). */
export function boundedPaginationMetadata(
  truncated: boolean
): CollectionPaginationMetadata {
  return { supported: false, truncated };
}

/** Metadata for collections that support safe continuation. */
export function supportedPaginationMetadata(): CollectionPaginationMetadata {
  return { supported: true, truncated: false };
}

/**
 * Seal the next-page evidence for an offset-backed collection. `hasMore` must
 * come from lookahead items or reliable upstream continuation evidence; a full
 * page alone never proves more results exist.
 */
export function issueNextCursor(input: {
  scope: CursorScope;
  pageSize: number;
  offset: number;
  hasMore: boolean;
  /** Native upstream continuation to preserve sealed inside the token. */
  upstreamCursor?: string | null;
}): IssuedCollectionCursor {
  if (!input.hasMore) {
    return {
      next_cursor: null,
      pagination: supportedPaginationMetadata(),
    };
  }
  const token = sealCursorPayload({
    v: CURSOR_VERSION,
    offset: input.offset,
    limit: input.pageSize,
    scope: scopeFingerprint(input.scope),
    ...(input.upstreamCursor ? { up: input.upstreamCursor } : {}),
    exp: Date.now() + CURSOR_TTL_MS,
  });
  return { next_cursor: token, pagination: supportedPaginationMetadata() };
}

export interface ResolvedCollectionCursor {
  offset: number;
  pageSize: number;
  /** Native upstream continuation preserved from the issuing page. */
  upstreamCursor?: string;
}

/**
 * Verify a client-supplied cursor against the caller's current scope before
 * any Attio request. Tampering, changed query or scope, stale versions, and
 * expiry all fail here with INVALID_CURSOR and without touching the API.
 */
export function resolveCollectionCursor(
  cursor: string,
  scope: CursorScope
): ResolvedCollectionCursor {
  const payload = openCursorToken(cursor);
  if (payload.exp <= Date.now()) {
    throw new InvalidCursorError('Continuation cursor has expired');
  }
  let expected: string;
  try {
    expected = scopeFingerprint(scope);
  } catch {
    throw new InvalidCursorError('Continuation scope could not be resolved');
  }
  const provided = Buffer.from(payload.scope);
  const candidate = Buffer.from(expected);
  if (
    provided.length !== candidate.length ||
    !timingSafeEqual(provided, candidate)
  ) {
    throw new InvalidCursorError(
      'Continuation cursor does not match this request, scope, or tenant'
    );
  }
  if (!Number.isInteger(payload.offset) || payload.offset < 0) {
    throw new InvalidCursorError('Continuation cursor offset is invalid');
  }
  return {
    offset: payload.offset,
    pageSize: payload.limit,
    ...(payload.up ? { upstreamCursor: payload.up } : {}),
  };
}

/**
 * Split a lookahead page into the returned page and continuation evidence.
 * The extra lookahead item is the sentinel proving more results exist; it is
 * refetched by the next page and never dropped from the dataset.
 */
export function splitLookaheadPage<T>(
  items: T[],
  pageSize: number
): { page: T[]; hasMore: boolean } {
  if (!Array.isArray(items)) {
    throw new InvalidCursorError('Collection page was not an array');
  }
  if (items.length > pageSize) {
    return { page: items.slice(0, pageSize), hasMore: true };
  }
  return { page: items, hasMore: false };
}

/**
 * Reject cursor + explicit offset combinations before any API work. Legacy
 * offset calls without a cursor remain accepted during migration.
 */
export function rejectCursorWithOffset(params: {
  cursor?: unknown;
  offset?: unknown;
}): void {
  const hasCursor =
    typeof params.cursor === 'string' && params.cursor.length > 0;
  const hasOffset = typeof params.offset === 'number';
  if (hasCursor && hasOffset) {
    throw Object.assign(
      new Error(
        'Provide either cursor or offset, not both; cursors advance their own position'
      ),
      { code: 'VALIDATION_ERROR', status: 400 }
    );
  }
}
