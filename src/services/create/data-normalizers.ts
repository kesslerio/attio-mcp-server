/**
 * Data Normalization Utilities
 *
 * Pure data transformation functions extracted from AttioCreateService
 * for better separation of concerns and reusability.
 *
 * These functions handle:
 * - Company domain normalization
 * - Person name and email normalization
 * - Task format conversion
 * - Email schema transformations
 */

import type { AttioRecord } from '../../types/attio.js';

/**
 * Normalizes company input data, particularly domain handling
 *
 * Converts single domain to domains array, handles domain objects with .value property
 *
 * @param input - Raw company input data
 * @returns Normalized company data with domains as string array
 *
 * @example
 * ```typescript
 * // Input: { name: "Corp", domain: "corp.com" }
 * // Output: { name: "Corp", domains: ["corp.com"] }
 *
 * // Input: { name: "Corp", domains: [{value: "corp.com"}, {value: "corp.io"}] }
 * // Output: { name: "Corp", domains: ["corp.com", "corp.io"] }
 * ```
 */
export function normalizeCompanyValues(
  input: Record<string, unknown>
): Record<string, unknown> {
  const normalizedCompany: Record<string, unknown> = { ...input };
  const rawDomain = input.domain as string | undefined;
  const rawDomains = input.domains as unknown;
  const rawWebsite = input.website as string | undefined;

  if (rawDomains) {
    if (Array.isArray(rawDomains)) {
      normalizedCompany.domains = rawDomains.map((d: unknown) =>
        typeof d === 'string'
          ? d
          : ((d as Record<string, unknown>)?.domain ??
            (d as Record<string, unknown>)?.value ??
            String(d))
      );
    } else {
      normalizedCompany.domains = [
        typeof rawDomains === 'string'
          ? rawDomains
          : ((rawDomains as Record<string, unknown>)?.domain ??
            (rawDomains as Record<string, unknown>)?.value ??
            String(rawDomains)),
      ];
    }
  } else if (rawDomain) {
    normalizedCompany.domains = [String(rawDomain)];
    delete normalizedCompany.domain;
  }

  // If website is provided, derive domain from URL and merge into domains array.
  // Then remove website to avoid unsupported attribute errors in Attio API.
  if (rawWebsite && typeof rawWebsite === 'string') {
    try {
      const url = new URL(
        rawWebsite.includes('://') ? rawWebsite : `https://${rawWebsite}`
      );
      let host = url.hostname.toLowerCase();
      if (host.startsWith('www.')) host = host.slice(4);
      const domains: string[] = Array.isArray(normalizedCompany.domains)
        ? (normalizedCompany.domains as string[])
        : [];
      if (host && !domains.includes(host)) {
        domains.push(host);
        normalizedCompany.domains = domains;
      }
    } catch {
      // Ignore invalid URL formats; simply drop website
    }
    delete normalizedCompany.website;
  }

  return normalizedCompany;
}

/**
 * Normalizes person input data, particularly name and email handling
 *
 * Handles various name formats and converts to Attio's expected structure.
 * Normalizes emails to string arrays and ensures required fields exist.
 *
 * @param input - Raw person input data
 * @returns Normalized person data with proper name and email structures
 *
 * @example
 * ```typescript
 * // String name and email
 * const person = normalizePersonValues({
 *   name: "John Doe",
 *   email: "john@example.com"
 * });
 *
 * // Multiple emails
 * const person = normalizePersonValues({
 *   name: "Jane Smith",
 *   email_addresses: ["jane@company.com", "jane.smith@company.com"]
 * });
 *
 * // Complex name object
 * const person = normalizePersonValues({
 *   name: { first_name: "Bob", last_name: "Wilson" },
 *   email: "bob@example.com",
 *   job_title: "Senior Engineer"
 * });
 * ```
 */
