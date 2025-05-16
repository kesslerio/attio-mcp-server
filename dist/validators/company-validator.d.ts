import { CompanyCreateInput, CompanyUpdateInput } from '../types/company-types.js';
export declare class CompanyValidator {
    private static fieldTypeCache;
    /**
     * Validates data for creating a company using dynamic field type detection
     *
     * @param attributes - Raw attributes for company creation
     * @returns Validated company create input
     * @throws MissingCompanyFieldError if required fields are missing
     * @throws InvalidCompanyFieldTypeError if field types are invalid
     */
    static validateCreate(attributes: any): Promise<CompanyCreateInput>;
    /**
     * Validates data for updating a company using dynamic field type detection
     *
     * @param companyId - ID of the company to update
     * @param attributes - Raw attributes for company update
     * @returns Validated company update input
     * @throws InvalidCompanyDataError if company ID is invalid
     * @throws InvalidCompanyFieldTypeError if field types are invalid
     */
    static validateUpdate(companyId: string, attributes: any): Promise<CompanyUpdateInput>;
    /**
     * Validates a single attribute update using dynamic field type detection
     *
     * @param companyId - ID of the company to update
     * @param attributeName - Name of the attribute to update
     * @param attributeValue - Value to set for the attribute
     * @throws InvalidCompanyDataError if validation fails
     */
    static validateAttributeUpdate(companyId: string, attributeName: string, attributeValue: any): Promise<void>;
    /**
     * Validates field type using dynamic detection
     *
     * @param field - Field name
     * @param value - Field value
     * @throws InvalidCompanyFieldTypeError if type is invalid
     */
    private static validateFieldType;
    /**
     * Performs special validation for specific field types
     *
     * @param attributes - Attributes to validate
     */
    private static performSpecialValidation;
    /**
     * Fallback field type inference based on field name patterns
     *
     * @param field - Field name
     * @returns Inferred field type
     */
    private static inferFieldType;
    /**
     * Validates company ID for deletion
     *
     * @param companyId - ID of the company to delete
     * @throws InvalidCompanyDataError if company ID is invalid
     */
    static validateDelete(companyId: string): void;
    /**
     * Clears the field type cache (useful for testing or when metadata changes)
     */
    static clearFieldTypeCache(): void;
}
//# sourceMappingURL=company-validator.d.ts.map