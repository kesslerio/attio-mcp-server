import { Company } from "../../types/attio.js";
import { CompanyAttributes } from "./types.js";
/**
 * Lists companies sorted by most recent interaction
 *
 * @param limit - Maximum number of companies to return (default: 20)
 * @returns Array of company results
 */
export declare function listCompanies(limit?: number): Promise<Company[]>;
/**
 * Gets full details for a specific company (all fields)
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @returns Company details
 */
export declare function getCompanyDetails(companyIdOrUri: string): Promise<Company>;
/**
 * Creates a new company with the specified attributes
 *
 * @param attributes - Company attributes to set
 * @returns The created company object
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if creation fails
 * @example
 * ```typescript
 * const company = await createCompany({
 *   name: "Acme Corp",
 *   website: "https://acme.com",
 *   industry: "Technology"
 * });
 * ```
 */
export declare function createCompany(attributes: CompanyAttributes): Promise<Company>;
/**
 * Updates an existing company with new attributes
 *
 * @param companyId - ID of the company to update
 * @param attributes - Company attributes to update (partial update supported)
 * @returns The updated company object
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if update fails
 * @example
 * ```typescript
 * const updated = await updateCompany("comp_123", {
 *   industry: "Healthcare",
 *   employee_range: "100-500"
 * });
 * ```
 */
export declare function updateCompany(companyId: string, attributes: Partial<CompanyAttributes>): Promise<Company>;
/**
 * Updates a specific attribute of a company
 *
 * @param companyId - ID of the company to update
 * @param attributeName - Name of the attribute to update
 * @param attributeValue - New value for the attribute
 * @returns Updated company record
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if update fails
 */
export declare function updateCompanyAttribute(companyId: string, attributeName: string, attributeValue: any): Promise<Company>;
/**
 * Deletes a company permanently from the system
 *
 * @param companyId - ID of the company to delete
 * @returns True if deletion was successful
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if deletion fails
 * @example
 * ```typescript
 * const success = await deleteCompany("comp_123");
 * if (success) {
 *   console.log("Company deleted successfully");
 * }
 * ```
 */
export declare function deleteCompany(companyId: string): Promise<boolean>;
/**
 * Extracts company ID from a URI or returns the ID directly
 *
 * @param companyIdOrUri - Either a direct ID or URI format (attio://companies/{id})
 * @returns The extracted company ID
 * @throws Error if the URI format is invalid
 */
export declare function extractCompanyId(companyIdOrUri: string): string;
//# sourceMappingURL=basic.d.ts.map