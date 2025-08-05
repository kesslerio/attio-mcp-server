/**
 * Basic CRUD operations for People
 */
import { getObjectDetails, listObjects } from '../../api/operations/index.js';
import { type Person, ResourceType } from '../../types/attio.js';
import { isValidId } from '../../utils/validation.js';
import {
  createObjectWithDynamicFields,
  deleteObjectWithValidation,
  updateObjectAttributeWithDynamicFields,
  updateObjectWithDynamicFields,
} from '../base-operations.js';
import {
  InvalidPersonDataError,
  type PersonAttributes,
  PersonOperationError,
  PersonValidator,
} from './types.js';

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
export async function createPerson(
  attributes: PersonAttributes
): Promise<Person> {
  try {
    return await createObjectWithDynamicFields<Person>(
      ResourceType.PEOPLE,
      attributes,
      PersonValidator.validateCreate
    );
  } catch (error) {
    if (error instanceof InvalidPersonDataError) {
      throw error;
    }
    throw new PersonOperationError(
      'create',
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
}

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
export async function updatePerson(
  personId: string,
  attributes: PersonAttributes
): Promise<Person> {
  try {
    return await updateObjectWithDynamicFields<Person>(
      ResourceType.PEOPLE,
      personId,
      attributes,
      PersonValidator.validateUpdate
    );
  } catch (error) {
    if (error instanceof InvalidPersonDataError) {
      throw error;
    }
    throw new PersonOperationError(
      'update',
      personId,
      error instanceof Error ? error.message : String(error)
    );
  }
}

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
export async function updatePersonAttribute(
  personId: string,
  attributeName: string,
  attributeValue: any
): Promise<Person> {
  try {
    // Validate attribute update
    await PersonValidator.validateAttributeUpdate(
      personId,
      attributeName,
      attributeValue
    );

    return await updateObjectAttributeWithDynamicFields<Person>(
      ResourceType.PEOPLE,
      personId,
      attributeName,
      attributeValue,
      updatePerson
    );
  } catch (error) {
    if (
      error instanceof InvalidPersonDataError ||
      error instanceof PersonOperationError
    ) {
      throw error;
    }
    throw new PersonOperationError(
      'update attribute',
      personId,
      error instanceof Error ? error.message : String(error)
    );
  }
}

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
export async function deletePerson(personId: string): Promise<boolean> {
  try {
    return await deleteObjectWithValidation(
      ResourceType.PEOPLE,
      personId,
      PersonValidator.validateDelete
    );
  } catch (error) {
    if (error instanceof InvalidPersonDataError) {
      throw error;
    }
    throw new PersonOperationError(
      'delete',
      personId,
      error instanceof Error ? error.message : String(error)
    );
  }
}

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
export async function getPersonDetails(personId: string): Promise<Person> {
  try {
    if (!isValidId(personId)) {
      throw new Error(`Invalid person ID: ${personId}`);
    }

    return (await getObjectDetails(ResourceType.PEOPLE, personId)) as Person;
  } catch (error) {
    throw new Error(
      `Failed to get person details: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

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
export async function listPeople(limit = 20): Promise<Person[]> {
  try {
    const response = await listObjects<Person>(ResourceType.PEOPLE, limit);
    return response;
  } catch (error) {
    throw new Error(
      `Failed to list people: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
