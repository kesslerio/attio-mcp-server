import uFuzzy from '@leeoniya/ufuzzy';

import { parseQuery, ParsedQuery } from '@api/operations/query-parser.js';
import { AttioRecord } from '@/types/attio.js';

interface RecordInfo {
  name: string;
  domains: string[];
  emails: string[];
  phones: string[];
  phoneVariants: Set<string>;
  haystack: string;
}

interface RankedRecord<T extends AttioRecord> {
  record: T;
  score: number;
  originalIndex: number;
  info: RecordInfo;
}

const SCORE_WEIGHTS = {
  domainExact: 1200,
  domainPartial: 250,
  emailExact: 950,
  phoneExact: 900,
  nameExact: 600,
  namePrefix: 350,
  allTokensInName: 250,
  tokenInName: 90,
  tokenInDomain: 70,
  tokenInEmail: 40,
  fuzzyBase: 240,
  fuzzyStep: 24,
};

function normalizeString(value: string): string {
  return value.toLowerCase().trim();
}

function normalizeDomain(value: string): string {
  return normalizeString(
    value.replace(/^https?:\/\//, '').replace(/^www\./, '')
  );
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function collectStrings(value: unknown, keys: string[] = []): string[] {
  const results: string[] = [];

  const pushValue = (candidate: unknown) => {
    if (typeof candidate === 'string' && candidate.trim()) {
      results.push(normalizeString(candidate));
    }
  };

  if (!value) {
    return results;
  }

  if (typeof value === 'string') {
    pushValue(value);
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string') {
        pushValue(item);
      } else if (item && typeof item === 'object') {
        keys.forEach((key) => {
          pushValue((item as Record<string, unknown>)[key]);
        });
      }
    });
    return results;
  }

  if (value && typeof value === 'object') {
    keys.forEach((key) => {
      pushValue((value as Record<string, unknown>)[key]);
    });
  }

  return results;
}

function extractName(values: Record<string, unknown>): string {
  const nameValue = values.name;

  if (typeof nameValue === 'string') {
    return normalizeString(nameValue);
  }

  if (Array.isArray(nameValue) && nameValue.length > 0) {
    const first = nameValue[0];
    if (typeof first === 'string') {
      return normalizeString(first);
    }
    if (first && typeof first === 'object') {
      const candidate =
        (first as Record<string, unknown>).full_name ??
        (first as Record<string, unknown>).formatted ??
        (first as Record<string, unknown>).value;
      if (typeof candidate === 'string') {
        return normalizeString(candidate);
      }
    }
  }

  const fullName = values.full_name;
  if (typeof fullName === 'string') {
    return normalizeString(fullName);
  }

  const titleValue = values.title;
  if (typeof titleValue === 'string') {
    return normalizeString(titleValue);
  }

  return '';
}

function extractRecordInfo(record: AttioRecord): RecordInfo {
  const values = (record?.values ?? {}) as Record<string, unknown>;
  const name = extractName(values);

  const rawDomains = collectStrings(values.domains, ['domain', 'value']).map(
    normalizeDomain
  );
  const websiteValue = values.website;
  if (typeof websiteValue === 'string') {
    rawDomains.push(normalizeDomain(websiteValue));
  }

  const domains = dedupe(rawDomains);

  const emails = dedupe(
    collectStrings(values.email_addresses, ['email_address', 'value'])
  );

  const phones = dedupe(
    collectStrings(values.phone_numbers, ['number', 'normalized', 'value'])
  );

  const phoneVariants = new Set<string>();
  phones.forEach((phone) => {
    const digitsOnly = phone.replace(/\D+/g, '');
    phoneVariants.add(phone);
    if (digitsOnly) {
      phoneVariants.add(digitsOnly);
      phoneVariants.add(`+${digitsOnly}`);
      if (digitsOnly.length === 10) {
        phoneVariants.add(`+1${digitsOnly}`);
      }
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        phoneVariants.add(`+${digitsOnly}`);
      }
    }
  });

  const haystack = dedupe([name, ...domains, ...emails, ...phones])
    .filter(Boolean)
    .join(' ');

  return {
    name,
    domains,
    emails,
    phones,
    phoneVariants,
    haystack: haystack || name,
  };
}

