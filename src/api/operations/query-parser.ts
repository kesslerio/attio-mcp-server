import { z } from 'zod';

const NON_DIGIT_PATTERN = /\D+/g;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_CANDIDATE_PATTERN = /\+?\d[\d().\s-]{5,}\d/g;
const DOMAIN_PATTERN = /\b(?:[a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}\b/g;

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

const parsedQuerySchema = z.object({
  originalQuery: z.string(),
  normalizedQuery: z.string(),
  tokens: z.array(z.string()),
  emails: z.array(z.string()),
  domains: z.array(z.string()),
  phones: z.array(z.string()),
});

export type ParsedQuery = z.infer<typeof parsedQuerySchema>;

function extractEmails(query: string): { emails: string[]; remaining: string } {
  const matches = query.match(EMAIL_PATTERN) || [];
  let remaining = query;
  matches.forEach((match) => {
    remaining = remaining.replace(match, ' ');
  });
  return { emails: matches.map((email) => email.toLowerCase()), remaining };
}

function looksLikeNorthAmericanNumber(digitsOnly: string) {
  if (digitsOnly.length !== 10) {
    return false;
  }

  const firstDigit = digitsOnly[0];
  return firstDigit >= '2' && firstDigit <= '9';
}

function extractPhones(query: string): { phones: string[]; remaining: string } {
  const matches = query.match(PHONE_CANDIDATE_PATTERN) || [];
  let remaining = query;
  const phoneVariants = new Set<string>();

  matches.forEach((match) => {
    remaining = remaining.replace(match, ' ');

    const digitsOnly = match.replace(NON_DIGIT_PATTERN, '');
    if (
      digitsOnly.length < MIN_PHONE_DIGITS ||
      digitsOnly.length > MAX_PHONE_DIGITS
    ) {
      return;
    }

    const trimmed = match.trim();
    const hasExplicitPlus = trimmed.startsWith('+');

    phoneVariants.add(digitsOnly);

    if (hasExplicitPlus || digitsOnly.length > 11) {
      phoneVariants.add(`+${digitsOnly}`);
    }

    if (!hasExplicitPlus && looksLikeNorthAmericanNumber(digitsOnly)) {
      phoneVariants.add(`+1${digitsOnly}`);
    }

    if (
      !hasExplicitPlus &&
      digitsOnly.length === 11 &&
      digitsOnly.startsWith('1')
    ) {
      phoneVariants.add(`+${digitsOnly}`);
    }
  });

  return { phones: Array.from(phoneVariants), remaining };
}

function extractDomains(
  query: string,
  emails: string[]
): { domains: string[]; remaining: string } {
  // Extract domains from emails
  const domainsFromEmails = emails
    .map((email) => email.split('@')[1])
    .filter((domain): domain is string => Boolean(domain));

  // Extract standalone domains from query
  const standaloneDomains = query.match(DOMAIN_PATTERN) || [];
  let remaining = query;
  standaloneDomains.forEach((match) => {
    remaining = remaining.replace(match, ' ');
  });

  return {
    domains: Array.from(
      new Set([
        ...domainsFromEmails,
        ...standaloneDomains.map((d) => d.toLowerCase()),
      ])
    ),
    remaining,
  };
}

function tokenize(query: string): string[] {
  const seen = new Set<string>();

  return query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (!token) {
        return false;
      }

      const normalized = token.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
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
  const domainResults = extractDomains(
    phoneResults.remaining,
    emailResults.emails
  );

  const emails = emailResults.emails;
  const phones = phoneResults.phones;
  const domains = domainResults.domains;
  const tokens = tokenize(domainResults.remaining);

  return parsedQuerySchema.parse({
    originalQuery: query,
    normalizedQuery: trimmed.toLowerCase(),
    tokens,
    emails,
    domains,
    phones,
  });
}
