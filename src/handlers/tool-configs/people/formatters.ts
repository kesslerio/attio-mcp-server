/**
 * Shared formatting utilities for people-related tool results
 */
import { AttioRecord, Person } from '../../../types/attio.js';
import { ContactValue } from '../../../types/tool-types.js';

/**
 * Safely extract a person's name from an Attio record
 *
 * @param person - The person record from Attio API
 * @returns The person's name or 'Unnamed' if not found
 */
export function getPersonName(person: AttioRecord): string {
  const values = person.values as Record<string, unknown>;
  const nameField = values?.name as
    | Array<{ value?: unknown; full_name?: unknown; formatted?: unknown }>
    | undefined;
  const fullNameField = values?.full_name as
    | Array<{ value?: unknown }>
    | undefined;
  return (
    String(nameField?.[0]?.full_name || '') ||
    String(nameField?.[0]?.value || '') ||
    String(nameField?.[0]?.formatted || '') ||
    String(fullNameField?.[0]?.value || '') ||
    String(
      (person as { attributes?: { name?: { value?: string } } }).attributes
        ?.name?.value || ''
    ) ||
    'Unnamed'
  );
}

/**
 * Format a Person object into a readable markdown string
 *
 * @param person - The person record
 * @returns Formatted person details
 */
export function formatPersonDetails(person: Person): string {
  if (!person || !person.id || !person.values) {
    return 'No person details found.';
  }

  const personId = person.id.record_id || 'unknown';
  const values = person.values as Record<string, unknown>;
  const nameField = values.name as Array<{ value?: unknown }> | undefined;
  const name = String(nameField?.[0]?.value || 'Unnamed');
  const DISPLAYED_FIELDS = [
    'name',
    'email_addresses',
    'phone_numbers',
    'job_title',
    'company',
  ];

  const sections: string[] = [];
  sections.push(`# Person Details: ${name} (ID: ${personId})`);

  const contactInfo: string[] = [];
  const emailAddresses = values.email_addresses as
    | Array<{ email_address?: string; value?: string }>
    | undefined;
  if (emailAddresses?.length) {
    contactInfo.push(
      `Email: ${emailAddresses
        .map((e) => e.email_address || e.value || 'N/A')
        .join(', ')}`
    );
  }
  const phoneNumbers = values.phone_numbers as
    | Array<{ phone_number?: string; value?: string }>
    | undefined;
  if (phoneNumbers?.length) {
    contactInfo.push(
      `Phone: ${phoneNumbers
        .map((p) => p.phone_number || p.value || 'N/A')
        .join(', ')}`
    );
  }
  if (contactInfo.length) {
    sections.push(`## Contact Information\n${contactInfo.join('\n')}`);
  }

  const professionalInfo: string[] = [];
  const jobTitleField = values.job_title as
    | Array<{ value?: unknown }>
    | undefined;
  if (jobTitleField?.[0]?.value) {
    professionalInfo.push(`Job Title: ${String(jobTitleField[0].value)}`);
  }
  const companyField = values.company as Array<{ value?: unknown }> | undefined;
  if (companyField?.[0]?.value) {
    professionalInfo.push(`Company: ${String(companyField[0].value)}`);
  }
  if (professionalInfo.length) {
    sections.push(
      `## Professional Information\n${professionalInfo.join('\n')}`
    );
  }

  const additionalAttributes: string[] = [];
  for (const [key, fieldValues] of Object.entries(values)) {
    if (DISPLAYED_FIELDS.includes(key)) {
      continue;
    }
    if (Array.isArray(fieldValues) && fieldValues.length > 0) {
      const formattedValues = fieldValues
        .map((v: { value?: unknown }) => {
          if (v.value === undefined) return 'N/A';
          if (typeof v.value === 'object') return JSON.stringify(v.value);
          return String(v.value);
        })
        .join(', ');
      const displayKey = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      additionalAttributes.push(`${displayKey}: ${formattedValues}`);
    }
  }
  if (additionalAttributes.length) {
    sections.push(
      `## Additional Attributes\n${additionalAttributes.join('\n')}`
    );
  }

  const timestamps: string[] = [];
  const createdAtField = values.created_at as
    | Array<{ value?: unknown }>
    | undefined;
  if (createdAtField?.[0]?.value) {
    timestamps.push(`Created: ${String(createdAtField[0].value)}`);
  }
  const updatedAtField = values.updated_at as
    | Array<{ value?: unknown }>
    | undefined;
  if (updatedAtField?.[0]?.value) {
    timestamps.push(`Updated: ${String(updatedAtField[0].value)}`);
  }
  if (timestamps.length) {
    sections.push(`## Timestamps\n${timestamps.join('\n')}`);
  }

  return sections.join('\n\n');
}
