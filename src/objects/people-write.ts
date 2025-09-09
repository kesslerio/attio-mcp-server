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
import { searchPeopleByEmail } from './people/search.js';
import { searchCompanies } from './companies/search.js';
import { getAttioClient } from '../api/attio-client.js';
import { isValidEmail } from '../utils/validation/email-validation.js';
import { PersonAttributes } from './people/types.js';
import {
  PersonOperationError,
  InvalidPersonDataError,
} from './people/errors.js';

// Type definition for email input formats
type EmailInput =
  | string
  | {
      value?: string;
      email?: string;
      email_address?: string;
      [key: string]: any;
    };

// Re-export error classes for backward compatibility
export {
  PersonOperationError,
  InvalidPersonDataError,
} from './people/errors.js';

/**
 * Batch email validation for performance optimization
 * Instead of multiple individual API calls, use a single query to check multiple emails
 */
export async function searchPeopleByEmails(
  emails: string[]
): Promise<{ email: string; exists: boolean; personId?: string }[]> {
  if (!emails || emails.length === 0) {
    return [];
  }

  const client = getAttioClient();
  const results: { email: string; exists: boolean; personId?: string }[] = [];

  try {
    // Create a filter that searches for any of the provided email addresses
    const response = await client.post('/objects/people/records/query', {
      filter: {
        $or: emails.map((email) => ({
          email_addresses: { $contains: email },
        })),
      },
      limit: emails.length * 2, // Allow for potential duplicates
    });

    // Create a map of found emails to person data
    const foundEmails = new Map<string, string>();
    // Handle both response.data.data and response.data structures
    const peopleData = response.data?.data || response.data || [];
    if (Array.isArray(peopleData)) {
      for (const person of peopleData) {
        const personEmails = person.values?.email_addresses || [];
        for (const emailObj of personEmails) {
          if (emailObj.value && emails.includes(emailObj.value)) {
            foundEmails.set(emailObj.value, person.id?.record_id);
          }
        }
      }
    }

    // Build results for all requested emails
    for (const email of emails) {
      const personId = foundEmails.get(email);
      results.push({
        email,
        exists: !!personId,
        personId,
      });
    }

    return results;
  } catch (error: unknown) {
    // Fallback to individual searches if batch query fails
    console.warn(
      '[batchEmailValidation] Batch query failed, falling back to individual searches:',
      error
    );

    for (const email of emails) {
      try {
        const existing = await searchPeopleByEmail(email);
        results.push({
          email,
          exists: existing.length > 0,
          personId: existing[0]?.id?.record_id,
        });
      } catch (individualError) {
        console.error(
          `[batchEmailValidation] Failed to search for email ${email}:`,
          individualError
        );
        results.push({
          email,
          exists: false, // Assume doesn't exist if we can't check
        });
      }
    }

    return results;
  }
}

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

      for (const emailItem of attributes.email_addresses) {
        let emailAddress: string;

        // Handle different email formats (same logic as ValidationService)
        if (typeof emailItem === 'string') {
          emailAddress = emailItem;
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'email_address' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>)
            .email_address;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: email_address must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'email' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>).email;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: email must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'value' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>).value;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: value must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
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

        // Handle different email formats (same logic as ValidationService)
        if (typeof emailItem === 'string') {
          emailAddress = emailItem;
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'email_address' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>)
            .email_address;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: email_address must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'email' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>).email;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: email must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
        } else if (
          typeof emailItem === 'object' &&
          emailItem &&
          'value' in emailItem
        ) {
          const emailValue = (emailItem as Record<string, unknown>).value;
          if (typeof emailValue === 'string') {
            emailAddress = emailValue;
          } else {
            throw new InvalidPersonDataError(
              `Invalid email format: value must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`
            );
          }
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
    return await updateObjectWithDynamicFields<Person>(
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

    return await updateObjectAttributeWithDynamicFields<Person>(
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
