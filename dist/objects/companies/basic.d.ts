import { Company } from "../../types/attio.js";
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
 * Creates a new company
 *
 * @param attributes - Company attributes
 * @returns Created company record
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if creation fails
 */
export declare function createCompany(attributes: any): Promise<Company>;
/**
 * Updates an existing company
 *
 * @param companyId - ID of the company to update
 * @param attributes - Company attributes to update
 * @returns Updated company record
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if update fails
 */
export declare function updateCompany(companyId: string, attributes: any): Promise<Company>;
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
 * Deletes a company
 *
 * @param companyId - ID of the company to delete
 * @returns True if deletion was successful
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if deletion fails
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