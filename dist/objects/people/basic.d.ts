import { Person } from "../../types/attio.js";
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
/**
 * Gets details of a specific person
 *
 * @param personId - ID of the person
 * @returns Person details
 */
export declare function getPersonDetails(personId: string): Promise<Person>;
/**
 * Lists all people (limited to first 20 by default)
 *
 * @param limit - Maximum number of people to return
 * @returns Array of people
 */
export declare function listPeople(limit?: number): Promise<Person[]>;
//# sourceMappingURL=basic.d.ts.map