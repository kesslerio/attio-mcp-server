/**
 * Shared types for people module
 */
/**
 * Interface for attributes when creating or updating a person
 */
export interface PersonAttributes {
    /** Person's full name */
    name?: string;
    /** Email addresses (array of strings) */
    email_addresses?: string[];
    /** Phone numbers (array of strings) */
    phone_numbers?: string[];
    /** Job title */
    job_title?: string;
    /** Associated company ID */
    company?: {
        record_id: string;
    };
    /** Custom attributes */
    [key: string]: any;
}
export declare class PersonOperationError extends Error {
    operation: string;
    personId?: string | undefined;
    constructor(operation: string, personId?: string | undefined, message?: string);
}
export declare class InvalidPersonDataError extends Error {
    constructor(message: string);
}
export declare class PersonValidator {
    static validateCreate(attributes: PersonAttributes): Promise<PersonAttributes>;
    static validateUpdate(personId: string, attributes: PersonAttributes): Promise<PersonAttributes>;
    static validateAttributeUpdate(personId: string, attributeName: string, attributeValue: any): Promise<void>;
    static validateDelete(personId: string): void;
}
//# sourceMappingURL=types.d.ts.map