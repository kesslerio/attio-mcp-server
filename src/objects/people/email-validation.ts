/**
 * Email validation service for People operations
 * Handles batch email duplicate checking for performance optimization
 */

import { getLazyAttioClient } from '../../api/lazy-client.js';
import { searchPeopleByEmail } from './search.js';

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

  const client = getLazyAttioClient();
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
