/**
 * Debug script to test domain extraction with failing query
 */

// Test the specific failing query
const query = 'The Plastics Doc theplasticsdoc.com';

console.log('Testing domain extraction for:', query);
console.log('');

// Test domain patterns manually
const patterns = {
  // Current pattern for standalone domains
  standalone: /(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\s|$)/g,

  // Improved pattern that can find domains without requiring trailing space
  improved: /(?:^|\s)([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?=\s|$|[^\w.-])/g,

  // Even more flexible pattern
  flexible: /\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b/g,

  // Pattern that doesn't require word boundaries
  general: /([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g,
};

console.log('Pattern testing:');
Object.entries(patterns).forEach(([name, pattern]) => {
  const matches = query.match(pattern);
  console.log(`${name}:`, matches || 'No matches');
});

console.log('');

// Test the domain validation function
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic domain validation
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

// Test individual domain extraction
const possibleDomain = 'theplasticsdoc.com';
console.log(
  `Testing domain validation for "${possibleDomain}":`,
  isValidDomain(possibleDomain)
);

// Test extractDomain function logic manually
function extractDomainManual(input) {
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
      return hostname;
    }
  } catch (error) {
    // Not a valid URL, continue with other checks
  }

  // Check if input is already a domain
  if (isValidDomain(cleanInput)) {
    return cleanInput;
  }

  // Try to extract domain from text that might contain a domain
  const domainPattern =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
  const match = cleanInput.match(domainPattern);
  if (match && isValidDomain(match[1])) {
    return match[1];
  }

  return null;
}

console.log('');
console.log('Manual extractDomain test:');
console.log(`extractDomain("${query}"):`, extractDomainManual(query));
console.log(
  `extractDomain("${possibleDomain}"):`,
  extractDomainManual(possibleDomain)
);

// Test different variations
const testCases = [
  'theplasticsdoc.com',
  'The Plastics Doc theplasticsdoc.com',
  'Visit theplasticsdoc.com today',
  'theplasticsdoc.com is great',
  'Contact support@theplasticsdoc.com',
  'https://theplasticsdoc.com',
];

console.log('');
console.log('Test cases:');
testCases.forEach((testCase) => {
  console.log(`"${testCase}" ->`, extractDomainManual(testCase));
});
