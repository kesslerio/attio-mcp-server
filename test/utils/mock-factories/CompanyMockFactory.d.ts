/**
 * Company Mock Factory
 *
 * Generates mock AttioRecord data for company resources.
 *
 * This factory creates realistic company mock data matching the Attio API
 * response format with proper AttioValue wrappers and nested structure.
 */
import type { AttioRecord } from '../../../src/types/attio.js';
import type { MockFactory } from './TaskMockFactory.js';
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
export declare class CompanyMockFactory implements MockFactory<AttioRecord> {
    /**
     * Generates a unique mock company ID in UUID format
     *
     * Uses deterministic UUID generation for consistent performance testing
     * while satisfying UUID validation requirements (addresses PR #483).
     */
    static generateMockId(): string;
    /**
     * Creates a mock company AttioRecord with realistic data
     *
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioRecord for company matching API response format
     */
    static create(overrides?: MockCompanyOptions): AttioRecord;
    /**
     * Creates multiple mock companies
     *
     * @param count - Number of companies to create
     * @param overrides - Optional overrides applied to all companies
     * @returns Array of mock AttioRecord objects for companies
     */
    static createMultiple(count: number, overrides?: MockCompanyOptions): AttioRecord[];
    /**
     * Creates a technology company mock
     */
    static createTechnology(overrides?: MockCompanyOptions): AttioRecord;
    /**
     * Creates a finance company mock
     */
    static createFinance(overrides?: MockCompanyOptions): AttioRecord;
    /**
     * Creates a healthcare company mock
     */
    static createHealthcare(overrides?: MockCompanyOptions): AttioRecord;
    /**
     * Creates a manufacturing company mock
     */
    static createManufacturing(overrides?: MockCompanyOptions): AttioRecord;
    /**
     * Implementation of MockFactory interface
     */
    create(overrides?: MockCompanyOptions): AttioRecord;
    createMultiple(count: number, overrides?: MockCompanyOptions): AttioRecord[];
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
     * Private helper to get random industry
     */
    private static getRandomIndustry;
}
/**
 * Convenience export for direct usage
 */
export default CompanyMockFactory;
//# sourceMappingURL=CompanyMockFactory.d.ts.map