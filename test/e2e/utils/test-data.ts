/**
 * E2E Test Data Generation Utilities
 * 
 * Provides factories and utilities for generating consistent test data
 * with proper prefixing and cleanup tracking.
 */
import { configLoader } from './config-loader.js';

export interface E2ETestCompany {
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  description?: string;
  annual_revenue?: number;
  employee_count?: number;
  categories?: string[];
}

export interface E2ETestPerson {
  name: string;
  email_addresses: string[];
  phone_numbers?: string[];
  job_title?: string;
  department?: string;
  seniority?: string;
  company?: string; // Company record ID
}

export interface E2ETestList {
  name: string;
  parent_object: string;
  description?: string;
}

export interface E2ETestTask {
  title: string;
  content?: string;
  assignee?: string; // Person record ID
  due_date?: string;
  status?: string;
  priority?: string;
}

export interface E2ETestNote {
  title: string;
  content: string;
  format: 'plaintext' | 'html' | 'markdown';
  parent_object: string;
  parent_record_id: string;
}

/**
 * Base class for E2E test data factories
 */
export abstract class E2ETestDataFactory {
  protected static getTestId(prefix: string): string {
    return configLoader.getTestIdentifier(prefix);
  }

  protected static getTestEmail(prefix: string = 'person'): string {
    return configLoader.getTestEmail(prefix);
  }

  protected static getTestDomain(): string {
    return configLoader.getTestCompanyDomain();
  }
}

/**
 * Company test data factory
 */
export class E2ECompanyFactory extends E2ETestDataFactory {
  static create(overrides: Partial<E2ETestCompany> = {}): E2ETestCompany {
    const testId = this.getTestId('company');
    const domain = this.getTestDomain();
    
    const defaults: E2ETestCompany = {
      name: `Test Company ${testId}`,
      domain,
      website: `https://${domain}`,
      industry: 'Technology',
      description: `E2E test company created for testing purposes - ${testId}`,
      annual_revenue: Math.floor(Math.random() * 10000000) + 1000000,
      employee_count: Math.floor(Math.random() * 1000) + 10,
      categories: ['Software', 'B2B']
    };

    return { ...defaults, ...overrides };
  }

  static createMany(count: number, overrides: Partial<E2ETestCompany> = {}): E2ETestCompany[] {
    return Array.from({ length: count }, (_, i) => {
      const testId = this.getTestId(`company_${i}`);
      const domain = this.getTestDomain();
      
      return this.create({
        ...overrides,
        name: `Test Company ${testId}`,
        domain: `${testId}.${domain}`,
        website: `https://${testId}.${domain}`,
        description: `E2E test company ${i + 1} created for testing purposes - ${testId}`
      });
    });
  }

  static createTechnology(overrides: Partial<E2ETestCompany> = {}): E2ETestCompany {
    return this.create({
      industry: 'Technology',
      categories: ['Software', 'SaaS', 'B2B'],
      annual_revenue: Math.floor(Math.random() * 50000000) + 5000000,
      employee_count: Math.floor(Math.random() * 500) + 50,
      ...overrides
    });
  }

  static createFinance(overrides: Partial<E2ETestCompany> = {}): E2ETestCompany {
    return this.create({
      industry: 'Financial Services',
      categories: ['Banking', 'Finance', 'B2B'],
      annual_revenue: Math.floor(Math.random() * 100000000) + 10000000,
      employee_count: Math.floor(Math.random() * 1000) + 100,
      ...overrides
    });
  }
}

/**
 * Person test data factory
 */
export class E2EPersonFactory extends E2ETestDataFactory {
  static create(overrides: Partial<E2ETestPerson> = {}): E2ETestPerson {
    const testId = this.getTestId('person');
    const email = this.getTestEmail('person');
    
    const defaults: E2ETestPerson = {
      name: `Test Person ${testId}`,
      email_addresses: [email],
      phone_numbers: [`+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`],
      job_title: 'Software Engineer',
      department: 'Engineering',
      seniority: 'Mid-level'
    };

    return { ...defaults, ...overrides };
  }

  static createMany(count: number, overrides: Partial<E2ETestPerson> = {}): E2ETestPerson[] {
    return Array.from({ length: count }, (_, i) => {
      const testId = this.getTestId(`person_${i}`);
      const email = this.getTestEmail(`person_${i}`);
      
      return this.create({
        ...overrides,
        name: `Test Person ${testId}`,
        email_addresses: [email],
        job_title: overrides.job_title || `Test Role ${i + 1}`
      });
    });
  }

