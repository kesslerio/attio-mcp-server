/**
 * Write operations for People with dynamic field detection
 */

import { getAttioClient } from '../api/attio-client.js';
import { getAttributeSlugById } from '../api/attribute-types.js';
import {
  type Person,
  type PersonCreateAttributes,
  ResourceType,
} from '../types/attio.js';
import { AttioApiError } from '../utils/error-handler.js';
import {
  createObjectWithDynamicFields,
  deleteObjectWithValidation,
  updateObjectAttributeWithDynamicFields,
  updateObjectWithDynamicFields,
} from './base-operations.js';
import { searchCompanies } from './companies/search.js';
import { searchPeopleByEmail } from './people/search.js';

// Error classes for people operations
export class PersonOperationError extends Error {
  constructor(
    public operation: string,
    public personId?: string,
    message?: string
  ) {
    super(
      `Person ${operation} failed${
        personId ? ` for ${personId}` : ''
      }: ${message}`
    );
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
    if (response.data?.data) {
      for (const person of response.data.data) {
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
  } catch (error) {
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
    if (!(attributes.email_addresses || attributes.name)) {
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

    // Check for duplicate emails using batch validation for better performance
    if (attributes.email_addresses) {
      const emailResults = await searchPeopleByEmails(
        attributes.email_addresses
      );
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
      const results = await searchCompanies(attributes.company);
      if (results.length === 1) {
        attributes.company = { record_id: results[0].id?.record_id } as any;
      } else if (results.length === 0) {
        throw new InvalidPersonDataError(
          `Company '${attributes.company}' not found. Provide a valid company ID.`
        );
      } else {
        throw new InvalidPersonDataError(
          `Multiple companies match '${attributes.company}'. Please specify the company ID.`
        );
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
      throw new InvalidPersonDataError(
        'Must provide at least one attribute to update'
      );
    }

    return attributes;
  }

  static async validateAttributeUpdate(
    personId: string,
    attributeName: string,
    attributeValue: any
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
export async function createPerson(
  attributes: PersonCreateAttributes
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
  attributes: any
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
    throw new PersonOperationError(
      'delete',
      personId,
      error instanceof Error ? error.message : String(error)
    );
  }
}
