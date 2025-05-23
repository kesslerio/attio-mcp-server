/**
 * Write operations for People with dynamic field detection
 */
import { Person, PersonCreateAttributes } from "../types/attio.js";
import { ResourceType } from "../types/attio.js";
import {
  createObjectWithDynamicFields,
  updateObjectWithDynamicFields,
  updateObjectAttributeWithDynamicFields,
  deleteObjectWithValidation
} from "./base-operations.js";
import { AttioApiError } from "../utils/error-handler.js";
import { getAttributeSlugById } from "../api/attribute-types.js";
import { searchPeopleByEmail } from "./people/search.js";
import { searchCompaniesByName } from "./companies/search.js";

// Error classes for people operations
export class PersonOperationError extends Error {
  constructor(
    public operation: string,
    public personId?: string,
    message?: string
  ) {
    super(`Person ${operation} failed${personId ? ` for ${personId}` : ''}: ${message}`);
    this.name = 'PersonOperationError';
  }
}

export class InvalidPersonDataError extends Error {
  constructor(message: string) {
    super(`Invalid person data: ${message}`);
    this.name = 'InvalidPersonDataError';
  }
}

/**
 * Simple validator for person data
 * Can be enhanced with more specific validation rules
 */
export class PersonValidator {
  static async validateCreate(attributes: PersonCreateAttributes): Promise<PersonCreateAttributes> {
    // Basic validation - ensure we have at least an email or name
    if (!attributes.email_addresses && !attributes.name) {
      throw new InvalidPersonDataError('Must provide at least an email address or name');
    }

    // Ensure email_addresses is an array if provided
    if (attributes.email_addresses && !Array.isArray(attributes.email_addresses)) {
      attributes.email_addresses = [attributes.email_addresses];
    }

    // Check for duplicate emails
    if (attributes.email_addresses) {
      for (const email of attributes.email_addresses) {
        const existing = await searchPeopleByEmail(email);
        if (existing.length > 0) {
          throw new InvalidPersonDataError(`Person with email ${email} already exists`);
        }
      }
    }

    // Resolve company name to record reference
    if (attributes.company && typeof attributes.company === 'string') {
      const results = await searchCompaniesByName(attributes.company);
      if (results.length === 1) {
        attributes.company = { record_id: results[0].id?.record_id } as any;
      } else if (results.length === 0) {
        throw new InvalidPersonDataError(`Company '${attributes.company}' not found. Provide a valid company ID.`);
      } else {
        throw new InvalidPersonDataError(`Multiple companies match '${attributes.company}'. Please specify the company ID.`);
      }
    }

    return attributes;
  }
  
  static async validateUpdate(personId: string, attributes: any): Promise<any> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }
    
    // Ensure at least one attribute is being updated
    if (!attributes || Object.keys(attributes).length === 0) {
      throw new InvalidPersonDataError('Must provide at least one attribute to update');
    }
    
    return attributes;
  }
  
  static async validateAttributeUpdate(personId: string, attributeName: string, attributeValue: any): Promise<void> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }
    
    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidPersonDataError('Attribute name must be a non-empty string');
    }
    
    // Special validation for email_addresses
    if (attributeName === 'email_addresses' && attributeValue) {
      const emails = Array.isArray(attributeValue) ? attributeValue : [attributeValue];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          throw new InvalidPersonDataError(`Invalid email format: ${email}`);
        }
      }
    }
  }
  
  static validateDelete(personId: string): void {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }
  }
}

/**
 * Creates a new person
 * 
 * @param attributes - Person attributes as key-value pairs
 * @returns Created person record
 * @throws InvalidPersonDataError if validation fails
 * @throws PersonOperationError if creation fails
 */
export async function createPerson(attributes: PersonCreateAttributes): Promise<Person> {
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

    if (error instanceof AttioApiError) {
      const detail = typeof error.detail === 'string' ? error.detail : '';
      const match = detail.match(/attribute with ID "([^"]+)"/);
      if (match) {
        const slug = await getAttributeSlugById(ResourceType.PEOPLE, match[1]);
        if (slug) {
          const friendly = detail.replace(match[1], slug);
          throw new PersonOperationError('create', undefined, friendly);
        }
      }
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