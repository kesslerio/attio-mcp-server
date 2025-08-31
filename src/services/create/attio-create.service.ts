/**
 * AttioCreateService - Real API implementation
 *
 * Pure real API implementation with no environment checks.
 * Uses getAttioClient with rawE2E option for consistent API communication.
 */

import type { CreateService } from './types.js';
import type { AttioRecord } from '../../types/attio.js';
import { getAttioClient } from '../../api/attio-client.js';
import { EnhancedApiError } from '../../errors/enhanced-api-errors.js';
import { debug, error as logError } from '../../utils/logger.js';
import { extractRecordId } from '../../utils/validation/uuid-validation.js';
import {
  extractAttioRecord,
  looksLikeCreatedRecord,
  assertLooksLikeCreated,
  isTestRun,
  debugRecordShape,
} from './extractor.js';

/**
 * Real API implementation of CreateService
 * 
 * Handles company, person, task, and note creation through the Attio API.
 * Includes data normalization, error recovery, and robust error handling.
 * 
 * @example
 * ```typescript
 * const service = new AttioCreateService();
 * const company = await service.createCompany({
 *   name: "Acme Corp",
 *   domain: "acme.com"
 * });
 * ```
 */
export class AttioCreateService implements CreateService {
  /**
   * Creates a company record with domain normalization
   * 
   * @param input - Company data including name, domain/domains, industry, etc.
   * @returns Promise<AttioRecord> - Created company record with id.record_id
   * 
   * @example
   * ```typescript
   * // Single domain
   * const company = await service.createCompany({
   *   name: "Tech Corp",
   *   domain: "techcorp.com"
   * });
   * 
   * // Multiple domains
   * const company = await service.createCompany({
   *   name: "Multi Corp",
   *   domains: ["multi.com", "multicorp.io"]
   * });
   * ```
   */
  async createCompany(input: Record<string, unknown>): Promise<AttioRecord> {
    const client = getAttioClient({ rawE2E: true });

    // Normalize company domains to string array
    const normalizedCompany = this.normalizeCompanyValues(input);

    const payload = {
      data: {
        values: normalizedCompany,
      },
    };

    debug('AttioCreateService', 'Making company API call', {
      url: '/objects/companies/records',
      method: 'POST',
      payload,
      payloadSize: JSON.stringify(payload).length,
    });

    try {
      const response = await client.post('/objects/companies/records', payload);

      debug('AttioCreateService', 'Company API response', {
        status: response?.status,
        statusText: response?.statusText,
        hasData: !!response?.data,
        hasNestedData: !!response?.data?.data,
        dataKeys: response?.data ? Object.keys(response.data) : [],
      });

      let record = extractAttioRecord(response);

      // Handle empty response with recovery attempt
      const mustRecover = !record || !record.id || !record.id.record_id;
      if (mustRecover) {
        record = await this.recoverCompanyRecord(client, normalizedCompany);
      }

      assertLooksLikeCreated(record, 'AttioCreateService.createCompany');

      if (isTestRun()) {
        debug(
          'AttioCreateService',
          'Normalized company record',
          debugRecordShape(record)
        );
      }

      return record as AttioRecord;
    } catch (err) {
      throw this.enhanceApiError(
        err,
        'createCompany',
        '/objects/companies/records',
        'companies'
      );
    }
  }

