/**
 * Company Mock Factory
 *
 * Generates mock AttioRecord data for company resources.
 *
 * This factory creates realistic company mock data matching the Attio API
 * response format with proper AttioValue wrappers and nested structure.
 */

import type { AttioValue } from '../../../src/types/attio.js';
import { TestEnvironment } from './test-environment.js';
import type { MockFactory } from './TaskMockFactory.js';
import { UUIDMockGenerator } from './uuid-mock-generator.js';

/**
 * Interface for mock company factory options
 */
export interface MockCompanyOptions {
  name?: string;
  domain?: string;
  website?: string;
  industry?: string;
  description?: string;
  annual_revenue?: string | number;
  employee_count?: string | number;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
  // Additional fields that might be present
  [key: string]: unknown;
}

/**
 * CompanyMockFactory - Generates mock AttioRecord data for companies
 *
 * Creates mock company data that matches the Attio API response format
 * with proper AttioValue wrappers and realistic business data.
 *
 * @example
 * ```typescript
 * // Basic company
 * const company = CompanyMockFactory.create();
 *
 * // Tech company with custom data
 * const techCompany = CompanyMockFactory.create({
 *   name: 'Acme Software',
 *   industry: 'Technology',
 *   annual_revenue: 5000000
 * });
 *
 * // Multiple companies
 * const companies = CompanyMockFactory.createMultiple(5);
 * ```
 */
