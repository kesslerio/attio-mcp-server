/**
 * Attribute management for companies
 */
import { Company } from "../../types/attio.js";
/**
 * Gets specific company fields based on a field list
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param fields - Array of field names to retrieve
 * @returns Partial company data with only requested fields
 */
export declare function getCompanyFields(companyIdOrUri: string, fields: string[]): Promise<Partial<Company>>;
/**
 * Gets basic company information (limited fields for performance)
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Basic company information
 */
export declare function getCompanyBasicInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company contact information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company contact information
 */
export declare function getCompanyContactInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company business information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company business information
 */
export declare function getCompanyBusinessInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company social media and online presence
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company social media information
 */
export declare function getCompanySocialInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets custom fields for a company, filtering out standard fields
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @param customFieldNames - Optional array of specific custom field names to retrieve
 * @returns Company object with only custom fields populated
 * @example
 * ```typescript
 * // Get all custom fields
 * const custom = await getCompanyCustomFields("comp_123");
 *
 * // Get specific custom fields
 * const selected = await getCompanyCustomFields("comp_123", ["contract_value", "lead_source"]);
 * ```
 */
export declare function getCompanyCustomFields(companyIdOrUri: string, customFieldNames?: string[]): Promise<Partial<Company>>;
/**
 * Discovers all available attributes for companies in the workspace
 *
 * @returns List of all company attributes with metadata
 */
export declare function discoverCompanyAttributes(): Promise<{
    standard: string[];
    custom: string[];
    all: Array<{
        name: string;
        type: string;
        isCustom: boolean;
    }>;
}>;
/**
 * Gets specific attributes for a company or lists available attributes
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param attributeName - Optional name of specific attribute to retrieve
 * @returns If attributeName provided: specific attribute value, otherwise list of available attributes
 */
export declare function getCompanyAttributes(companyIdOrUri: string, attributeName?: string): Promise<{
    attributes?: string[];
    value?: any;
    company: string;
}>;
//# sourceMappingURL=attributes.d.ts.map