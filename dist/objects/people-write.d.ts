/**
 * Write operations for People with dynamic field detection
 */
import { Person } from "../types/attio.js";
export declare class PersonOperationError extends Error {
    operation: string;
    personId?: string | undefined;
    constructor(operation: string, personId?: string | undefined, message?: string);
}
export declare class InvalidPersonDataError extends Error {
    constructor(message: string);
}
/**
 * Simple validator for person data
 * Can be enhanced with more specific validation rules
 */
export declare class PersonValidator {
    static validateCreate(attributes: any): Promise<any>;
    static validateUpdate(personId: string, attributes: any): Promise<any>;
    static validateAttributeUpdate(personId: string, attributeName: string, attributeValue: any): Promise<void>;
    static validateDelete(personId: string): void;
}
/**
 * Creates a new person
 *
 * @param attributes - Person attributes as key-value pairs
 * @returns Created person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if creation fails
 */
export declare function createPerson(attributes: any): Promise<Person>;
/**
 * Updates an existing person
 *
 * @param personId - ID of the person to update
 * @param attributes - Person attributes to update
 * @returns Updated person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if update fails
 */
export declare function updatePerson(personId: string, attributes: any): Promise<Person>;
/**
 * Updates a specific attribute of a person
 *
 * @param personId - ID of the person to update
 * @param attributeName - Name of the attribute to update
 * @param attributeValue - New value for the attribute
 * @returns Updated person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if update fails
 */
export declare function updatePersonAttribute(personId: string, attributeName: string, attributeValue: any): Promise<Person>;
/**
 * Deletes a person
 *
 * @param personId - ID of the person to delete
 * @returns True if deletion was successful
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if deletion fails
 */
export declare function deletePerson(personId: string): Promise<boolean>;
//# sourceMappingURL=people-write.d.ts.map