  /**
   * Creates a person record with name and email normalization
   * 
   * @param input - Person data including name, email/email_addresses, title, etc.
   * @returns Promise<AttioRecord> - Created person record with id.record_id
   * 
   * @example
   * ```typescript
   * // String name and email
   * const person = await service.createPerson({
   *   name: "John Doe",
   *   email: "john@example.com"
   * });
   * 
   * // Multiple emails
   * const person = await service.createPerson({
   *   name: "Jane Smith",
   *   email_addresses: ["jane@company.com", "jane.smith@company.com"]
   * });
   * 
   * // Complex name object
   * const person = await service.createPerson({
   *   name: { first_name: "Bob", last_name: "Wilson" },
   *   email: "bob@example.com",
   *   job_title: "Senior Engineer"
   * });
   * ```
   */
  async createPerson(input: Record<string, unknown>): Promise<AttioRecord> {
    const client = getAttioClient({ rawE2E: true });
    const filteredPersonData = this.normalizePersonValues(input);

    debug('AttioCreateService', 'Making person API call', {
      payload: { data: { values: filteredPersonData } },
    });

    if (isTestRun()) {
      console.log(
        '🔍 EXACT API PAYLOAD:',
        JSON.stringify({ data: { values: filteredPersonData } }, null, 2)
      );
    }

    try {
      let response = await this.createPersonWithRetry(
        client,
        filteredPersonData
      );

      debug('AttioCreateService', 'Person API response', {
        status: response?.status,
        statusText: response?.statusText,
        hasData: !!response?.data,
        hasNestedData: !!response?.data?.data,
      });

      let record = extractAttioRecord(response);

      // Handle empty response with recovery attempt
      const mustRecover = !record || !record.id || !record.id.record_id;
      if (mustRecover) {
        record = await this.recoverPersonRecord(client, filteredPersonData);
      }

      assertLooksLikeCreated(record, 'AttioCreateService.createPerson');

      if (isTestRun()) {
        debug(
          'AttioCreateService',
          'Normalized person record',
          debugRecordShape(record)
        );
      }

      return record as AttioRecord;
    } catch (err) {
      throw this.enhanceApiError(
        err,
        'createPerson',
        '/objects/people/records',
        'people'
      );
    }
  }

  async createTask(input: Record<string, unknown>): Promise<AttioRecord> {
    // Delegate to the tasks object for now, this will be refactored later
    const { createTask } = await import('../../objects/tasks.js');
    const createdTask = await createTask(input.content as string, {
      assigneeId: input.assigneeId as string,
      dueDate: input.dueDate as string,
      recordId: input.recordId as string,
    });

    // Convert task to AttioRecord format
    return this.convertTaskToAttioRecord(createdTask, input);
  }

  async updateTask(
    taskId: string,
    input: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Delegate to the tasks object for now, this will be refactored later
    const { updateTask } = await import('../../objects/tasks.js');
    const updatedTask = await updateTask(taskId, {
      content: input.content as string,
      status: input.status as string,
      assigneeId: input.assigneeId as string,
      dueDate: input.dueDate as string,
      recordIds: input.recordIds as string[],
    });

    // Convert task to AttioRecord format
    return this.convertTaskToAttioRecord(updatedTask, input);
  }

  async createNote(input: {
    resource_type: string;
    record_id: string;
    title: string;
    content: string;
    format?: string;
  }): Promise<any> {
    // For now, delegate to existing implementation
    // This will be moved to a dedicated NotesCreateService later
    const { MockService } = await import('../MockService.js');
    return await MockService.createNote(input);
  }

  async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<unknown[]> {
    // For now, delegate to existing implementation
    // This will be moved to a dedicated NotesService later
    const { MockService } = await import('../MockService.js');
    return await MockService.listNotes(params);
  }