  static createExecutive(overrides: Partial<E2ETestPerson> = {}): E2ETestPerson {
    return this.create({
      job_title: 'Chief Executive Officer',
      department: 'Executive',
      seniority: 'Executive',
      ...overrides
    });
  }

  static createSalesPerson(overrides: Partial<E2ETestPerson> = {}): E2ETestPerson {
    return this.create({
      job_title: 'Account Executive',
      department: 'Sales',
      seniority: 'Mid-level',
      ...overrides
    });
  }

  static createEngineer(overrides: Partial<E2ETestPerson> = {}): E2ETestPerson {
    return this.create({
      job_title: 'Software Engineer',
      department: 'Engineering',
      seniority: 'Mid-level',
      ...overrides
    });
  }
}

/**
 * List test data factory
 */
export class E2EListFactory extends E2ETestDataFactory {
  static create(overrides: Partial<E2ETestList> = {}): E2ETestList {
    const testId = this.getTestId('list');
    
    const defaults: E2ETestList = {
      name: `Test List ${testId}`,
      parent_object: 'companies',
      description: `E2E test list created for testing purposes - ${testId}`
    };

    return { ...defaults, ...overrides };
  }

  static createMany(count: number, overrides: Partial<E2ETestList> = {}): E2ETestList[] {
    return Array.from({ length: count }, (_, i) => {
      const testId = this.getTestId(`list_${i}`);
      
      return this.create({
        ...overrides,
        name: `Test List ${testId}`,
        description: `E2E test list ${i + 1} created for testing purposes - ${testId}`
      });
    });
  }

  static createCompanyList(overrides: Partial<E2ETestList> = {}): E2ETestList {
    return this.create({
      parent_object: 'companies',
      ...overrides
    });
  }

  static createPersonList(overrides: Partial<E2ETestList> = {}): E2ETestList {
    return this.create({
      parent_object: 'people',
      ...overrides
    });
  }
}

/**
 * Task test data factory
 */
export class E2ETaskFactory extends E2ETestDataFactory {
  static create(overrides: Partial<E2ETestTask> = {}): E2ETestTask {
    const testId = this.getTestId('task');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Due in 7 days
    
    const defaults: E2ETestTask = {
      title: `Test Task ${testId}`,
      content: `E2E test task created for testing purposes - ${testId}`,
      due_date: futureDate.toISOString().split('T')[0],
      status: 'open',
      priority: 'medium'
    };

    return { ...defaults, ...overrides };
  }

  static createMany(count: number, overrides: Partial<E2ETestTask> = {}): E2ETestTask[] {
    return Array.from({ length: count }, (_, i) => {
      const testId = this.getTestId(`task_${i}`);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (i + 1)); // Stagger due dates
      
      return this.create({
        ...overrides,
        title: `Test Task ${testId}`,
        content: `E2E test task ${i + 1} created for testing purposes - ${testId}`,
        due_date: futureDate.toISOString().split('T')[0]
      });
    });
  }

  static createHighPriority(overrides: Partial<E2ETestTask> = {}): E2ETestTask {
    return this.create({
      priority: 'high',
      status: 'open',
      ...overrides
    });
  }
}

/**
 * Note test data factory
 */
export class E2ENoteFactory extends E2ETestDataFactory {
  static create(parentObject: string, parentRecordId: string, overrides: Partial<E2ETestNote> = {}): E2ETestNote {
    const testId = this.getTestId('note');
    
    const defaults: E2ETestNote = {
      title: `Test Note ${testId}`,
      content: `E2E test note created for testing purposes - ${testId}\n\nThis note contains test content and should be cleaned up after testing.`,
      format: 'plaintext' as const,
      parent_object: parentObject,
      parent_record_id: parentRecordId
    };

    return { ...defaults, ...overrides };
  }

  static createMany(
    parentObject: string, 
    parentRecordId: string, 
    count: number, 
    overrides: Partial<E2ETestNote> = {}
  ): E2ETestNote[] {
    return Array.from({ length: count }, (_, i) => {
      const testId = this.getTestId(`note_${i}`);
      
      return this.create(parentObject, parentRecordId, {
        ...overrides,
        title: `Test Note ${testId}`,
        content: `E2E test note ${i + 1} created for testing purposes - ${testId}\n\nThis is note content for testing.`
      });
    });
  }

