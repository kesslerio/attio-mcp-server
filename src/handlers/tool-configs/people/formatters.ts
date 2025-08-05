/**
 * Shared formatting utilities for people-related tool results
 */
import type { AttioRecord, Person } from '../../../types/attio.js';
import type { ContactValue } from '../../../types/tool-types.js';

/**
 * Safely extract a person's name from an Attio record
 *
 * @param person - The person record from Attio API
 * @returns The person's name or 'Unnamed' if not found
 */
export function getPersonName(person: AttioRecord): string {
  const values = person.values as any;
  return (
    values?.name?.[0]?.full_name ||
    values?.name?.[0]?.value ||
    values?.name?.[0]?.formatted ||
    values?.full_name?.[0]?.value ||
    (person as any).attributes?.name?.value ||
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
  if (!(person && person.id && person.values)) {
    return 'No person details found.';
  }

  const personId = person.id.record_id || 'unknown';
  const values = person.values as any;
  const name = values.name?.[0]?.value || 'Unnamed';
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
  if (values.email_addresses?.length) {
    contactInfo.push(
      `Email: ${values.email_addresses
        .map((e: ContactValue) => e.email_address || e.value || 'N/A')
        .join(', ')}`
    );
  }
  if (values.phone_numbers?.length) {
    contactInfo.push(
      `Phone: ${values.phone_numbers
        .map((p: ContactValue) => p.phone_number || p.value || 'N/A')
        .join(', ')}`
    );
  }
  if (contactInfo.length) {
    sections.push(`## Contact Information\n${contactInfo.join('\n')}`);
  }

  const professionalInfo: string[] = [];
  if (values.job_title?.[0]?.value) {
    professionalInfo.push(`Job Title: ${values.job_title[0].value}`);
  }
  if (values.company?.[0]?.value) {
    professionalInfo.push(`Company: ${values.company[0].value}`);
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
        .map((v: ContactValue) => {
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
  if (values.created_at?.[0]?.value) {
    timestamps.push(`Created: ${values.created_at[0].value}`);
  }
  if (values.updated_at?.[0]?.value) {
    timestamps.push(`Updated: ${values.updated_at[0].value}`);
  }
  if (timestamps.length) {
    sections.push(`## Timestamps\n${timestamps.join('\n')}`);
  }

  return sections.join('\n\n');
}
