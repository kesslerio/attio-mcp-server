/**
 * Write operations for People with dynamic field detection
 */
import { Person, PersonCreateAttributes } from '../types/attio.js';
import { ResourceType } from '../types/attio.js';
import {
  createObjectWithDynamicFields,
  updateObjectWithDynamicFields,
  updateObjectAttributeWithDynamicFields,
  deleteObjectWithValidation,
} from './base-operations.js';
import { AttioApiError } from '../utils/error-handler.js';
import { getAttributeSlugById } from '../api/attribute-types.js';
import { searchCompanies } from './companies/search.js';
import { isValidEmail } from '../utils/validation/email-validation.js';
import { PersonAttributes } from './people/types.js';
import {
  PersonOperationError,
  InvalidPersonDataError,
} from './people/errors.js';
import { searchPeopleByEmails } from './people/email-validation.js';

// Type guards for safer email handling
function hasEmailAddressField(
  item: unknown
): item is { email_address: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'email_address' in item &&
    typeof (item as Record<string, unknown>).email_address === 'string'
  );
}

function hasEmailField(item: unknown): item is { email: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'email' in item &&
    typeof (item as Record<string, unknown>).email === 'string'
  );
}

function hasValueField(item: unknown): item is { value: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'value' in item &&
    typeof (item as Record<string, unknown>).value === 'string'
  );
}

// Re-export error classes for backward compatibility
export {
  PersonOperationError,
  InvalidPersonDataError,
} from './people/errors.js';

/**
 * Simple validator for person data
 * Can be enhanced with more specific validation rules
 */
export class PersonValidator {
  static async validateCreate(
    attributes: PersonCreateAttributes
  ): Promise<PersonCreateAttributes> {
    // Basic validation - ensure we have at least an email or name
    if (!attributes.email_addresses && !attributes.name) {
      throw new InvalidPersonDataError(
        'Must provide at least an email address or name'
      );
    }

    // Ensure email_addresses is an array if provided
    if (
      attributes.email_addresses &&
      !Array.isArray(attributes.email_addresses)
    ) {
      attributes.email_addresses = [attributes.email_addresses];
    }

    // Validate email format BEFORE checking for duplicates
    if (attributes.email_addresses) {
      const extractedEmails: string[] = [];
      const emailArray = Array.isArray(attributes.email_addresses)
        ? attributes.email_addresses
        : [attributes.email_addresses];

      for (const emailItem of emailArray) {
        let emailAddress: string;
        // Type assertion needed here because emailItem can be string or object formats
        const item = emailItem as unknown;

        // Handle different email formats (same logic as ValidationService)
        if (typeof item === 'string') {
          emailAddress = item;
        } else if (hasEmailAddressField(item)) {
          emailAddress = item.email_address;
        } else if (hasEmailField(item)) {
          emailAddress = item.email;
        } else if (hasValueField(item)) {
          emailAddress = item.value;
        } else {
          throw new InvalidPersonDataError(
            `Invalid email format: "${JSON.stringify(
              emailItem
            )}". Please provide a valid email address (e.g., user@example.com)`
          );
        }

        if (!isValidEmail(emailAddress)) {
          throw new InvalidPersonDataError(
            `Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`
          );
        }

        extractedEmails.push(emailAddress);
      }

      // Check for duplicate emails using batch validation for better performance
      const emailResults = await searchPeopleByEmails(extractedEmails);
      const duplicateEmails = emailResults.filter((result) => result.exists);

      if (duplicateEmails.length > 0) {
        const duplicateList = duplicateEmails
          .map((result) => result.email)
          .join(', ');
        throw new InvalidPersonDataError(
          `Person(s) with email(s) ${duplicateList} already exist`
        );
      }
    }

    // Resolve company name to record reference
    if (attributes.company && typeof attributes.company === 'string') {
      const companyName = attributes.company;
      const results = await searchCompanies(companyName);
      if (results.length === 1) {
        // TypeScript needs help understanding the type mutation here
        (
          attributes as PersonAttributes & { company: { record_id: string } }
        ).company = { record_id: results[0].id?.record_id || '' };
      } else if (results.length === 0) {
        throw new InvalidPersonDataError(
          `Company '${companyName}' not found. Provide a valid company ID.`
        );
      } else {
        throw new InvalidPersonDataError(
          `Multiple companies match '${companyName}'. Please specify the company ID.`
        );
      }
    }

    return attributes;
  }

  static async validateUpdate(
    personId: string,
    attributes: PersonAttributes
  ): Promise<PersonAttributes> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }

    // Ensure at least one attribute is being updated
    if (!attributes || Object.keys(attributes).length === 0) {
      throw new InvalidPersonDataError(
        'Must provide at least one attribute to update'
      );
    }

    return attributes;
  }

  static async validateAttributeUpdate(
    personId: string,
    attributeName: string,
    attributeValue: string | string[] | { record_id: string } | undefined
  ): Promise<void> {
    if (!personId || typeof personId !== 'string') {
      throw new InvalidPersonDataError('Person ID must be a non-empty string');
    }

    if (!attributeName || typeof attributeName !== 'string') {
      throw new InvalidPersonDataError(
        'Attribute name must be a non-empty string'
      );
    }

    // Special validation for email_addresses
    if (attributeName === 'email_addresses' && attributeValue) {
      const emails = Array.isArray(attributeValue)
        ? attributeValue
        : [attributeValue];

      for (const emailItem of emails) {
        let emailAddress: string;
        // Type assertion needed here because emailItem can be string or object formats
        const item = emailItem as unknown;

        // Handle different email formats (same logic as ValidationService)
        if (typeof item === 'string') {
          emailAddress = item;
        } else if (hasEmailAddressField(item)) {
          emailAddress = item.email_address;
        } else if (hasEmailField(item)) {
          emailAddress = item.email;
        } else if (hasValueField(item)) {
          emailAddress = item.value;
        } else {
          throw new InvalidPersonDataError(
            `Invalid email format: "${JSON.stringify(
              emailItem
            )}". Please provide a valid email address (e.g., user@example.com)`
          );
        }

        if (!isValidEmail(emailAddress)) {
          throw new InvalidPersonDataError(
            `Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`
          );
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
export async function createPerson(
  attributes: PersonCreateAttributes
): Promise<Person> {
  try {
    return await createObjectWithDynamicFields<Person>(
      ResourceType.PEOPLE,
      attributes,
      PersonValidator.validateCreate
    );
  } catch (error: unknown) {
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
    throw new PersonOperationError(
      'create',
      undefined,
      error instanceof Error ? error.message : String(error)
    );
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
export async function updatePerson(
  personId: string,
  attributes: PersonAttributes
): Promise<Person> {
  try {
    return await updateObjectWithDynamicFields<
      Person,
      PersonAttributes,
      PersonAttributes
    >(
      ResourceType.PEOPLE,
      personId,
      attributes,
      PersonValidator.validateUpdate
    );
  } catch (error: unknown) {
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
  attributeValue: string | string[] | { record_id: string } | undefined
): Promise<Person> {
  try {
    // Validate attribute update
    await PersonValidator.validateAttributeUpdate(
      personId,
      attributeName,
      attributeValue
    );

    return await updateObjectAttributeWithDynamicFields<
      Person,
      PersonAttributes
    >(
      ResourceType.PEOPLE,
      personId,
      attributeName,
      attributeValue,
      updatePerson
    );
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
