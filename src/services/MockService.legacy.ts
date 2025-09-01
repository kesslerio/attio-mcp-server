/**
 * LEGACY IMPLEMENTATION - SCHEDULED FOR REMOVAL
 *
 * This file preserves the original MockService implementation as a safety net
 * during the factory pattern migration (Issue #525 Phases B & C). It will be
 * removed after successful production validation of the new architecture.
 *
 * ⚠️  DO NOT USE THIS FILE ⚠️
 * Use getCreateService() from './create/index.js' instead
 *
 * This file is kept temporarily for:
 * - Rollback capability if critical issues discovered in factory pattern
 * - Reference for complex API normalization logic during migration
 * - Validation that factory pattern handles all original edge cases
 * - Preservation of sophisticated error recovery and eventual consistency handling
 *
 * ORIGINAL DESCRIPTION:
 * Production Mock Service - Handled mock data generation for testing environments
 * without importing test files. Contains minimum viable mock logic needed by
 * production handlers while avoiding production-test coupling violations.
 *
 * Original Design Principles:
 * - No imports from test/ directories
 * - Environment-driven behavior
 * - Fallback to real API when not in mock mode
 * - Issue #480 compatibility maintained
 *
 * STATUS: This represents the "hybrid service anti-pattern" that was eliminated
 * in favor of clean factory pattern separation between MockCreateService and
 * AttioCreateService.
 */

import type { AttioRecord } from '../types/attio.js';
import { EnhancedApiError } from '../errors/enhanced-api-errors.js';
import { extractRecordId } from '../utils/validation/uuid-validation.js';
import { debug, error } from '../utils/logger.js';

// Small utility: micro backoff for eventual consistency
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Normalizes client responses and adapts id → { id: { record_id } }.
// Handles shapes: response | response.data | { data } | { record } | { id: string } | { record_id: string }
function extractAttioRecord(response: any) {
  const payload = (response && (response.data ?? response)) ?? null;
  const maybeData = (payload && (payload.data ?? payload)) ?? null;

  // Peel { record: {...} } if present
  let rec =
    maybeData && typeof maybeData === 'object' && 'record' in maybeData
      ? (maybeData as any).record
      : maybeData;

  // If empty object, try to salvage from headers (e.g., Location)
  const loc = response?.headers?.location || response?.headers?.Location;
  if (
    (!rec || (typeof rec === 'object' && Object.keys(rec).length === 0)) &&
    typeof loc === 'string'
  ) {
    const rid = extractRecordId(loc);
    if (rid) return { id: { record_id: rid } };
  }

  if (rec && typeof rec === 'object') {
    const r: any = rec;

    // id as string → adapt
    if (typeof r.id === 'string') return { ...r, id: { record_id: r.id } };

    // explicit record_id → adapt
    if (
      typeof r.record_id === 'string' &&
      (!r.id || typeof r.id !== 'object')
    ) {
      return { ...r, id: { record_id: r.record_id } };
    }
  }

  return rec;
}
import type {
  E2EMeta,
  UnknownRecord,
  isRecord,
} from '../types/service-types.js';

/**
 * Environment detection for mock injection
 */
function shouldUseMockData(): boolean {
  // Explicit-only: use mocks only when explicitly requested
  // E2E runs should default to real API; offline runs use test:offline
  const result =
    process.env.USE_MOCK_DATA === 'true' ||
    process.env.OFFLINE_MODE === 'true' ||
    process.env.PERFORMANCE_TEST === 'true';

  console.error('[SHOULDUSEMOCKDATA]', {
    result,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
    OFFLINE_MODE: process.env.OFFLINE_MODE,
    PERFORMANCE_TEST: process.env.PERFORMANCE_TEST,
    E2E_MODE: process.env.E2E_MODE,
  });

  return result;
}

function shouldUseViMocks(): boolean {
  // Check if we're in a unit test environment with vi.mock()
  try {
    const isVitest =
      typeof (globalThis as any).vi !== 'undefined' ||
      typeof (global as any).vi !== 'undefined';

    // Also check if NODE_ENV is test (unit tests)
    const isUnitTest = process.env.NODE_ENV === 'test';

    return isVitest && isUnitTest;
  } catch {
    return false;
  }
}

/**
 * Apply consistent E2E test markers to mock data
 */
