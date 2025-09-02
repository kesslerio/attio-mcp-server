/**
 * Person Mock Factory
 *
 * Generates mock AttioRecord data for person resources.
 *
 * This factory creates realistic person mock data matching the Attio API
 * response format with proper email, phone, and company associations.
 */

import type { AttioValue } from '../../../src/types/attio.js';
import { TestEnvironment } from './test-environment.js';
import type { MockFactory } from './TaskMockFactory.js';
import { UUIDMockGenerator } from './uuid-mock-generator.js';

/**
 * Interface for mock person factory options
 */
export interface MockPersonOptions {
  name?: string | { first_name: string; last_name: string };
  email_addresses?: string | string[];
  phone_numbers?: string | string[];
  job_title?: string;
  department?: string;
  seniority?: string;
  company?: string; // Company record ID
  created_at?: string;
  updated_at?: string;
  // Additional fields that might be present
  [key: string]: unknown;
}

/**
 * PersonMockFactory - Generates mock AttioRecord data for people
 *
 * Creates mock person data that matches the Attio API response format
 * with proper AttioValue wrappers and realistic personal/professional data.
 *
 * @example
 * ```typescript
 * // Basic person
 * const person = PersonMockFactory.create();
 *
 * // Executive with custom data
 * const executive = PersonMockFactory.create({
 *   name: 'John Smith',
 *   job_title: 'CEO',
 *   seniority: 'Executive'
 * });
 *
 * // Multiple people
 * const people = PersonMockFactory.createMultiple(5);
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

export class PersonMockFactory implements MockFactory<TestAttioRecord> {
  /**
   * Generates a unique mock person ID in UUID format
   *
   * Uses deterministic UUID generation for consistent performance testing
   * while satisfying UUID validation requirements (addresses PR #483).
   */
  static generateMockId(): string {
    // Use random UUID generation for unique IDs
    return UUIDMockGenerator.generatePersonUUID();
  }

  /**
   * Creates a mock person AttioRecord with realistic data
   *
   * @param overrides - Optional overrides for specific fields
   * @returns Mock AttioRecord for person matching API response format
   */
  static create(overrides: MockPersonOptions = {}): TestAttioRecord {
    const personId = this.generateMockId();
    const now = new Date().toISOString();
    const personNumber = this.extractNumberFromId(personId);

    // Generate realistic person data
    const firstName = this.getRandomFirstName();
    const lastName = this.getRandomLastName();
    const fullName = overrides.name
      ? typeof overrides.name === 'string'
        ? overrides.name
        : `${overrides.name.first_name} ${overrides.name.last_name}`
      : `${firstName} ${lastName}`;

    const email = this.generateEmail(fullName, personNumber);
    const phone = this.generatePhone();

    const basePerson: TestAttioRecord = {
      id: {
        record_id: personId,
        object_id: 'people',
        workspace_id: 'mock-workspace-id',
      },
      values: {
        // Name handling - support both string and structured formats
        name: this.wrapValue(fullName),
        email_addresses: Array.isArray(overrides.email_addresses)
          ? overrides.email_addresses.map((email) => this.wrapValue(email))
          : [this.wrapValue(overrides.email_addresses || email)],
        phone_numbers: Array.isArray(overrides.phone_numbers)
          ? overrides.phone_numbers.map((phone) => this.wrapValue(phone))
          : overrides.phone_numbers
            ? [this.wrapValue(overrides.phone_numbers)]
            : [this.wrapValue(phone)],
      },
      created_at: overrides.created_at || now,
      updated_at: overrides.updated_at || now,
    };

    // Add optional professional fields
    if (overrides.job_title) {
      basePerson.values.job_title = this.wrapValue(overrides.job_title);
    } else {
      basePerson.values.job_title = this.wrapValue(this.getRandomJobTitle());
    }

    if (overrides.department) {
      basePerson.values.department = this.wrapValue(overrides.department);
    }

    if (overrides.seniority) {
      basePerson.values.seniority = this.wrapValue(overrides.seniority);
    } else {
      basePerson.values.seniority = this.wrapValue(this.getRandomSeniority());
    }

    // Company association
    if (overrides.company) {
      basePerson.values.company = this.wrapValue(overrides.company);
    }

    // Add any additional overrides
    Object.entries(overrides).forEach(([key, value]) => {
      if (
        ![
          'name',
          'email_addresses',
          'phone_numbers',
          'job_title',
          'department',
          'seniority',
          'company',
          'created_at',
          'updated_at',
        ].includes(key)
      ) {
        basePerson.values[key] = this.wrapValue(value);
      }
    });

    TestEnvironment.log(`Created mock person: ${personId}`, {
      name: fullName,
      email: (basePerson.values as any).email_addresses?.[0],
      jobTitle: (basePerson.values as any).job_title,
    });

    return basePerson;
  }

  /**
   * Creates multiple mock people
   *
   * @param count - Number of people to create
   * @param overrides - Optional overrides applied to all people
   * @returns Array of mock AttioRecord objects for people
   */
  static createMultiple(
    count: number,
    overrides: MockPersonOptions = {}
  ): TestAttioRecord[] {
    return Array.from({ length: count }, (_, index) => {
      const personNumber = index + 1;
      return this.create({
        ...overrides,
        // Don't override name if explicitly provided
        ...(overrides.name ? {} : {}),
        // Generate unique emails if not provided
        ...(overrides.email_addresses ? {} : {}),
      });
    });
  }

  /**
   * Creates an executive person mock
   */
  static createExecutive(overrides: MockPersonOptions = {}): TestAttioRecord {
    const executiveTitles = [
      'CEO',
      'CTO',
      'CFO',
      'COO',
      'VP of Sales',
      'VP of Marketing',
      'Chief Executive Officer',
    ];
    return this.create({
      ...overrides,
      job_title:
        overrides.job_title ||
        executiveTitles[Math.floor(Math.random() * executiveTitles.length)],
      seniority: 'Executive',
    });
  }

  /**
   * Creates a sales person mock
   */
  static createSalesPerson(overrides: MockPersonOptions = {}): TestAttioRecord {
    const salesTitles = [
      'Account Executive',
      'Sales Representative',
      'Business Development Manager',
      'Sales Manager',
    ];
    return this.create({
      ...overrides,
      job_title:
        overrides.job_title ||
        salesTitles[Math.floor(Math.random() * salesTitles.length)],
      department: 'Sales',
      seniority: overrides.seniority || 'Mid-level',
    });
  }

  /**
   * Creates an engineer mock
   */
  static createEngineer(overrides: MockPersonOptions = {}): TestAttioRecord {
    const engineeringTitles = [
      'Software Engineer',
      'Senior Software Engineer',
      'Principal Engineer',
      'Engineering Manager',
      'DevOps Engineer',
    ];
    return this.create({
      ...overrides,
      job_title:
        overrides.job_title ||
        engineeringTitles[Math.floor(Math.random() * engineeringTitles.length)],
      department: 'Engineering',
      seniority: overrides.seniority || 'Mid-level',
    });
  }

  /**
   * Creates a marketing person mock
   */
  static createMarketingPerson(
    overrides: MockPersonOptions = {}
  ): TestAttioRecord {
    const marketingTitles = [
      'Marketing Manager',
      'Content Marketing Manager',
      'Digital Marketing Specialist',
      'Marketing Director',
    ];
    return this.create({
      ...overrides,
      job_title:
        overrides.job_title ||
        marketingTitles[Math.floor(Math.random() * marketingTitles.length)],
      department: 'Marketing',
      seniority: overrides.seniority || 'Mid-level',
    });
  }

  /**
   * Creates a person with company association
   */
  static createWithCompany(
    companyId: string,
    overrides: MockPersonOptions = {}
  ): TestAttioRecord {
    return this.create({
      ...overrides,
      company: companyId,
    });
  }

  /**
   * Implementation of MockFactory interface
   */
  create(overrides: MockPersonOptions = {}): TestAttioRecord {
    return PersonMockFactory.create(overrides);
  }

  createMultiple(
    count: number,
    overrides: MockPersonOptions = {}
  ): TestAttioRecord[] {
    return PersonMockFactory.createMultiple(count, overrides);
  }

  generateMockId(): string {
    return PersonMockFactory.generateMockId();
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
   * Private helper to generate email from name
   */
  private static generateEmail(name: string, suffix: string): string {
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '.');
    return `${cleanName}.mock${suffix}@example.com`;
  }

  /**
   * Private helper to generate phone number
   */
  private static generatePhone(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1-${areaCode}-${exchange}-${number}`;
  }

  /**
   * Private helpers for generating random data
   */
  private static getRandomFirstName(): string {
    const names = [
      'Alex',
      'Jordan',
      'Taylor',
      'Morgan',
      'Casey',
      'Riley',
      'Avery',
      'Quinn',
      'John',
      'Jane',
      'Michael',
      'Sarah',
      'David',
      'Lisa',
      'Chris',
      'Amy',
      'Robert',
      'Emily',
      'James',
      'Jessica',
      'William',
      'Ashley',
      'Daniel',
      'Michelle',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private static getRandomLastName(): string {
    const names = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
      'Taylor',
      'Moore',
      'Jackson',
      'Martin',
      'Lee',
      'Perez',
      'Thompson',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private static getRandomJobTitle(): string {
    const titles = [
      'Software Engineer',
      'Product Manager',
      'Sales Representative',
      'Marketing Manager',
      'Data Analyst',
      'UX Designer',
      'Customer Success Manager',
      'Operations Manager',
      'Business Analyst',
      'Project Manager',
      'Account Executive',
      'Content Writer',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private static getRandomSeniority(): string {
    const levels = [
      'Junior',
      'Mid-level',
      'Senior',
      'Lead',
      'Principal',
      'Executive',
    ];
    const weights = [15, 35, 30, 12, 6, 2]; // Realistic distribution
    const random = Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < levels.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return levels[i];
      }
    }
    return 'Mid-level'; // Fallback
  }
}

/**
 * Convenience export for direct usage
 */
export default PersonMockFactory;