function applyStructuredScoring<T extends AttioRecord>(
  candidate: RankedRecord<T>,
  parsed: ParsedQuery
): void {
  const { info } = candidate;

  parsed.domains.forEach((domain) => {
    const normalized = normalizeDomain(domain);
    if (info.domains.includes(normalized)) {
      candidate.score += SCORE_WEIGHTS.domainExact;
    } else if (
      info.domains.some((storedDomain) => storedDomain.includes(normalized))
    ) {
      candidate.score += SCORE_WEIGHTS.domainPartial;
    }
  });

  parsed.emails.forEach((email) => {
    const normalized = normalizeString(email);
    if (info.emails.includes(normalized)) {
      candidate.score += SCORE_WEIGHTS.emailExact;
    }
  });

  parsed.phones.forEach((phone) => {
    if (info.phoneVariants.has(phone)) {
      candidate.score += SCORE_WEIGHTS.phoneExact;
    }
  });

  if (parsed.normalizedQuery && info.name === parsed.normalizedQuery) {
    candidate.score += SCORE_WEIGHTS.nameExact;
  } else if (
    parsed.normalizedQuery &&
    info.name.startsWith(parsed.normalizedQuery)
  ) {
    candidate.score += SCORE_WEIGHTS.namePrefix;
  }

  const tokens = parsed.tokens.map((token) => token.toLowerCase());
  if (tokens.length > 0 && tokens.every((token) => info.name.includes(token))) {
    candidate.score += SCORE_WEIGHTS.allTokensInName;
  }

  tokens.forEach((token) => {
    if (info.name.includes(token)) {
      candidate.score += SCORE_WEIGHTS.tokenInName;
    }
    if (info.domains.some((domain) => domain.includes(token))) {
      candidate.score += SCORE_WEIGHTS.tokenInDomain;
    }
    if (info.emails.some((email) => email.includes(token))) {
      candidate.score += SCORE_WEIGHTS.tokenInEmail;
    }
  });
}

function applyFuzzyScoring<T extends AttioRecord>(
  candidates: RankedRecord<T>[],
  parsed: ParsedQuery
): void {
  const needle =
    parsed.normalizedQuery ||
    parsed.tokens.join(' ').toLowerCase() ||
    parsed.domains.join(' ').toLowerCase();

  if (!needle) {
    return;
  }

  const haystack = candidates.map(({ info }) => info.haystack || info.name);

  const uf = new uFuzzy({ unicode: true });
  const searchResult = uf.search(haystack, needle);

  if (!searchResult) {
    return;
  }

  const indices = searchResult[0];
  const order = searchResult[2];

  if (!Array.isArray(indices) || indices.length === 0) {
    return;
  }

  indices.forEach((matchIdx: number, resultIdx: number) => {
    if (typeof matchIdx !== 'number' || matchIdx >= candidates.length) {
      return;
    }
    const orderValue =
      Array.isArray(order) && typeof order[resultIdx] === 'number'
        ? (order[resultIdx] as number)
        : resultIdx;
    const bonus =
      SCORE_WEIGHTS.fuzzyBase -
      SCORE_WEIGHTS.fuzzyStep * Math.min(orderValue, 10);
    candidates[matchIdx].score += Math.max(0, bonus);
  });
}

export function scoreAndRank<T extends AttioRecord>(
  query: string,
  results: T[],
  parsedInput?: ParsedQuery
): T[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || results.length <= 1) {
    return results.slice();
  }

  const parsed = parsedInput ?? parseQuery(trimmedQuery);

  const candidates: RankedRecord<T>[] = results.map((record, index) => ({
    record,
    originalIndex: index,
    score: 0,
    info: extractRecordInfo(record),
  }));

  candidates.forEach((candidate) => {
    applyStructuredScoring(candidate, parsed);
  });

  applyFuzzyScoring(candidates, parsed);

  return candidates
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    })
    .map((candidate) => candidate.record);
}