export function normalizePersonValues(
  input: Record<string, unknown>
): Record<string, unknown> {
  const filteredPersonData: Record<string, unknown> = {};

  // 1) Name normalization: array of personal-name objects
  const rawName = input.name;
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
      if ('first_name' in obj || 'last_name' in obj || 'full_name' in obj) {
        filteredPersonData.name = [obj];
      }
    }
  }

  // 2) Emails: Attio create accepts string array; prefer plain strings
  const rawEmails = input.email_addresses;
  if (Array.isArray(rawEmails) && rawEmails.length) {
    const normalized = rawEmails.map((e: unknown) =>
      e && typeof e === 'object' && e !== null && 'email_address' in e
        ? String((e as Record<string, unknown>).email_address)
        : String(e)
    );
    filteredPersonData.email_addresses = normalized;
  } else if (typeof input.email === 'string') {
    filteredPersonData.email_addresses = [String(input.email)];
  } else if (typeof rawEmails === 'string' && rawEmails) {
    // Handle case where email_addresses is a single string
    filteredPersonData.email_addresses = [String(rawEmails)];
  }

  // Ensure required fields exist
  if (
    !filteredPersonData.email_addresses ||
    !Array.isArray(filteredPersonData.email_addresses) ||
    filteredPersonData.email_addresses.length === 0
  ) {
    throw new Error('missing required parameter: email_addresses');
  }

  if (!filteredPersonData.name) {
    // Derive a safe name from email local part
    const emailAddresses = filteredPersonData.email_addresses as string[];
    const firstEmail = emailAddresses[0] || '';
    const local =
      typeof firstEmail === 'string' ? firstEmail.split('@')[0] : 'Test Person';
    const parts = local
      .replace(/[^a-zA-Z]+/g, ' ')
      .trim()
      .split(/\s+/);
    const first = parts[0] || 'Test';
    const last = parts.slice(1).join(' ') || 'User';
    filteredPersonData.name = [
      {
        first_name: first,
        last_name: last,
        full_name: `${first} ${last}`,
      },
    ];
  }

  // 3) Optional professional info
  if (typeof input.title === 'string') {
    filteredPersonData.title = input.title;
  }
  if (typeof input.job_title === 'string') {
    filteredPersonData.job_title = input.job_title;
  }
  if (typeof input.description === 'string') {
    filteredPersonData.description = input.description;
  }

  return filteredPersonData;
}

/**
 * Converts task format to AttioRecord format
 *
 * Handles conversion between different task representations and ensures
 * compatibility with E2E tests that expect both nested values and flat fields.
 *
 * @param createdTask - Task data in various formats
 * @param originalInput - Original input data for context
 * @returns AttioRecord with both nested values and flat field compatibility
 */
export function convertTaskToAttioRecord(
  createdTask: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _originalInput: Record<string, unknown>
): AttioRecord {
  // Handle conversion from AttioTask to AttioRecord format
  if (createdTask && typeof createdTask === 'object' && 'id' in createdTask) {
    const task = createdTask as Record<string, unknown>;

    // If it's already an AttioRecord with record_id, ensure flat fields exist and return
    if (task.values && (task.id as Record<string, unknown>)?.record_id) {
      const base: AttioRecord = task as AttioRecord;
      return {
        ...base,
        // Provide flat field compatibility expected by E2E tests
        content:
          (base.values?.content as unknown as Record<string, unknown>[])?.[0]
            ?.value || base.content,
        title:
          (base.values?.title as unknown as Record<string, unknown>[])?.[0]
            ?.value ||
          (base.values?.content as unknown as Record<string, unknown>[])?.[0]
            ?.value ||
          base.title,
        status:
          (base.values?.status as unknown as Record<string, unknown>[])?.[0]
            ?.value || base.status,
        due_date:
          (base.values?.due_date as unknown as Record<string, unknown>[])?.[0]
            ?.value ||
          base.due_date ||
          (task.deadline_at
            ? String(task.deadline_at).split('T')[0]
            : undefined),
        assignee_id:
          (base.values?.assignee as unknown as Record<string, unknown>[])?.[0]
            ?.value || base.assignee_id,
        priority: base.priority || 'medium',
      } as unknown as AttioRecord;
    }

    // If it has task_id, convert to AttioRecord format
    if ((task.id as Record<string, unknown>)?.task_id) {
      const attioRecord: AttioRecord = {
        id: {
          record_id: (task.id as Record<string, unknown>).task_id as string,
          task_id: (task.id as Record<string, unknown>).task_id as string,
          object_id: 'tasks',
          workspace_id:
            ((task.id as Record<string, unknown>).workspace_id as string) ||
            'test-workspace',
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
        content: task.content,
        title: task.content,
        status: task.status,
        due_date: task.deadline_at
          ? String(task.deadline_at).split('T')[0]
          : undefined,
        assignee_id:
          ((task.assignee as Record<string, unknown>)?.id as string) ||
          (task.assignee_id as string),
        priority: task.priority || 'medium',
      } as unknown as AttioRecord;
    }
  }

  return createdTask as AttioRecord;
}

/**
 * Normalizes email addresses for different API schema requirements
 *
 * Converts between string array format and object format with email_address property.
 * Used by retry mechanisms when the API expects different email schemas.
 *
 * @param emailAddresses - Array of emails in various formats
 * @returns Object format with email_address property
 */
export function normalizeEmailsToObjectFormat(
  emailAddresses: unknown[]
): Record<string, string>[] {
  return emailAddresses.map((e: unknown) => ({
    email_address: String(e),
  }));
}

/**
 * Normalizes email addresses from object format to string format
 *
 * Extracts email addresses from object format to plain string array.
 *
 * @param emailAddresses - Array of email objects
 * @returns String array of email addresses
 */
export function normalizeEmailsToStringFormat(
  emailAddresses: unknown[]
): string[] {
  return emailAddresses.map((e: unknown) =>
    e && typeof e === 'object' && e !== null && 'email_address' in e
      ? String((e as Record<string, unknown>).email_address)
      : String(e)
  );
}