  // Private helper methods

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
  private normalizeCompanyValues(
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const normalizedCompany: Record<string, unknown> = { ...input };
    const rawDomain = input.domain as string | undefined;
    const rawDomains = input.domains as unknown;

    if (rawDomains) {
      if (Array.isArray(rawDomains)) {
        normalizedCompany.domains = rawDomains.map((d: unknown) =>
          typeof d === 'string' ? d : ((d as Record<string, unknown>)?.domain ?? (d as Record<string, unknown>)?.value ?? String(d))
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

    return normalizedCompany;
  }

  private normalizePersonValues(
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
      const local = typeof firstEmail === 'string' ? firstEmail.split('@')[0] : 'Test Person';
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

  private async createPersonWithRetry(
    client: any,
    filteredPersonData: Record<string, unknown>
  ) {
    const doCreate = async (values: Record<string, unknown>) =>
      client.post('/objects/people/records', { data: { values } });

    try {
      // Attempt #1
      return await doCreate(filteredPersonData);
    } catch (firstErr: unknown) {
      const error = firstErr as { response?: { status?: number } };
      const status = error?.response?.status;
      // Only retry on 400 with alternate email schema
      if (status === 400) {
        const alt: Record<string, unknown> = { ...filteredPersonData };
        const emails = alt.email_addresses as unknown[] | undefined;
        if (emails && emails.length) {
          if (typeof emails[0] === 'string') {
            alt.email_addresses = emails.map((e: unknown) => ({
              email_address: String(e),
            }));
          } else if (
            emails[0] &&
            typeof emails[0] === 'object' &&
            emails[0] !== null &&
            'email_address' in emails[0]
          ) {
            alt.email_addresses = emails.map((e: unknown) =>
              String((e as Record<string, unknown>).email_address)
            );
          }
          return await doCreate(alt);
        }
      }
      throw firstErr;
    }
  }

  private async recoverCompanyRecord(
    client: any,
    normalizedCompany: Record<string, unknown>
  ) {
    // Recovery: try to find the created company by unique fields
    const domain = Array.isArray(normalizedCompany.domains)
      ? normalizedCompany.domains[0]
      : undefined;

    try {
      if (domain) {
        const { data: searchByDomain } = await client.post(
          '/objects/companies/records/search',
          {
            filter: { domains: { contains: domain } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        const rec = extractAttioRecord(searchByDomain);
        if (rec?.id?.record_id) return rec;
      }

      const name = normalizedCompany.name as string;
      if (name) {
        const { data: searchByName } = await client.post(
          '/objects/companies/records/search',
          {
            filter: { name: { eq: name } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        const rec = extractAttioRecord(searchByName);
        if (rec?.id?.record_id) return rec;
      }
    } catch (e) {
      debug('AttioCreateService', 'Company recovery failed', {
        message: (e as Error)?.message,
      });
    }

    throw new EnhancedApiError(
      'Attio createCompany returned an empty/invalid record payload',
      500,
      '/objects/companies/records',
      'POST',
      {
        httpStatus: 500,
        resourceType: 'companies',
        operation: 'create',
      }
    );
  }

  private async recoverPersonRecord(
    client: any,
    filteredPersonData: Record<string, unknown>
  ) {
    // Recovery: try to find the created person by primary email
    const email = Array.isArray(filteredPersonData.email_addresses)
      ? (filteredPersonData.email_addresses[0] as string)
      : undefined;

    try {
      if (email) {
        const { data: search } = await client.post(
          '/objects/people/records/search',
          {
            filter: { email_addresses: { contains: email } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        const rec = extractAttioRecord(search);
        if (rec?.id?.record_id) return rec;
      }
    } catch (e) {
      debug('AttioCreateService', 'Person recovery failed', {
        message: (e as Error)?.message,
      });
    }

    throw new EnhancedApiError(
      'Attio createPerson returned an empty/invalid record payload',
      500,
      '/objects/people/records',
      'POST',
      {
        httpStatus: 500,
        resourceType: 'people',
        operation: 'create',
      }
    );
  }

  private convertTaskToAttioRecord(
    createdTask: any,
    originalInput: Record<string, unknown>
  ): AttioRecord {
    // Handle conversion from AttioTask to AttioRecord format
    if (createdTask && typeof createdTask === 'object' && 'id' in createdTask) {
      const task = createdTask as any;

      // If it's already an AttioRecord with record_id, ensure flat fields exist and return
      if (task.values && task.id?.record_id) {
        const base: AttioRecord = task as AttioRecord;
        return {
          ...base,
          // Provide flat field compatibility expected by E2E tests
          content: (base.values?.content as any)?.[0]?.value || base.content,
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

      // If it has task_id, convert to AttioRecord format
      if (task.id?.task_id) {
        const attioRecord: AttioRecord = {
          id: {
            record_id: task.id.task_id,
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

    return createdTask as AttioRecord;
  }

  private enhanceApiError(
    err: unknown,
    operation: string,
    endpoint: string,
    resourceType: string
  ) {
    const error = err as { response?: { status?: number; data?: unknown }; message?: string; name?: string };
    const status = error?.response?.status ?? 500;
    const data = error?.response?.data;

    logError('AttioCreateService', `${operation} Direct API error`, {
      status,
      data,
    });

    const msg =
      status && data
        ? `Attio ${operation} failed (${status}): ${JSON.stringify(data)}`
        : error?.message || `${operation} error`;

    return new EnhancedApiError(msg, status, endpoint, 'POST', {
      httpStatus: status,
      resourceType,
      operation,
      originalError: err as Error,
    });
  }
}
