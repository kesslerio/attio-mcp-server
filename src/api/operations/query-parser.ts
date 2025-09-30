import { z } from 'zod';

const nonDigitRegex = /\D+/g;

const parsedQuerySchema = z.object({
  originalQuery: z.string(),
  normalizedQuery: z.string(),
  tokens: z.array(z.string()),
  emails: z.array(z.string()),
  domains: z.array(z.string()),
  phones: z.array(z.string()),
});

export type ParsedQuery = z.infer<typeof parsedQuerySchema>;

const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const phoneRegex =
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;

function extractEmails(query: string): { emails: string[]; remaining: string } {
  const matches = query.match(emailRegex) || [];
  let remaining = query;
  matches.forEach((match) => {
    remaining = remaining.replace(match, ' ');
  });
  return { emails: matches.map((email) => email.toLowerCase()), remaining };
}

function extractPhones(query: string): { phones: string[]; remaining: string } {
  const matches = query.match(phoneRegex) || [];
  let remaining = query;
  const phoneVariants = new Set<string>();

  matches.forEach((match) => {
    remaining = remaining.replace(match, ' ');

    const digitsOnly = match.replace(nonDigitRegex, '');
    if (digitsOnly.length < 7) {
      return;
    }

    const withCountryCode =
      digitsOnly.length === 10 ? `+1${digitsOnly}` : `+${digitsOnly}`;

    phoneVariants.add(withCountryCode);
    phoneVariants.add(digitsOnly);
  });

  return { phones: Array.from(phoneVariants), remaining };
}

function extractDomains(emails: string[]): string[] {
  return Array.from(
    new Set(
      emails
        .map((email) => email.split('@')[1])
        .filter((domain): domain is string => Boolean(domain))
    )
  );
}

function tokenize(query: string): string[] {
  return query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase());
}

export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return parsedQuerySchema.parse({
      originalQuery: query,
      normalizedQuery: '',
      tokens: [],
      emails: [],
      domains: [],
      phones: [],
    });
  }

  const emailResults = extractEmails(trimmed);
  const phoneResults = extractPhones(emailResults.remaining);

  const emails = emailResults.emails;
  const phones = phoneResults.phones;
  const domains = extractDomains(emails);
  const tokens = tokenize(phoneResults.remaining);

  return parsedQuerySchema.parse({
    originalQuery: query,
    normalizedQuery: trimmed.toLowerCase(),
    tokens,
    emails,
    domains,
    phones,
  });
}
