import { Person } from "../../types/attio.js";
import { PersonAttributes } from "./types.js";
/**
 * Creates a new person in Attio
 *
 * @param attributes - Person attributes as key-value pairs (must include at least email or name)
 * @returns Created person record with ID and all attributes
 * @throws {InvalidPersonDataError} When required fields are missing or validation fails
 * @throws {PersonOperationError} When the API call fails or other errors occur
 * @example
 * const newPerson = await createPerson({
 *   name: "John Doe",
 *   email_addresses: ["john@example.com"]
 * });
 */
export declare function createPerson(attributes: PersonAttributes): Promise<Person>;
/**
 * Updates an existing person's attributes
 *
 * @param personId - Unique ID of the person to update
 * @param attributes - Key-value pairs of attributes to update (partial update supported)
 * @returns Updated person record with all current attributes
 * @throws {InvalidPersonDataError} When person ID is invalid or no attributes provided
 * @throws {PersonOperationError} When the update operation fails
 * @example
 * const updatedPerson = await updatePerson("person_id", {
 *   name: "Jane Doe",
 *   phone_numbers: ["+1234567890"]
 * });
 */
export declare function updatePerson(personId: string, attributes: PersonAttributes): Promise<Person>;
/**
 * Updates a specific attribute of a person
 *
 * @param personId - Unique ID of the person to update
 * @param attributeName - Name of the attribute to update (e.g., 'email_addresses', 'name')
 * @param attributeValue - New value for the attribute (type depends on attribute)
 * @returns Updated person record with all current attributes
 * @throws {InvalidPersonDataError} When validation fails (invalid email format, etc.)
 * @throws {PersonOperationError} When the update operation fails
 * @example
 * // Update email addresses
 * await updatePersonAttribute("person_id", "email_addresses", ["new@email.com"]);
 *
 * @example
 * // Update name
 * await updatePersonAttribute("person_id", "name", "New Name");
 */
export declare function updatePersonAttribute(personId: string, attributeName: string, attributeValue: any): Promise<Person>;
/**
 * Deletes a person from Attio
 *
 * @param personId - Unique ID of the person to delete
 * @returns True if deletion was successful, false otherwise
 * @throws {InvalidPersonDataError} When person ID is invalid or empty
 * @throws {PersonOperationError} When the deletion operation fails
 * @example
 * const wasDeleted = await deletePerson("person_12345");
 * if (wasDeleted) {
 *   console.log("Person deleted successfully");
 * }
 */
export declare function deletePerson(personId: string): Promise<boolean>;
/**
 * Gets detailed information about a specific person
 *
 * @param personId - Unique ID of the person to retrieve
 * @returns Complete person record with all attributes and metadata
 * @throws {Error} When person ID is invalid or person not found
 * @example
 * const person = await getPersonDetails("person_12345");
 * console.log(person.values.name[0].value); // Person's name
 */
export declare function getPersonDetails(personId: string): Promise<Person>;
/**
 * Lists people from your Attio workspace
 *
 * @param limit - Maximum number of people to return (default: 20, max: 500)
 * @returns Array of person records sorted by most recently interacted
 * @throws {Error} When the API call fails
 * @example
 * // Get the first 20 people
 * const people = await listPeople();
 *
 * @example
 * // Get up to 100 people
 * const morePeople = await listPeople(100);
 */
export declare function listPeople(limit?: number): Promise<Person[]>;
//# sourceMappingURL=basic.d.ts.map