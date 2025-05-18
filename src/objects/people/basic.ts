/**
 * Basic CRUD operations for People
 */
import { getAttioClient } from "../../api/attio-client.js";
import { listObjects, getObjectDetails } from "../../api/operations/index.js";
import { ResourceType, Person } from "../../types/attio.js";
import { 
  createObjectWithDynamicFields,
  updateObjectWithDynamicFields,
  updateObjectAttributeWithDynamicFields,
  deleteObjectWithValidation
} from "../base-operations.js";
import { 
  PersonValidator, 
  InvalidPersonDataError, 
  PersonOperationError 
} from "./types.js";

/**
 * Creates a new person
 * 
 * @param attributes - Person attributes as key-value pairs
 * @returns Created person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if creation fails
 */
export async function createPerson(attributes: any): Promise<Person> {
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
    throw new PersonOperationError('create', undefined, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Updates an existing person
 * 
 * @param personId - ID of the person to update
 * @param attributes - Person attributes to update
 * @returns Updated person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if update fails
 */
export async function updatePerson(personId: string, attributes: any): Promise<Person> {
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
    throw new PersonOperationError('update', personId, error instanceof Error ? error.message : String(error));
  }
}

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
export async function updatePersonAttribute(
  personId: string, 
  attributeName: string, 
  attributeValue: any
): Promise<Person> {
  try {
    // Validate attribute update
    await PersonValidator.validateAttributeUpdate(personId, attributeName, attributeValue);
    
    return await updateObjectAttributeWithDynamicFields<Person>(
      ResourceType.PEOPLE,
      personId,
      attributeName,
      attributeValue,
      updatePerson
    );
  } catch (error) {
    if (error instanceof InvalidPersonDataError || error instanceof PersonOperationError) {
      throw error;
    }
    throw new PersonOperationError('update attribute', personId, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Deletes a person
 * 
 * @param personId - ID of the person to delete
 * @returns True if deletion was successful
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if deletion fails
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
    throw new PersonOperationError('delete', personId, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Gets details of a specific person
 * 
 * @param personId - ID of the person
 * @returns Person details
 */
export async function getPersonDetails(personId: string): Promise<Person> {
  try {
    const api = getAttioClient();
    const apiError = await api.validateObjectId(ResourceType.PEOPLE, personId);
    if (apiError) {
      throw new Error(apiError);
    }

    return await getObjectDetails(ResourceType.PEOPLE, personId) as Person;
  } catch (error) {
    throw new Error(`Failed to get person details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Lists all people (limited to first 20 by default)
 * 
 * @param limit - Maximum number of people to return
 * @returns Array of people
 */
export async function listPeople(limit: number = 20): Promise<Person[]> {
  try {
    const response = await listObjects<Person>(
      ResourceType.PEOPLE,
      limit
    );
    return response;
  } catch (error) {
    throw new Error(`Failed to list people: ${error instanceof Error ? error.message : String(error)}`);
  }
}