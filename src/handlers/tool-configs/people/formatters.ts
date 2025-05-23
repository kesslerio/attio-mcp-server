/**
 * Shared formatting utilities for people-related tool results
 */
import { AttioRecord, Person } from '../../../types/attio.js';
import { ContactValue } from '../../tool-types.js';

/**
 * Safely extract a person's name from an Attio record
 *
 * @param person - The person record from Attio API
 * @returns The person's name or 'Unnamed' if not found
 */
export function getPersonName(person: AttioRecord): string {
  return (
    person.values?.name?.[0]?.full_name ||
    person.values?.name?.[0]?.value ||
    person.values?.name?.[0]?.formatted ||
    person.values?.full_name?.[0]?.value ||
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
  if (!person || !person.id || !person.values) {
    return 'No person details found.';
  }

  const personId = person.id.record_id || 'unknown';
  const name = person.values.name?.[0]?.value || 'Unnamed';
  const DISPLAYED_FIELDS = ['name', 'email_addresses', 'phone_numbers', 'job_title', 'company'];

  const sections: string[] = [];
  sections.push(`# Person Details: ${name} (ID: ${personId})`);

  const contactInfo: string[] = [];
  if (person.values.email_addresses?.length) {
    contactInfo.push(
      `Email: ${person.values.email_addresses
        .map((e: ContactValue) => e.email_address || e.value || 'N/A')
        .join(', ')}`
    );
  }
  if (person.values.phone_numbers?.length) {
    contactInfo.push(
      `Phone: ${person.values.phone_numbers
        .map((p: ContactValue) => p.phone_number || p.value || 'N/A')
        .join(', ')}`
    );
  }
  if (contactInfo.length) {
    sections.push(`## Contact Information\n${contactInfo.join('\n')}`);
  }

  const professionalInfo: string[] = [];
  if (person.values.job_title?.[0]?.value) {
    professionalInfo.push(`Job Title: ${person.values.job_title[0].value}`);
  }
  if (person.values.company?.[0]?.value) {
    professionalInfo.push(`Company: ${person.values.company[0].value}`);
  }
  if (professionalInfo.length) {
    sections.push(`## Professional Information\n${professionalInfo.join('\n')}`);
  }

  const additionalAttributes: string[] = [];
  for (const [key, values] of Object.entries(person.values)) {
    if (DISPLAYED_FIELDS.includes(key)) {
      continue;
    }
    if (Array.isArray(values) && values.length > 0) {
      const formattedValues = values
        .map((v: ContactValue) => {
          if (v.value === undefined) return 'N/A';
          if (typeof v.value === 'object') return JSON.stringify(v.value);
          return String(v.value);
        })
        .join(', ');
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      additionalAttributes.push(`${displayKey}: ${formattedValues}`);
    }
  }
  if (additionalAttributes.length) {
    sections.push(`## Additional Attributes\n${additionalAttributes.join('\n')}`);
  }

  const timestamps: string[] = [];
  if (person.values.created_at?.[0]?.value) {
    timestamps.push(`Created: ${person.values.created_at[0].value}`);
  }
  if (person.values.updated_at?.[0]?.value) {
    timestamps.push(`Updated: ${person.values.updated_at[0].value}`);
  }
  if (timestamps.length) {
    sections.push(`## Timestamps\n${timestamps.join('\n')}`);
  }

  return sections.join('\n\n');
}

