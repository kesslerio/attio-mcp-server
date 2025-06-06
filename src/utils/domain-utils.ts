/**
 * Utility functions for domain extraction and validation
 */

/**
 * Extracts domain from various input formats
 *
 * @param input - Input string that may contain a domain, URL, or email
 * @returns Extracted domain or null if no valid domain found
 * @example
 * ```typescript
 * extractDomain("https://example.com/path") // Returns "example.com"
 * extractDomain("john@example.com") // Returns "example.com"
 * extractDomain("example.com") // Returns "example.com"
 * extractDomain("company name") // Returns null
 * ```
 */
export function extractDomain(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Clean up input
  const cleanInput = input.trim().toLowerCase();

  // Check for email format
  const emailMatch = cleanInput.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if (emailMatch) {
    return emailMatch[1];
  }

  // Check for URL format
  try {
    const url = new URL(
      cleanInput.startsWith('http') ? cleanInput : `https://${cleanInput}`
    );
    const hostname = url.hostname;

    // Validate that hostname looks like a domain
    if (isValidDomain(hostname)) {
      return normalizeDomain(hostname);
    }
  } catch (error) {
    // Not a valid URL, continue with other checks
  }

  // Check if input is already a domain
  if (isValidDomain(cleanInput)) {
    return normalizeDomain(cleanInput);
  }

  // Try to extract domain from text that might contain a domain
  const domainPattern =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
  const match = cleanInput.match(domainPattern);
  if (match && isValidDomain(match[1])) {
    return normalizeDomain(match[1]);
  }

  return null;
}

/**
 * Validates if a string is a valid domain format
 *
 * @param domain - Domain string to validate
 * @returns True if domain appears valid
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic domain validation
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Normalizes domain for consistent matching
 *
 * @param domain - Domain to normalize
 * @returns Normalized domain
 */
export function normalizeDomain(domain: string): string {
  if (!domain) {
    return '';
  }

  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
}

/**
 * Checks if a query likely contains a domain
 *
 * @param query - Search query to analyze
 * @returns True if query appears to contain domain information
 */
export function hasDomainIndicators(query: string): boolean {
  if (!query) {
    return false;
  }

  const indicators = [
    /\.(com|org|net|edu|gov|mil|io|co|ai|tech|app|dev|xyz)/i,
    /@[a-zA-Z0-9-]+\./,
    /https?:\/\//,
    /www\./,
  ];

  return indicators.some((pattern) => pattern.test(query));
}

/**
 * Extracts multiple potential domains from a query
 *
 * @param query - Query that may contain multiple domains
 * @returns Array of extracted domains
 */
export function extractAllDomains(query: string): string[] {
  if (!query) {
    return [];
  }

  const domains: string[] = [];

  // Extract email domains
  const emailMatches = query.match(/[^\s@]+@([^\s@]+\.[^\s@]+)/g);
  if (emailMatches) {
    emailMatches.forEach((email) => {
      const domain = extractDomain(email);
      if (domain) {
        domains.push(domain);
      }
    });
  }

  // Extract URL domains
  const urlMatches = query.match(/https?:\/\/[^\s]+/g);
  if (urlMatches) {
    urlMatches.forEach((url) => {
      const domain = extractDomain(url);
      if (domain) {
        domains.push(domain);
      }
    });
  }

  // Extract standalone domains (including subdomains)
  const domainMatches = query.match(
    /(?:^|\s|,)([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})(?=\s|,|$)/g
  );
  if (domainMatches) {
    domainMatches.forEach((match) => {
      const domain = extractDomain(match.trim().replace(/^[,\s]+/, ''));
      if (domain) {
        domains.push(domain);
      }
    });
  }

  // Remove duplicates and normalize
  return [...new Set(domains.map(normalizeDomain))];
}
