/**
 * Person Mock Factory
 *
 * Generates mock AttioRecord data for person resources.
 *
 * This factory creates realistic person mock data matching the Attio API
 * response format with proper email, phone, and company associations.
 */
import type { AttioRecord } from '../../../src/types/attio.js';
import type { MockFactory } from './TaskMockFactory.js';
/**
 * Interface for mock person factory options
 */
export interface MockPersonOptions {
  name?:
    | string
    | {
        first_name: string;
        last_name: string;
      };
  email_addresses?: string | string[];
  phone_numbers?: string | string[];
  job_title?: string;
  department?: string;
  seniority?: string;
  company?: string;
  created_at?: string;
  updated_at?: string;
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
export declare class PersonMockFactory implements MockFactory<AttioRecord> {
  /**
   * Generates a unique mock person ID in UUID format
   *
   * Uses deterministic UUID generation for consistent performance testing
   * while satisfying UUID validation requirements (addresses PR #483).
   */
  static generateMockId(): string;
  /**
   * Creates a mock person AttioRecord with realistic data
   *
   * @param overrides - Optional overrides for specific fields
   * @returns Mock AttioRecord for person matching API response format
   */
  static create(overrides?: MockPersonOptions): AttioRecord;
  /**
   * Creates multiple mock people
   *
   * @param count - Number of people to create
   * @param overrides - Optional overrides applied to all people
   * @returns Array of mock AttioRecord objects for people
   */
  static createMultiple(
    count: number,
    overrides?: MockPersonOptions
  ): AttioRecord[];
  /**
   * Creates an executive person mock
   */
  static createExecutive(overrides?: MockPersonOptions): AttioRecord;
  /**
   * Creates a sales person mock
   */
  static createSalesPerson(overrides?: MockPersonOptions): AttioRecord;
  /**
   * Creates an engineer mock
   */
  static createEngineer(overrides?: MockPersonOptions): AttioRecord;
  /**
   * Creates a marketing person mock
   */
  static createMarketingPerson(overrides?: MockPersonOptions): AttioRecord;
  /**
   * Creates a person with company association
   */
  static createWithCompany(
    companyId: string,
    overrides?: MockPersonOptions
  ): AttioRecord;
  /**
   * Implementation of MockFactory interface
   */
  create(overrides?: MockPersonOptions): AttioRecord;
  createMultiple(count: number, overrides?: MockPersonOptions): AttioRecord[];
  generateMockId(): string;
  /**
   * Private helper to wrap values in AttioValue format
   */
  private static wrapValue;
  /**
   * Private helper to extract number from generated ID
   */
  private static extractNumberFromId;
  /**
   * Private helper to generate email from name
   */
  private static generateEmail;
  /**
   * Private helper to generate phone number
   */
  private static generatePhone;
  /**
   * Private helpers for generating random data
   */
  private static getRandomFirstName;
  private static getRandomLastName;
  private static getRandomJobTitle;
  private static getRandomSeniority;
}
/**
 * Convenience export for direct usage
 */
export default PersonMockFactory;
//# sourceMappingURL=PersonMockFactory.d.ts.map