// Local test-friendly record type accepting AttioValue[] wrappers
export interface TestAttioRecord {
  id: { record_id: string; [key: string]: unknown };
  values: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export class CompanyMockFactory implements MockFactory<TestAttioRecord> {
  /**
   * Generates a unique mock company ID in UUID format
   *
   * Uses deterministic UUID generation for consistent performance testing
   * while satisfying UUID validation requirements (addresses PR #483).
   */
  static generateMockId(): string {
    // Use random UUID generation for unique IDs
    return UUIDMockGenerator.generateCompanyUUID();
  }

  /**
   * Creates a mock company AttioRecord with realistic data
   *
   * @param overrides - Optional overrides for specific fields
   * @returns Mock AttioRecord for company matching API response format
   */
  static create(overrides: MockCompanyOptions = {}): TestAttioRecord {
    const companyId = this.generateMockId();
    const now = new Date().toISOString();
    const companyNumber = this.extractNumberFromId(companyId);

    // Generate realistic company data
    const companyName = overrides.name || `Mock Company ${companyNumber}`;
    const domain =
      overrides.domain || `mock-company-${companyNumber}.example.com`;

    const baseCompany: TestAttioRecord = {
      id: {
        record_id: companyId,
        object_id: 'companies',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        name: this.wrapValue(companyName),
        domains: this.wrapValue(domain), // Note: API uses 'domains' not 'website'
        industry: this.wrapValue(
          overrides.industry || this.getRandomIndustry()
        ),
        description: this.wrapValue(
          overrides.description ||
            `Mock company created for testing purposes - ${companyNumber}`
        ),
      },
      created_at: overrides.created_at || now,
      updated_at: overrides.updated_at || now,
    };

    // Add optional fields with proper AttioValue wrapping
    if (overrides.annual_revenue !== undefined) {
      baseCompany.values.annual_revenue = this.wrapValue(
        String(overrides.annual_revenue)
      );
    } else {
      baseCompany.values.annual_revenue = this.wrapValue(
        String(Math.floor(Math.random() * 10000000) + 1000000)
      );
    }

    if (overrides.employee_count !== undefined) {
      baseCompany.values.employee_count = this.wrapValue(
        String(overrides.employee_count)
      );
    } else {
      baseCompany.values.employee_count = this.wrapValue(
        String(Math.floor(Math.random() * 1000) + 10)
      );
    }

    if (overrides.categories && Array.isArray(overrides.categories)) {
      baseCompany.values.categories = overrides.categories.map((cat) =>
        this.wrapValue(cat)
      );
    }

    // Add any additional overrides
    Object.entries(overrides).forEach(([key, value]) => {
      if (
        ![
          'name',
          'domain',
          'website',
          'industry',
          'description',
          'annual_revenue',
          'employee_count',
          'categories',
          'created_at',
          'updated_at',
        ].includes(key)
      ) {
        baseCompany.values[key] = this.wrapValue(value);
      }
    });

    TestEnvironment.log(`Created mock company: ${companyId}`, {
      name: companyName,
      domain,
      industry: baseCompany.values.industry,
    });

    return baseCompany;
  }

  /**
   * Creates multiple mock companies
   *
   * @param count - Number of companies to create
   * @param overrides - Optional overrides applied to all companies
   * @returns Array of mock AttioRecord objects for companies
   */
  static createMultiple(
    count: number,
    overrides: MockCompanyOptions = {}
  ): TestAttioRecord[] {
    return Array.from({ length: count }, (_, index) => {
      const companyNumber = index + 1;
      return this.create({
        ...overrides,
        name: overrides.name || `Mock Company ${companyNumber}`,
        domain: overrides.domain || `mock-company-${companyNumber}.example.com`,
      });
    });
  }

  /**
   * Creates a technology company mock
   */
  static createTechnology(overrides: MockCompanyOptions = {}): TestAttioRecord {
    return this.create({
      ...overrides,
      industry: 'Technology',
      categories: ['Software', 'SaaS', 'B2B'],
      annual_revenue:
        overrides.annual_revenue ||
        Math.floor(Math.random() * 50000000) + 5000000,
      employee_count:
        overrides.employee_count || Math.floor(Math.random() * 500) + 50,
    });
  }

  /**
   * Creates a finance company mock
   */
  static createFinance(overrides: MockCompanyOptions = {}): TestAttioRecord {
    return this.create({
      ...overrides,
      industry: 'Financial Services',
      categories: ['Banking', 'Finance', 'B2B'],
      annual_revenue:
        overrides.annual_revenue ||
        Math.floor(Math.random() * 100000000) + 10000000,
      employee_count:
        overrides.employee_count || Math.floor(Math.random() * 1000) + 100,
    });
  }

  /**
   * Creates a healthcare company mock
   */
  static createHealthcare(overrides: MockCompanyOptions = {}): TestAttioRecord {
    return this.create({
      ...overrides,
      industry: 'Healthcare',
      categories: ['Healthcare', 'Medical'],
      annual_revenue:
        overrides.annual_revenue ||
        Math.floor(Math.random() * 25000000) + 5000000,
      employee_count:
        overrides.employee_count || Math.floor(Math.random() * 300) + 50,
    });
  }

  /**
   * Creates a manufacturing company mock
   */
  static createManufacturing(
    overrides: MockCompanyOptions = {}
  ): TestAttioRecord {
    return this.create({
      ...overrides,
      industry: 'Manufacturing',
      categories: ['Manufacturing', 'Industrial'],
      annual_revenue:
        overrides.annual_revenue ||
        Math.floor(Math.random() * 75000000) + 10000000,
      employee_count:
        overrides.employee_count || Math.floor(Math.random() * 2000) + 200,
    });
  }

  /**
   * Implementation of MockFactory interface
   */
  create(overrides: MockCompanyOptions = {}): TestAttioRecord {
    return CompanyMockFactory.create(overrides);
  }

  createMultiple(
    count: number,
    overrides: MockCompanyOptions = {}
  ): TestAttioRecord[] {
    return CompanyMockFactory.createMultiple(count, overrides);
  }

  generateMockId(): string {
    return CompanyMockFactory.generateMockId();
  }

  /**
   * Private helper to wrap values in AttioValue format
   */
  private static wrapValue<T>(
    value: T
  ): T extends string ? AttioValue<string>[] : T {
    if (typeof value === 'string') {
      return [{ value }] as T extends string ? AttioValue<string>[] : T;
    }
    return value as T extends string ? AttioValue<string>[] : T;
  }

  /**
   * Private helper to extract number from generated ID
   */
  private static extractNumberFromId(id: string): string {
    const match = id.match(/(\d+)/);
    return match
      ? match[1].slice(-4)
      : Math.floor(Math.random() * 9999).toString();
  }

  /**
   * Private helper to get random industry
   */
  private static getRandomIndustry(): string {
    const industries = [
      'Technology',
      'Financial Services',
      'Healthcare',
      'Manufacturing',
      'Retail',
      'Education',
      'Real Estate',
      'Transportation',
      'Energy',
      'Media & Entertainment',
    ];
    return industries[Math.floor(Math.random() * industries.length)];
  }
}

/**
 * Convenience export for direct usage
 */
export default CompanyMockFactory;
