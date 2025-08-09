/**
 * Test data factories for consistent test data generation
 */
import { vi } from 'vitest';

export interface TestCompanyData {
  id?: { record_id: string };
  values?: {
    name?: [{ value: string }];
    industry?: [{ value: string }];
    categories?: [{ value: string }];
    website?: [{ value: string }];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TestPersonData {
  id?: { record_id: string };
  values?: {
    name?: [{ value: string }];
    email_addresses?: [{ value: string }];
    company?: [{ record_id: string }];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TestListData {
  id?: { list_id: string };
  name?: string;
  parent_object?: string;
  [key: string]: unknown;
}

/**
 * Factory for creating test company data
 */
export class CompanyFactory {
  static create(overrides: Partial<TestCompanyData> = {}): TestCompanyData {
    const defaults: TestCompanyData = {
      id: {
        record_id: `company_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      values: {
        name: [{ value: 'Test Company' }],
        industry: [{ value: 'Technology' }],
        categories: [{ value: 'Software' }],
        website: [{ value: 'https://test-company.com' }],
      },
    };

    return this.mergeDeep(defaults, overrides);
  }

  static createMany(
    count: number,
    overrides: Partial<TestCompanyData> = {}
  ): TestCompanyData[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        ...overrides,
        id: { record_id: `company_${Date.now()}_${i}` },
        values: {
          ...overrides.values,
          name: [{ value: `Test Company ${i + 1}` }],
        },
      })
    );
  }

  private static mergeDeep(target: unknown, source: unknown): any {
    const result = { ...target };
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

/**
 * Factory for creating test person data
 */
export class PersonFactory {
  static create(overrides: Partial<TestPersonData> = {}): TestPersonData {
    const defaults: TestPersonData = {
      id: {
        record_id: `person_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      values: {
        name: [{ value: 'Test Person' }],
        email_addresses: [{ value: 'test@example.com' }],
      },
    };

    return this.mergeDeep(defaults, overrides);
  }

  static createMany(
    count: number,
    overrides: Partial<TestPersonData> = {}
  ): TestPersonData[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        ...overrides,
        id: { record_id: `person_${Date.now()}_${i}` },
        values: {
          ...overrides.values,
          name: [{ value: `Test Person ${i + 1}` }],
          email_addresses: [{ value: `test${i + 1}@example.com` }],
        },
      })
    );
  }

  private static mergeDeep(target: unknown, source: unknown): any {
    const result = { ...target };
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

/**
 * Factory for creating test list data
 */
export class ListFactory {
  static create(overrides: Partial<TestListData> = {}): TestListData {
    const defaults: TestListData = {
      id: {
        list_id: `list_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      },
      name: 'Test List',
      parent_object: 'companies',
    };

    return { ...defaults, ...overrides };
  }

  static createMany(
    count: number,
    overrides: Partial<TestListData> = {}
  ): TestListData[] {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        ...overrides,
        id: { list_id: `list_${Date.now()}_${i}` },
        name: `Test List ${i + 1}`,
      })
    );
  }
}

/**
 * Factory for creating mock API responses
 */
export class ApiResponseFactory {
  static createSuccess<T>(data: T, metadata: unknown = {}): { data: { data: T } } {
    return {
      data: {
        data,
        ...metadata,
      },
    };
  }

  static createError(message: string, status: number = 400): Error {
    const error = new Error(message);
    (error as unknown).response = {
      status,
      data: { message },
    };
    return error;
  }

  static createPaginatedResponse<T>(
    data: T[],
    page: number = 1,
    pageSize: number = 20,
    total?: number
  ): { data: { data: T[]; pagination: any } } {
    return {
      data: {
        data,
        pagination: {
          page,
          page_size: pageSize,
          total: total ?? data.length,
          has_more: page * pageSize < (total ?? data.length),
        },
      },
    };
  }
}

/**
 * Mock request factory for MCP tool testing
 */
export class MockRequestFactory {
  static createToolRequest(toolName: string, args: Record<string, unknown> = {}) {
    return {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };
  }

  static createSearchRequest(query: string, filters: unknown = {}) {
    return this.createToolRequest('smart-search-companies', {
      query,
      ...filters,
    });
  }

  static createCreateRequest(objectType: string, attributes: unknown) {
    return this.createToolRequest(`create-${objectType}`, attributes);
  }

  static createUpdateRequest(objectType: string, id: string, attributes: unknown) {
    return this.createToolRequest(`update-${objectType}`, {
      [`${objectType}_id`]: id,
      ...attributes,
    });
  }
}