function applyE2EMarkers(data: UnknownRecord, meta?: E2EMeta): UnknownRecord {
  const baseTags = new Set([
    ...(Array.isArray(data.tags) ? data.tags : []),
    'e2e-test',
    'e2e-suite:notes',
  ]);
  if (meta?.runId) {
    baseTags.add(`e2e-run:${meta.runId}`);
  }

  return {
    ...data,
    tags: Array.from(baseTags),
    metadata: {
      ...(data.metadata || {}),
      e2e: true,
    },
  };
}

/**
 * Production-safe mock service that doesn't import test files
 */
export class MockService {
  /**
   * Creates a company record with mock support
   */
  static async createCompany(
    companyData: Record<string, unknown>
  ): Promise<AttioRecord> {
    console.error(
      '[CREATECOMPANY] ENTRY POINT - called with data:',
      Object.keys(companyData)
    );
    const useMocks = shouldUseMockData();
    debug('MockService', 'createCompany Environment check', {
      E2E_MODE: process.env.E2E_MODE,
      useMocks,
      companyDataKeys: Object.keys(companyData || {}),
      ATTIO_API_KEY: process.env.ATTIO_API_KEY
        ? `${process.env.ATTIO_API_KEY.slice(0, 8)}...`
        : 'MISSING',
    });

    if (!useMocks) {
      console.error('[CREATECOMPANY] Starting API call flow - not using mocks');
      console.error('[CREATECOMPANY] Before try block');

      // Declare path outside try block for scope in catch
      let path = '/objects/companies/records';

      try {
        console.error('[CREATECOMPANY] Inside try block');
        console.error('[CREATECOMPANY] Importing attio-client module');
        // TEMP: Direct axios to bypass client issues and prove concept
        const axios = (await import('axios')).default;
        const client = axios.create({
          baseURL: (
            process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
          ).replace(/\/+$/, ''),
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          transformResponse: [
            (d) => {
              try {
                return JSON.parse(d);
              } catch {
                return d;
              }
            },
          ],
          validateStatus: (s) => s >= 200 && s < 300,
        });

        console.log('🧨 TEMP DIRECT CLIENT', {
          baseURL: client.defaults.baseURL,
        });
        console.error('[CREATECOMPANY] Got direct client:', !!client);

        // Test direct probe first
        const probe = await client.get('/objects/companies');
        console.log(
          '🩺 /objects/companies body:',
          JSON.stringify(probe.data).slice(0, 400)
        );

        // Resolve real object slug for this workspace
        const { resolveObjectSlug } = await import('../api/attio-objects.js');
        const companiesSlug = await resolveObjectSlug(client, 'companies');
        path = `/objects/${companiesSlug}/records`;

        // Debug the client configuration
        debug('MockService', 'Client configuration check', {
          hasClient: !!client,
          baseURL: client?.defaults?.baseURL,
          hasAuth: !!client?.defaults?.headers?.Authorization,
          adapter:
            (client?.defaults?.adapter as any)?.name ||
            (client?.defaults?.adapter as any)?.toString()?.slice(0, 50) ||
            'unknown',
          interceptorCount:
            (client?.interceptors?.response as any)?.handlers?.length || 0,
        });

        // Normalize company domains to string array
        const normalizedCompany: Record<string, unknown> = { ...companyData };
        const rawDomain = (companyData as any).domain;
        const rawDomains = (companyData as any).domains;
        if (rawDomains) {
          if (Array.isArray(rawDomains)) {
            (normalizedCompany as any).domains = rawDomains.map((d: any) => {
              if (typeof d === 'string') {
                return { domain: d };
              } else if (d?.domain) {
                return { domain: d.domain };
              } else if (d?.value) {
                return { domain: d.value };
              } else {
                return { domain: String(d) };
              }
            });
          } else {
            (normalizedCompany as any).domains = [
              {
                domain:
                  typeof rawDomains === 'string'
                    ? rawDomains
                    : ((rawDomains as any)?.domain ??
                      (rawDomains as any)?.value ??
                      String(rawDomains)),
              },
            ];
          }
        } else if (rawDomain) {
          (normalizedCompany as any).domains = [{ domain: String(rawDomain) }];
          delete (normalizedCompany as any).domain;
        }

        const payload = { data: { values: normalizedCompany } };

        debug('MockService', 'Making API call', {
          url: path,
          method: 'POST',
          payload,
          payloadSize: JSON.stringify(payload).length,
        });

        // Create company with correct domain format
        console.log('🔍 POST PATH + PAYLOAD', { path, payload });
        const response = await client.post(path, payload);

        debug('MockService', 'createCompany Raw API response', {
          status: response?.status,
          statusText: response?.statusText,
          hasData: !!response?.data,
          hasNestedData: !!response?.data?.data,
          dataKeys: response?.data ? Object.keys(response.data) : [],
          responseData: response?.data,
          hasHeaders: !!response?.headers,
          locationHeader:
            response?.headers?.location || response?.headers?.Location,
          headerKeys: response?.headers ? Object.keys(response.headers) : [],
        });

        // Extract result following same logic as createRecord (safe)
        let record: any;
        try {
          record = extractAttioRecord(response);
        } catch (ex) {
          debug('MockService', 'createCompany extract failed', {
            message: (ex as any)?.message,
            hasData: !!response?.data,
            dataType: typeof response?.data,
            dataKeys:
              response?.data && typeof response?.data === 'object'
                ? Object.keys(response.data)
                : [],
          });
          record = null as any;
        }

        // Add payload logging for debugging
        debug('MockService', 'createCompany EXACT PAYLOAD', {
          data: { values: normalizedCompany },
        });

        // SURGICAL FIX: Detect empty objects and convert to proper error, but allow legitimate create responses
        const looksLikeCreatedRecord =
          record &&
          typeof record === 'object' &&
          (('id' in record && (record as any).id?.record_id) ||
            'record_id' in record ||
            'web_url' in record ||
            'created_at' in record);

        const mustRecover = !record || !record.id || !record.id.record_id;
        if (mustRecover) {
          // 0) Try Location header (direct ID fetch) – works even if search is not indexed yet
          const location =
            (response?.headers as any)?.location ||
            (response?.headers as any)?.Location;
          const idMatch =
            location && String(location).match(/\/records\/([^/?#]+)/);
          if (idMatch?.[1]) {
            const rid = idMatch[1];
            for (const wait of [0, 150, 300]) {
              if (wait) await sleep(wait);
              try {
                const { data: fetched } = await client.get(
                  `${path}/${encodeURIComponent(rid)}`
                );
                const rec = extractAttioRecord(fetched);
                if (rec?.id?.record_id) {
                  record = rec;
                  break;
                }
              } catch {
                // keep trying
              }
            }
          }

          // 1) If still not found, do a few search retries (eventual consistency)
          if (!record?.id?.record_id) {
            const domain = Array.isArray(normalizedCompany.domains)
              ? (normalizedCompany.domains[0] as string)
              : undefined;
            const name = normalizedCompany.name as string | undefined;

            for (const wait of [50, 200, 450, 900]) {
              await sleep(wait);
              try {
                // domain first (stronger uniqueness). Try contains then eq.
                if (domain && !record?.id?.record_id) {
                  const attempts = [
                    { filter: { domains: { contains: domain } } },
                    { filter: { domains: { eq: domain } } },
                  ];
                  for (const attempt of attempts) {
                    const { data } = await client.post(
                      `/objects/${companiesSlug}/records/search`,
                      { ...attempt, limit: 1, order: { created_at: 'desc' } }
                    );
                    const rec = extractAttioRecord(data);
                    if (rec?.id?.record_id) {
                      record = rec;
                      break;
                    }
                  }
                }

                // name exact match as fallback
                if (name && !record?.id?.record_id) {
                  const { data } = await client.post(
                    `/objects/${companiesSlug}/records/search`,
                    {
                      filter: { name: { eq: name } },
                      limit: 1,
                      order: { created_at: 'desc' },
                    }
                  );
                  const rec = extractAttioRecord(data);
                  if (rec?.id?.record_id) {
                    record = rec;
                    break;
                  }
                }
              } catch {
                // keep retrying
              }
            }
          }

          if (!record?.id?.record_id) {
            throw new EnhancedApiError(
              'Attio createCompany returned an empty/invalid record payload',
              500,
              path,
              'POST',
              {
                httpStatus: 500,
                resourceType: 'companies',
                operation: 'create',
              }
            );
          }
        }

        if (
          process.env.E2E_MODE === 'true' ||
          process.env.NODE_ENV === 'test'
        ) {
          debug('MockService', 'Normalized company record', {
            hasIdObj: !!(record as any)?.id?.record_id,
            idType: typeof (record as any)?.id,
            keys: Object.keys(record || {}),
          });
        }

        return record;
      } catch (err: any) {
        const r = err?.response;
        const status = r?.status || err?.status || 500;
        const data = r?.data;
        const url = r?.config?.url;
        const method = r?.config?.method;
        const payload = r?.config?.data;
        error('MockService', 'createCompany Direct API error', {
          status,
          url,
          method,
          serverData: data, // <-- this is what we need to see
          requestPayload: payload, // <-- confirm the exact body that axios sent
        });
        const msg =
          status && data
            ? `Attio create company failed (${status}): ${JSON.stringify(data)}`
            : (err?.message as string) || 'createCompany error';

        throw new EnhancedApiError(
          msg,
          status,
          url ||
            (typeof path === 'string' ? path : '/objects/companies/records'),
          (method || 'POST').toUpperCase(),
          {
            httpStatus: status,
            resourceType: 'companies',
            operation: 'create',
            serverData: data,
            originalError: err,
          }
        );
      }
    }

    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const timestamp = Date.now().toString().slice(-12);
    const mockId = `12345678-1234-4000-8000-${timestamp}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'companies',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name:
          (companyData.name as string) || `Mock Company ${mockId.slice(-4)}`,
        domains: Array.isArray(companyData.domains)
          ? (companyData.domains as string[]).map((d) => ({ value: d }))
          : [{ value: `${mockId}.example.com` }],
        industry: (companyData.industry as string) || 'Technology',
        description:
          (companyData.description as string) ||
          `Mock company for testing - ${mockId}`,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Creates a person record with mock support
   */
  static async createPerson(
    personData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      // Declare path outside try block for scope in catch
      let path = '/objects/people/records';

      try {
        // Use centralized Attio client for consistent authentication
        debug('MockService', 'createPerson Using centralized Attio client');
        // TEMP: Direct axios to bypass client issues and prove concept
        const axios = (await import('axios')).default;
        const client = axios.create({
          baseURL: (
            process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
          ).replace(/\/+$/, ''),
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          transformResponse: [
            (d) => {
              try {
                return JSON.parse(d);
              } catch {
                return d;
              }
            },
          ],
          validateStatus: (s) => s >= 200 && s < 300,
        });

        console.log('🧨 TEMP DIRECT CLIENT (createPerson)', {
          baseURL: client.defaults.baseURL,
        });

        // Resolve real object slug for this workspace
        const { resolveObjectSlug } = await import('../api/attio-objects.js');
        const peopleSlug = await resolveObjectSlug(client, 'people');
        path = `/objects/${peopleSlug}/records`;

        // Normalize to Attio API schema for people values
        const filteredPersonData: Record<string, unknown> = {};

        // 1) Name normalization: array of personal-name objects
        const rawName = (personData as any).name;
        if (rawName) {
          if (typeof rawName === 'string') {
            const parts = rawName.trim().split(/\s+/);
            const first = parts.shift() || rawName;
            const last = parts.join(' ');
            const full = [first, last].filter(Boolean).join(' ');
            filteredPersonData.name = [
              {
                first_name: first,
                ...(last ? { last_name: last } : {}),
                full_name: full,
              },
            ];
          } else if (Array.isArray(rawName)) {
            filteredPersonData.name = rawName;
          } else if (typeof rawName === 'object') {
            const obj = rawName as Record<string, unknown>;
            if (
              'first_name' in obj ||
              'last_name' in obj ||
              'full_name' in obj
            ) {
              filteredPersonData.name = [obj];
            }
          }
        }

        // 2) Emails: Attio create accepts string array; prefer plain strings
        const rawEmails = (personData as any).email_addresses;
        if (Array.isArray(rawEmails) && rawEmails.length) {
          const normalized = rawEmails.map((e: any) =>
            e && typeof e === 'object' && 'email_address' in e
              ? String(e.email_address)
              : String(e)
          );
          filteredPersonData.email_addresses = normalized;
        } else if (typeof (personData as any).email === 'string') {
          filteredPersonData.email_addresses = [
            String((personData as any).email),
          ];
        }

        // Ensure required fields exist: name and email_addresses
        if (
          !filteredPersonData.email_addresses ||
          !(filteredPersonData as any).email_addresses.length
        ) {
          throw new Error('missing required parameter: email_addresses');
        }
        if (!filteredPersonData.name) {
          // Derive a safe name from email local part
          const firstEmail = (
            (filteredPersonData as any).email_addresses[0] || {}
          ).email_address as string;
          const local =
            typeof firstEmail === 'string'
              ? firstEmail.split('@')[0]
              : 'Test Person';
          const parts = local
            .replace(/[^a-zA-Z]+/g, ' ')
            .trim()
            .split(/\s+/);
          const first = parts[0] || 'Test';
          const last = parts.slice(1).join(' ') || 'User';
          (filteredPersonData as any).name = [
            {
              first_name: first,
              last_name: last,
              full_name: `${first} ${last}`,
            },
          ];
        }

        // 3) Optional professional info
        if (typeof (personData as any).title === 'string') {
          filteredPersonData.title = (personData as any).title;
        }
        if (typeof (personData as any).job_title === 'string') {
          filteredPersonData.job_title = (personData as any).job_title;
        }
        if (typeof (personData as any).description === 'string') {
          filteredPersonData.description = (personData as any).description;
        }

        // 4) Exclude unsupported/test-only fields (department, seniority, phones, socials, etc.)

        debug('MockService', 'createPerson EXACT PAYLOAD', {
          data: { values: filteredPersonData },
        });

        if (process.env.E2E_MODE === 'true') {
          // TEMP: Console log payload for E2E debugging only
          console.log(
            '🔍 EXACT API PAYLOAD:',
            JSON.stringify({ data: { values: filteredPersonData } }, null, 2)
          );
        }

        const doCreate = async (values: Record<string, unknown>) =>
          client.post(path, { data: { values } });

        let response;
        try {
          // Attempt #1
          response = await doCreate(filteredPersonData);
        } catch (firstErr: any) {
          const status = firstErr?.response?.status;
          const data = firstErr?.response?.data;
          // Only retry on 400 with alternate email schema
          if (status === 400) {
            const alt: Record<string, unknown> = { ...filteredPersonData };
            const emails = (alt as any).email_addresses as any[] | undefined;
            if (emails && emails.length) {
              if (typeof emails[0] === 'string') {
                (alt as any).email_addresses = emails.map((e: any) => ({
                  email_address: String(e),
                }));
              } else if (
                emails[0] &&
                typeof emails[0] === 'object' &&
                'email_address' in emails[0]
              ) {
                (alt as any).email_addresses = emails.map((e: any) =>
                  String(e.email_address)
                );
              }
              response = await doCreate(alt);
            } else {
              // No emails available to toggle; rethrow with context
              error(
                'MockService',
                'createPerson 1st attempt failed (no emails to toggle)',
                { status, data }
              );
              throw firstErr;
            }
          } else {
            // Non-400 or unknown error; rethrow
            error('MockService', 'createPerson 1st attempt failed', {
              status,
              data,
            });
            throw firstErr;
          }
        }

        debug('MockService', 'createPerson Raw API response', {
          status: response?.status,
          statusText: response?.statusText,
          hasData: !!response?.data,
          hasNestedData: !!response?.data?.data,
          dataKeys: response?.data ? Object.keys(response.data) : [],
        });

        // Extract result following same logic as createRecord (safe)
        let record: any;
        try {
          record = extractAttioRecord(response);
        } catch (ex) {
          debug('MockService', 'createPerson extract failed', {
            message: (ex as any)?.message,
            hasData: !!response?.data,
            dataType: typeof response?.data,
            dataKeys:
              response?.data && typeof response?.data === 'object'
                ? Object.keys(response.data)
                : [],
          });
          record = null as any;
        }

        // SURGICAL FIX: Detect empty objects and convert to proper error, but allow legitimate create responses
        const looksLikeCreatedRecord =
          record &&
          typeof record === 'object' &&
          (('id' in record && (record as any).id?.record_id) ||
            'record_id' in record ||
            'web_url' in record ||
            'created_at' in record);

        const mustRecover = !record || !record.id || !record.id.record_id;
        if (mustRecover) {
          // 0) Try Location header (direct ID fetch)
          const location =
            (response?.headers as any)?.location ||
            (response?.headers as any)?.Location;
          const idMatch =
            location && String(location).match(/\/records\/([^/?#]+)/);
          if (idMatch?.[1]) {
            const rid = idMatch[1];
            for (const wait of [0, 150, 300]) {
              if (wait) await sleep(wait);
              try {
                const { data: fetched } = await client.get(
                  `${path}/${encodeURIComponent(rid)}`
                );
                const rec = extractAttioRecord(fetched);
                if (rec?.id?.record_id) {
                  record = rec;
                  break;
                }
              } catch {
                // keep trying
              }
            }
          }

          // 1) If still not found, search by primary email with small backoff and two operators
          const email = Array.isArray(filteredPersonData.email_addresses)
            ? (filteredPersonData.email_addresses[0] as string)
            : undefined;

          if (email && !record?.id?.record_id) {
            for (const wait of [50, 200, 450, 900]) {
              await sleep(wait);
              try {
                const attempts = [
                  { filter: { email_addresses: { contains: email } } },
                  { filter: { email_addresses: { eq: email } } },
                ];
                for (const attempt of attempts) {
                  const { data } = await client.post(
                    `/objects/${peopleSlug}/records/search`,
                    { ...attempt, limit: 1, order: { created_at: 'desc' } }
                  );
                  const rec = extractAttioRecord(data);
                  if (rec?.id?.record_id) {
                    record = rec;
                    break;
                  }
                }
                if (record?.id?.record_id) break;
              } catch {
                // keep retrying
              }
            }
          }

          if (!record?.id?.record_id) {
            throw new EnhancedApiError(
              'Attio createPerson returned an empty/invalid record payload',
              500,
              path,
              'POST',
              {
                httpStatus: 500,
                resourceType: 'people',
                operation: 'create',
              }
            );
          }
        }

        if (
          process.env.E2E_MODE === 'true' ||
          process.env.NODE_ENV === 'test'
        ) {
          debug('MockService', 'Normalized person record', {
            hasIdObj: !!(record as any)?.id?.record_id,
            idType: typeof (record as any)?.id,
            keys: Object.keys(record || {}),
          });
        }

        return record;
      } catch (err: any) {
        // Enhance error with HTTP response details when available (helps E2E diagnosis)
        const r = err?.response;
        const status = r?.status || err?.status || 500;
        const data = r?.data;
        const url = r?.config?.url;
        const method = r?.config?.method;
        const payload = r?.config?.data;
        error('MockService', 'createPerson Direct API error', {
          status,
          url,
          method,
          serverData: data, // <-- this is what we need to see
          requestPayload: payload, // <-- confirm the exact body that axios sent
        });
        const msg =
          status && data
            ? `Attio create person failed (${status}): ${JSON.stringify(data)}`
            : (err?.message as string) || 'createPerson error';
        throw new EnhancedApiError(
          msg,
          status,
          url || path,
          (method || 'POST').toUpperCase(),
          {
            httpStatus: status,
            resourceType: 'people',
            operation: 'create',
            serverData: data,
            originalError: err as Error,
          }
        );
      }
    }

    // Generate valid UUID format for mock IDs (exactly 36 chars)
    const timestamp = Date.now().toString().slice(-12);
    const mockId = `12345678-1234-4000-9000-${timestamp}`;

    return {
      id: {
        record_id: mockId,
        object_id: 'people',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: (personData.name as string) || `Mock Person ${mockId.slice(-4)}`,
        email_addresses: Array.isArray(personData.email_addresses)
          ? (personData.email_addresses as string[]).map((email) => ({
              value: email,
            }))
          : [{ value: `${mockId}@example.com` }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Creates a task record with mock support
   * Maintains Issue #480 compatibility with dual field support
   */
  static async createTask(
    taskData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Use real API if not in mock mode, otherwise use mocks
    if (!shouldUseMockData()) {
      try {
        const { createTask } = await import('../objects/tasks.js');
        const createdTask = await createTask(taskData.content as string, {
          assigneeId: taskData.assigneeId as string,
          dueDate: taskData.dueDate as string,
          recordId: taskData.recordId as string,
        });

        // Convert task object to AttioRecord format if necessary
        if (
          createdTask &&
          typeof createdTask === 'object' &&
          'id' in createdTask
        ) {
          const task = createdTask as any;

          // If it's already an AttioRecord with record_id, ensure flat fields exist and return
          if (task.values && task.id?.record_id) {
            const base: AttioRecord = task as AttioRecord;
            return {
              ...base,
              // Provide flat field compatibility expected by E2E tests
              content:
                (base.values?.content as any)?.[0]?.value || base.content,
              title:
                (base.values?.title as any)?.[0]?.value ||
                (base.values?.content as any)?.[0]?.value ||
                base.title,
              status: (base.values?.status as any)?.[0]?.value || base.status,
              due_date:
                (base.values?.due_date as any)?.[0]?.value ||
                base.due_date ||
                (task.deadline_at
                  ? String(task.deadline_at).split('T')[0]
                  : undefined),
              assignee_id:
                (base.values?.assignee as any)?.[0]?.value || base.assignee_id,
              priority: base.priority || 'medium',
            } as any;
          }

          // If it has task_id, convert to AttioRecord format and add flat fields
          if (task.id?.task_id) {
            const attioRecord: AttioRecord = {
              id: {
                record_id: task.id.task_id, // Use task_id as record_id
                task_id: task.id.task_id,
                object_id: 'tasks',
                workspace_id: task.id.workspace_id || 'test-workspace',
              },
              values: {
                content: task.content || undefined,
                title: task.content || undefined,
                status: task.status || undefined,
                due_date: task.deadline_at
                  ? String(task.deadline_at).split('T')[0]
                  : undefined,
                assignee: task.assignee || undefined,
              },
              created_at: task.created_at,
              updated_at: task.updated_at,
            } as AttioRecord;

            return {
              ...attioRecord,
              // Flat fields for test expectations
              content: task.content,
              title: task.content,
              status: task.status,
              due_date: task.deadline_at
                ? String(task.deadline_at).split('T')[0]
                : undefined,
              assignee_id: task.assignee?.id || task.assignee_id,
              priority: task.priority || 'medium',
            } as any;
          }
        }

        // Fallback cast
        return createdTask as unknown as AttioRecord;
      } catch (error) {
        throw new Error(
          `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Use deterministic ID if record_id is provided (for test compatibility)
    const mockId = taskData.record_id
      ? (taskData.record_id as string)
      : `12345678-1234-4000-a000-${Date.now().toString().slice(-12)}`;
    const taskContent =
      (taskData.content as string) ||
      (taskData.title as string) ||
      `Mock Test Task`;

    // Issue #480 compatible mock task
    try {
      const { logTaskDebug, sanitizePayload } = await import(
        '../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.createTask',
        'Incoming taskData',
        sanitizePayload(taskData as any)
      );
    } catch {}
    const attioRecord: AttioRecord = {
      id: {
        record_id: mockId,
        task_id: mockId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: taskContent,
        title: taskContent, // Issue #480: Dual field support
        status: [{ value: (taskData.status as string) || 'pending' }],
        due_date: taskData.due_date
          ? [{ value: taskData.due_date as string }]
          : undefined,
        assignee: taskData.assigneeId
          ? [{ value: taskData.assigneeId as string }]
          : undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields: Record<string, unknown> = {
      content: taskContent,
      title: taskContent,
      status: (taskData.status as string) || 'pending',
      due_date: taskData.due_date as string,
      assignee_id: taskData.assigneeId as string,
      priority: (taskData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (taskData.assigneeId) {
      (flatFields as any).assignee = {
        id: taskData.assigneeId as string,
        type: 'person',
      };
    }

    // Provide 'assignees' array for E2E expectations
    if (taskData.assigneeId) {
      (flatFields as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(taskData.assigneeId),
        },
      ];
    }

    const result = { ...attioRecord, ...flatFields } as AttioRecord &
      Record<string, unknown>;
    // Emit top-level assignees for E2E expectation
    if (taskData.assigneeId) {
      (result as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(taskData.assigneeId),
        },
      ];
    }
    try {
      const { logTaskDebug, inspectTaskRecordShape } = await import(
        '../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.createTask',
        'Returning mock task',
        inspectTaskRecordShape(result)
      );
    } catch {}
    return result as any;
  }

  /**
   * Updates a task record with mock support
   */
  static async updateTask(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (!shouldUseMockData()) {
      try {
        const { updateTask } = await import('../objects/tasks.js');
        return (await updateTask(taskId, {
          content: updateData.content as string,
          status: updateData.status as string,
          assigneeId: updateData.assigneeId as string,
          dueDate: updateData.dueDate as string,
          recordIds: updateData.recordIds as string[],
        })) as unknown as AttioRecord;
      } catch (error: unknown) {
        // Preserve structured HTTP responses from the real API/mocks
        if (error && typeof error === 'object' && 'status' in error) {
          throw error; // Re-throw structured responses as-is
        }

        // Only wrap non-structured errors
        throw new Error(
          `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Validation for mock environment
    const { isValidId } = await import('../utils/validation.js');
    if (!isValidId(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (updateData.assigneeId && !isValidId(updateData.assigneeId as string)) {
      throw new Error(`Invalid assignee ID: ${updateData.assigneeId}`);
    }

    if (updateData.recordIds && Array.isArray(updateData.recordIds)) {
      for (const recordId of updateData.recordIds) {
        if (!isValidId(recordId as string)) {
          throw new Error(`Record not found: ${recordId}`);
        }
      }
    }

    const taskContent =
      (updateData.content as string) ||
      (updateData.title as string) ||
      `Updated Mock Test Task ${taskId.slice(-4)}`;

    // Issue #480 compatible updated mock task
    const attioRecord: AttioRecord = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480: Preserve task_id
        object_id: 'tasks',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        content: taskContent,
        title: taskContent, // Issue #480: Dual field support
        status: [{ value: (updateData.status as string) || 'updated' }],
        due_date: updateData.due_date
          ? [{ value: updateData.due_date as string }]
          : undefined,
        assignee: updateData.assigneeId
          ? [{ value: updateData.assigneeId as string }]
          : undefined,
      },
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date().toISOString(),
    };

    // Add flat field compatibility for E2E tests (Issue #480)
    const flatFields: Record<string, unknown> = {
      content: taskContent,
      title: taskContent,
      status: (updateData.status as string) || 'updated',
      due_date: updateData.due_date as string,
      assignee_id: updateData.assigneeId as string,
      priority: (updateData.priority as string) || 'medium',
    };

    // Add assignee object format if assignee provided
    if (updateData.assigneeId) {
      (flatFields as any).assignee = {
        id: updateData.assigneeId as string,
        type: 'person',
      };
    }

    // Provide 'assignees' array for E2E expectations on update
    if (updateData.assigneeId) {
      (flatFields as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(updateData.assigneeId),
        },
      ];
    }

    const result = { ...attioRecord, ...flatFields } as AttioRecord &
      Record<string, unknown>;
    // Emit top-level assignees for E2E expectation
    if (updateData.assigneeId) {
      (result as any).assignees = [
        {
          referenced_actor_type: 'workspace-member',
          referenced_actor_id: String(updateData.assigneeId),
        },
      ];
    }
    try {
      const { logTaskDebug, inspectTaskRecordShape } = await import(
        '../utils/task-debug.js'
      );
      logTaskDebug(
        'mock.updateTask',
        'Returning updated mock task',
        inspectTaskRecordShape(result)
      );
    } catch {}
    return result as any;
  }

  /**
   * Creates a note with mock support following Attio API contract
   */
  static async createNote(noteData: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any> {
    // Validate required parameters
    if (
      !noteData.resource_type ||
      !noteData.record_id ||
      !noteData.title ||
      !noteData.content
    ) {
      throw new Error('missing required parameter');
    }

    // Extract UUID from record_id (handles URIs and raw UUIDs)
    const extractedRecordId = extractRecordId(noteData.record_id);
    if (!extractedRecordId) {
      throw new Error('record not found');
    }

    // Check for invalid IDs following test patterns
    if (
      extractedRecordId === '00000000-0000-0000-0000-000000000000' ||
      extractedRecordId.includes('invalid') ||
      extractedRecordId === 'invalid-company-id-12345' ||
      extractedRecordId === 'invalid-person-id-54321'
    ) {
      throw new Error('record not found');
    }

    // Generate mock note response following Attio API format
    const timestamp = Date.now();
    const baseNote = {
      id: {
        workspace_id: 'ws_mock',
        note_id: `note_${timestamp}`,
        record_id: extractedRecordId,
      },
      parent_object: noteData.resource_type,
      parent_record_id: extractedRecordId,
      title: noteData.title,
      content: noteData.content,
      content_markdown:
        noteData.format === 'markdown' || noteData.format === 'html'
          ? noteData.content
          : null,
      content_plaintext:
        noteData.format === 'plaintext' ? noteData.content : null,
      format: noteData.format || 'plaintext',
      tags: [],
      created_at: new Date().toISOString(),
    };

    // Apply E2E markers for test data cleanup
    const markedNote = applyE2EMarkers(baseNote);

    return markedNote;
  }

  /**
   * Lists notes with mock support
   */
  static async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<any[]> {
    // Return empty array for mock mode (tests focus on creation)
    return [];
  }

  /**
   * Checks if mock data should be used based on environment
   */
  static isUsingMockData(): boolean {
    return shouldUseMockData();
  }
}

export default MockService;