  static createMarkdown(parentObject: string, parentRecordId: string, overrides: Partial<E2ETestNote> = {}): E2ETestNote {
    const testId = this.getTestId('note_md');
    
    return this.create(parentObject, parentRecordId, {
      format: 'markdown' as const,
      title: `Test Markdown Note ${testId}`,
      content: `# E2E Test Note ${testId}\n\nThis is a **markdown** note created for testing purposes.\n\n- Item 1\n- Item 2\n- Item 3`,
      ...overrides
    });
  }
}

/**
 * Utility class for generating test scenarios and datasets
 */
export class E2ETestScenarios {
  /**
   * Create a complete company with associated people
   */
  static createCompanyWithPeople(personCount: number = 3): {
    company: E2ETestCompany;
    people: E2ETestPerson[];
  } {
    const company = E2ECompanyFactory.createTechnology();
    const people = E2EPersonFactory.createMany(personCount, {
      // People will be associated with company after creation
    });

    return { company, people };
  }

  /**
   * Create a sales pipeline scenario
   */
  static createSalesPipeline(): {
    companies: E2ETestCompany[];
    people: E2ETestPerson[];
    tasks: E2ETestTask[];
  } {
    const companies = E2ECompanyFactory.createMany(5);
    const people = E2EPersonFactory.createMany(10);
    const tasks = E2ETaskFactory.createMany(8);

    return { companies, people, tasks };
  }

  /**
   * Create test data for relationship testing
   */
  static createRelationshipTestData(): {
    techCompany: E2ETestCompany;
    financeCompany: E2ETestCompany;
    executives: E2ETestPerson[];
    salesPeople: E2ETestPerson[];
    engineers: E2ETestPerson[];
  } {
    return {
      techCompany: E2ECompanyFactory.createTechnology(),
      financeCompany: E2ECompanyFactory.createFinance(),
      executives: [
        E2EPersonFactory.createExecutive(),
        E2EPersonFactory.createExecutive()
      ],
      salesPeople: [
        E2EPersonFactory.createSalesPerson(),
        E2EPersonFactory.createSalesPerson(),
        E2EPersonFactory.createSalesPerson()
      ],
      engineers: [
        E2EPersonFactory.createEngineer(),
        E2EPersonFactory.createEngineer(),
        E2EPersonFactory.createEngineer(),
        E2EPersonFactory.createEngineer()
      ]
    };
  }

  /**
   * Generate test data for batch operations
   */
  static createBatchTestData(batchSize: number = 10): {
    companies: E2ETestCompany[];
    people: E2ETestPerson[];
    lists: E2ETestList[];
  } {
    return {
      companies: E2ECompanyFactory.createMany(batchSize),
      people: E2EPersonFactory.createMany(batchSize),
      lists: E2EListFactory.createMany(Math.ceil(batchSize / 2))
    };
  }
}

/**
 * Utilities for test data validation
 */
export class E2ETestDataValidator {
  /**
   * Validate that test data has proper prefixing
   */
  static validateTestDataPrefix(data: any, expectedPrefix?: string): boolean {
    const config = configLoader.getConfig();
    const prefix = expectedPrefix || config.testData.testDataPrefix;

    if (typeof data === 'string') {
      return data.includes(prefix);
    }

    if (data && typeof data === 'object') {
      const stringValues = this.extractStringValues(data);
      return stringValues.some(value => value.includes(prefix));
    }

    return false;
  }

  /**
   * Extract all string values from an object recursively
   */
  private static extractStringValues(obj: any): string[] {
    const strings: string[] = [];

    function extract(value: any) {
      if (typeof value === 'string') {
        strings.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(extract);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(extract);
      }
    }

    extract(obj);
    return strings;
  }

  /**
   * Check if email follows test domain pattern
   */
  static isTestEmail(email: string): boolean {
    const config = configLoader.getConfig();
    return email.includes(config.testData.testEmailDomain);
  }

  /**
   * Check if domain follows test domain pattern
   */
  static isTestDomain(domain: string): boolean {
    const config = configLoader.getConfig();
    return domain.includes(config.testData.testCompanyDomain);
  }
}

/**
 * Convenience exports with shorter names for tests
 */
export const CompanyFactory = E2ECompanyFactory;
export const PersonFactory = E2EPersonFactory;
export const ListFactory = E2EListFactory;
export const TaskFactory = E2ETaskFactory;
export const NoteFactory = E2ENoteFactory;
export const TestScenarios = E2ETestScenarios;
export const TestDataValidator = E2ETestDataValidator;
