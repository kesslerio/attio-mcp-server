/**
 * AttioCreateService - Real API implementation
 *
 * Pure real API implementation with no environment checks.
 * Uses getAttioClient with rawE2E option for consistent API communication.
 */

import { debug, error as logError } from '../../utils/logger.js';
import { EnhancedApiError } from '../../errors/enhanced-api-errors.js';
import { extractRecordId } from '../../utils/validation/uuid-validation.js';
import { getAttioClient } from '../../api/attio-client.js';
import type { AttioRecord } from '../../types/attio.js';
import type { CreateService } from './types.js';

/**
 * Real API implementation of CreateService
 */
export class AttioCreateService implements CreateService {
  async createCompany(input: Record<string, unknown>): Promise<AttioRecord> {

    // Normalize company domains to string array

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

      debug('AttioCreateService', 'Company API response', {
        status: response?.status,
        statusText: response?.statusText,
        hasData: !!response?.data,
        hasNestedData: !!response?.data?.data,
        dataKeys: response?.data ? Object.keys(response.data) : [],
      });

      let record = extractAttioRecord(response);

      // Handle empty response with recovery attempt
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

  async createPerson(input: Record<string, unknown>): Promise<AttioRecord> {

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
    // Use real API calls for notes
    const { createNote, normalizeNoteResponse } = await import('../../objects/notes.js');
    
      parent_object: input.resource_type,
      parent_record_id: input.record_id,
      title: input.title,
      content: input.content,
      format: (input.format as 'markdown' | 'plaintext') || 'plaintext',
    };

    return normalizeNoteResponse(response.data);
  }

  async listNotes(params: {
    resource_type?: string;
    record_id?: string;
  }): Promise<unknown[]> {
    // Use real API calls for notes listing
    const { listNotes } = await import('../../objects/notes.js');
    
      parent_object: params.resource_type,
      parent_record_id: params.record_id,
    };

    return response.data || [];
  }

  // Private helper methods

  private normalizeCompanyValues(
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const normalizedCompany: Record<string, unknown> = { ...input };

    if (rawDomains) {
      if (Array.isArray(rawDomains)) {
        (normalizedCompany as any).domains = rawDomains.map((d: unknown) =>
          typeof d === 'string' ? d : (d?.domain ?? d?.value ?? String(d))
        );
      } else {
        (normalizedCompany as any).domains = [
          typeof rawDomains === 'string'
            ? rawDomains
            : ((rawDomains as any)?.domain ??
              (rawDomains as any)?.value ??
              String(rawDomains)),
        ];
      }
    } else if (rawDomain) {
      (normalizedCompany as any).domains = [String(rawDomain)];
      delete (normalizedCompany as any).domain;
    }

    return normalizedCompany;
  }

  private normalizePersonValues(
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const filteredPersonData: Record<string, unknown> = {};

    // 1) Name normalization: array of personal-name objects
    if (rawName) {
      if (typeof rawName === 'string') {
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
        if ('first_name' in obj || 'last_name' in obj || 'full_name' in obj) {
          filteredPersonData.name = [obj];
        }
      }
    }

    // 2) Emails: Attio create accepts string array; prefer plain strings
    if (Array.isArray(rawEmails) && rawEmails.length) {
        e && typeof e === 'object' && 'email_address' in e
          ? String(e.email_address)
          : String(e)
      );
      filteredPersonData.email_addresses = normalized;
    } else if (typeof (input as any).email === 'string') {
      filteredPersonData.email_addresses = [String((input as any).email)];
    }

    // Ensure required fields exist
    if (
      !filteredPersonData.email_addresses ||
      !(filteredPersonData as any).email_addresses.length
    ) {
      throw new Error('missing required parameter: email_addresses');
    }

    if (!filteredPersonData.name) {
      // Derive a safe name from email local part
        .email_address as string;
        typeof firstEmail === 'string'
          ? firstEmail.split('@')[0]
          : 'Test Person';
        .replace(/[^a-zA-Z]+/g, ' ')
        .trim()
        .split(/\s+/);
      (filteredPersonData as any).name = [
        {
          first_name: first,
          last_name: last,
          full_name: `${first} ${last}`,
        },
      ];
    }

    // 3) Optional professional info
    if (typeof (input as any).title === 'string') {
      filteredPersonData.title = (input as any).title;
    }
    if (typeof (input as any).job_title === 'string') {
      filteredPersonData.job_title = (input as any).job_title;
    }
    if (typeof (input as any).description === 'string') {
      filteredPersonData.description = (input as any).description;
    }

    return filteredPersonData;
  }

  private async createPersonWithRetry(
    client: unknown,
    filteredPersonData: Record<string, unknown>
  ) {
      client.post('/objects/people/records', { data: { values } });

    try {
      // Attempt #1
      return await doCreate(filteredPersonData);
    } catch (firstErr: unknown) {
      // Only retry on 400 with alternate email schema
      if (status === 400) {
        const alt: Record<string, unknown> = { ...filteredPersonData };
        if (emails && emails.length) {
          if (typeof emails[0] === 'string') {
            (alt as any).email_addresses = emails.map((e: unknown) => ({
              email_address: String(e),
            }));
          } else if (
            emails[0] &&
            typeof emails[0] === 'object' &&
            'email_address' in emails[0]
          ) {
            (alt as any).email_addresses = emails.map((e: unknown) =>
              String(e.email_address)
            );
          }
          return await doCreate(alt);
        }
      }
      throw firstErr;
    }
  }

  private async recoverCompanyRecord(
    client: unknown,
    normalizedCompany: Record<string, unknown>
  ) {
    // Recovery: try to find the created company by unique fields
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
        if (rec?.id?.record_id) return rec;
      }

      if (name) {
        const { data: searchByName } = await client.post(
          '/objects/companies/records/search',
          {
            filter: { name: { eq: name } },
            limit: 1,
            order: { created_at: 'desc' },
          }
        );
        if (rec?.id?.record_id) return rec;
      }
    } catch (e) {
      debug('AttioCreateService', 'Company recovery failed', {
        message: (e as any)?.message,
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
    client: unknown,
    filteredPersonData: Record<string, unknown>
  ) {
    // Recovery: try to find the created person by primary email
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
        if (rec?.id?.record_id) return rec;
      }
    } catch (e) {
      debug('AttioCreateService', 'Person recovery failed', {
        message: (e as any)?.message,
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
    createdTask: unknown,
    originalInput: Record<string, unknown>
  ): AttioRecord {
    // Handle conversion from AttioTask to AttioRecord format
    if (createdTask && typeof createdTask === 'object' && 'id' in createdTask) {

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

    logError('AttioCreateService', `${operation} Direct API error`, {
      status,
      data,
    });

      status && data
        ? `Attio ${operation} failed (${status}): ${JSON.stringify(data)}`
        : (anyErr?.message as string) || `${operation} error`;

    return new EnhancedApiError(msg, status, endpoint, 'POST', {
      httpStatus: status,
      resourceType,
      operation,
      originalError: anyErr,
    });
  }
}
