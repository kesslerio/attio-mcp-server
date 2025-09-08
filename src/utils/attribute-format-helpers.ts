/**
 * Attribute format helpers to convert common user mistakes to correct API formats
 *
 * This module provides automatic format conversion for common attribute mistakes
 * to improve user experience and reduce errors.
 */

/**
 * Converts common attribute format mistakes to correct API format
 *
 * @param resourceType - The type of resource (companies, people, etc.)
 * @param attributes - The attributes object with potential format issues
 * @returns Corrected attributes object
 */
export function convertAttributeFormats(
  resourceType: string,
  attributes: any
): unknown {
  let corrected = { ...attributes };

  switch (resourceType) {
    case 'companies':
      corrected = convertCompanyAttributes(corrected);
      break;
    case 'people':
      corrected = convertPeopleAttributes(corrected);
      break;
  }

  return corrected;
}

/**
 * Converts company attribute formats
 */
function convertCompanyAttributes(attributes: unknown): unknown {

  // Convert 'domain' to 'domains' array
  if ('domain' in corrected && !('domains' in corrected)) {
    corrected.domains = Array.isArray(corrected.domain)
      ? corrected.domain
      : [corrected.domain];
    delete corrected.domain;
    console.error(`[Format Helper] Converted 'domain' to 'domains' array`);
  }

  // Ensure domains is always an array
  if (corrected.domains && !Array.isArray(corrected.domains)) {
    corrected.domains = [corrected.domains];
    console.error(`[Format Helper] Converted domains to array format`);
  }

  // Handle common typos
  if ('typpe' in corrected && !('type' in corrected)) {
    corrected.type = corrected.typpe;
    delete corrected.typpe;
    console.error(`[Format Helper] Fixed typo: 'typpe' -> 'type'`);
  }

  return corrected;
}

/**
 * Converts people attribute formats
 */
function convertPeopleAttributes(attributes: unknown): unknown {

  // Handle name conversion to personal-name array format
  if (
    corrected.name ||
    corrected.first_name ||
    corrected.last_name ||
    corrected.full_name
  ) {
    const nameObj: Record<string, string> = {};

    // Handle string name input (e.g., "Jane Smith")
    if (typeof corrected.name === 'string') {
      if (parts.length >= 2) {
        nameObj.first_name = parts[0];
        nameObj.last_name = parts.slice(1).join(' ');
      } else {
        nameObj.first_name = parts[0] || '';
        nameObj.last_name = '';
      }
      nameObj.full_name = corrected.name;
      console.error(
        `[Format Helper] Parsed string name "${corrected.name}" into components`
      );
    }

    // Handle individual name components
    if (corrected.first_name) {
      nameObj.first_name = corrected.first_name;
    }
    if (corrected.last_name) {
      nameObj.last_name = corrected.last_name;
    }
    if (corrected.full_name) {
      nameObj.full_name = corrected.full_name;
    }

    // Ensure full_name is always present for Attio's personal-name validation
    if (!nameObj.full_name) {
      nameObj.full_name = [nameObj.first_name, nameObj.last_name]
        .filter(Boolean)
        .join(' ');
    }

    // Create name field as ARRAY in personal-name format expected by Attio
    corrected.name = [nameObj];

    // Remove the flattened fields since they're now in the name object
    delete corrected.first_name;
    delete corrected.last_name;
    delete corrected.full_name;

    console.error(
      `[Format Helper] Created name ARRAY in personal-name format:`,
      JSON.stringify(corrected.name)
    );
  }

  // Convert email_addresses from object format to string array
  if (corrected.email_addresses && Array.isArray(corrected.email_addresses)) {
      if (typeof item === 'object' && item.email_address) {
        console.error(
          `[Format Helper] Converting email object format to string`
        );
        return item.email_address;
      }
      return item;
    });
    corrected.email_addresses = converted;
  }

  // Ensure email_addresses is always an array
  if (corrected.email_addresses && !Array.isArray(corrected.email_addresses)) {
    corrected.email_addresses = [corrected.email_addresses];
    console.error(`[Format Helper] Converted email_addresses to array format`);
  }

  // Convert phone_numbers from object format to string array
  if (corrected.phone_numbers && Array.isArray(corrected.phone_numbers)) {
      if (typeof item === 'object' && (item.phone_number || item.number)) {
        console.error(
          `[Format Helper] Converting phone object format to string`
        );
        return item.phone_number || item.number;
      }
      return item;
    });
    corrected.phone_numbers = converted;
  }

  return corrected;
}

/**
 * Validates people attributes before POST to ensure correct Attio format
 * Throws validation errors if required formats are not met
 */
export function validatePeopleAttributesPrePost(attributes: unknown): void {
  // Validate name format if present
  if (attributes.name) {
    if (!Array.isArray(attributes.name)) {
      throw new Error('People name must be an array of personal-name objects');
    }

    if (attributes.name.length > 0 && !attributes.name[0].full_name) {
      throw new Error('People name[0].full_name must be a non-empty string');
    }

    if (
      attributes.name.length > 0 &&
      typeof attributes.name[0].full_name !== 'string'
    ) {
      throw new Error('People name[0].full_name must be a string');
    }

    if (
      attributes.name.length > 0 &&
      attributes.name[0].full_name.trim() === ''
    ) {
      throw new Error('People name[0].full_name must be a non-empty string');
    }
  }

  // Validate email_addresses format if present
  if (attributes.email_addresses) {
    if (!Array.isArray(attributes.email_addresses)) {
      throw new Error('People email_addresses must be an array of strings');
    }

    for (const email of attributes.email_addresses) {
      if (typeof email !== 'string') {
        throw new Error('All email_addresses must be strings, not objects');
      }
    }
  }
}

/**
 * Generates helpful error message with correct format examples
 */
export function getFormatErrorHelp(
  resourceType: string,
  attributeName: string,
  error: string
): string {
  const examples: Record<string, Record<string, string>> = {
    companies: {
      domains: `
Correct format for 'domains':
- domains: ["example.com", "www.example.com"]
- NOT: domain: "example.com"
- NOT: domains: "example.com" (must be array)

Note: Use 'domains' (plural) to avoid creating duplicate companies!`,
      type: `
The 'type' field requires a valid select option from your workspace.
Common values might include: "Customer", "Partner", "Prospect", etc.
Check your Attio workspace for valid options.`,
    },
    people: {
      name: `
Correct format for 'name':
- name: "John Doe"
- name: "Jane Smith"
- NOT: name: {first_name: "John", last_name: "Doe"}
- NOT: name: {firstName: "John", lastName: "Doe"}

The name field should be a simple string, not an object.`,
      email_addresses: `
Correct format for 'email_addresses':
- email_addresses: ["user@example.com", "alt@example.com"]
- NOT: email_addresses: [{email_address: "user@example.com"}]
- NOT: email_addresses: "user@example.com" (must be array)`,
      phone_numbers: `
Correct format for 'phone_numbers':
- phone_numbers: ["+1234567890", "+0987654321"]
- NOT: phone_numbers: [{phone_number: "+1234567890"}]`,
      company: `
Correct format for 'company' (record reference):
- company: "company_id_here"
- company: {record_id: "company_id_here"}
- NOT: company: "Company Name" (use ID, not name)`,
    },
  };

  if (helpText) {
    return `${error}\n${helpText}`;
  }

  return error;
}
