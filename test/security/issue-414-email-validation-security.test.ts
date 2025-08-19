/**
 * Comprehensive Email Validation Security Tests for Issue #414
 *
 * This test suite provides thorough security testing for email validation,
 * focusing on:
 * - Email injection attack prevention
 * - Header injection prevention
 * - Configuration security testing
 * - DoS protection via email validation
 * - Edge cases and boundary conditions
 * - Performance and memory safety
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import {
  isValidEmail,
  validateEmails,
  normalizeEmail,
} from '../../src/utils/validation/email-validation.js';
import { UniversalValidationError } from '../../src/handlers/tool-configs/universal/schemas.js';
import {
  EmailValidationMode,
  EmailValidationConfig,
  DEFAULT_EMAIL_VALIDATION_CONFIG,
  LEGACY_EMAIL_VALIDATION_CONFIG,
  WARN_EMAIL_VALIDATION_CONFIG,
} from '../../src/utils/normalization/email-validation-config.js';

describe('Issue #414: Email Validation Security Tests', () => {
  let mockLogger: vi.MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = vi.fn();
  });

  describe('CRITICAL: Email Header Injection Prevention', () => {
    describe('SMTP Header Injection Attacks', () => {
      it('should prevent SMTP header injection via newline characters', () => {
        const headerInjectionEmails = [
          'user@domain.com\nBcc: attacker@evil.com',
          'user@domain.com\rBcc: attacker@evil.com',
          'user@domain.com\r\nBcc: attacker@evil.com',
          'user@domain.com\n\rBcc: attacker@evil.com',
          'user@domain.com\nCc: spam@evil.com\nBcc: more@evil.com',
          'user@domain.com\nSubject: SPAM MESSAGE',
          'user@domain.com\nContent-Type: text/html',
          'user@domain.com\nX-Mailer: Evil Script',
        ];

        headerInjectionEmails.forEach((maliciousEmail) => {
          expect(isValidEmail(maliciousEmail)).toBe(false);

          expect(() => {
            PeopleDataNormalizer.normalizeEmails(
              maliciousEmail,
              DEFAULT_EMAIL_VALIDATION_CONFIG
            );
          }).toThrow(UniversalValidationError);
        });
      });
    });

    describe('Email Content Injection Prevention', () => {
      it('should prevent email content injection attempts', () => {
        const contentInjectionEmails = [
          'user@domain.com\nMIME-Version: 1.0',
          'user@domain.com\nContent-Transfer-Encoding: base64',
          'user@domain.com\nMessage-ID: <spam@evil.com>',
          'user@domain.com\nReply-To: attacker@evil.com',
          'user@domain.com\nReturn-Path: bounce@evil.com',
          'user@domain.com\nReceived: from evil.com',
        ];

        contentInjectionEmails.forEach((maliciousEmail) => {
          expect(isValidEmail(maliciousEmail)).toBe(false);
        });
      });
    });

    describe('Multi-line Email Address Prevention', () => {
      it('should reject multi-line email addresses completely', () => {
        const multiLineEmails = [
          'line1@domain.com\nline2@domain.com',
          'user@domain1.com\r\nuser@domain2.com',
          'first@domain.com\nsecond@domain.com\nthird@domain.com',
          'user@\ndomain.com', // Split domain
          'user\n@domain.com', // Split local part
        ];

        multiLineEmails.forEach((email) => {
          expect(isValidEmail(email)).toBe(false);

          expect(() => {
            PeopleDataNormalizer.normalizeEmails(email);
          }).toThrow(UniversalValidationError);
        });
      });
    });
  });

  describe('CRITICAL: Email Validation DoS Protection', () => {
    describe('Large Email Array DoS Protection', () => {
      it('should handle large arrays of emails efficiently', () => {
        const largeEmailArray = Array.from(
          { length: 1000 },
          (_, i) => `user${i}@domain${i % 10}.com`
        );

        const startTime = performance.now();

        const results = largeEmailArray.map((email) => {
          try {
            return PeopleDataNormalizer.normalizeEmails(email);
          } catch {
            return null;
          }
        });

        const endTime = performance.now();
        const processingTime = endTime - startTime;

        expect(processingTime).toBeLessThan(5000); // Should complete in <5s
        expect(results.filter(Boolean)).toHaveLength(1000); // All should be valid
      });

      it('should handle mixed valid/invalid email arrays', () => {
        const mixedArray = Array.from({ length: 500 }, (_, i) => {
          if (i % 3 === 0) return 'invalid-email'; // Every 3rd is invalid
          if (i % 5 === 0) return `user${i}@domain`; // Every 5th missing TLD
          return `valid${i}@domain.com`; // Rest are valid
        });

        const startTime = performance.now();

        const results = mixedArray.map((email) => {
          try {
            return PeopleDataNormalizer.normalizeEmails(email);
          } catch {
            return null;
          }
        });

        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(2000); // Should handle quickly

        const validCount = results.filter(Boolean).length;
        const invalidCount = results.filter((result) => result === null).length;

        expect(validCount).toBeGreaterThan(0);
        expect(invalidCount).toBeGreaterThan(0);
        expect(validCount + invalidCount).toBe(500);
      });
    });

    describe('Extremely Long Email DoS Protection', () => {
      it('should reject extremely long email addresses', () => {
        const extremelyLongLocal = 'a'.repeat(1000);
        const extremelyLongDomain = 'b'.repeat(1000) + '.com';
        const extremelyLongEmail =
          extremelyLongLocal + '@' + extremelyLongDomain;

        expect(isValidEmail(extremelyLongEmail)).toBe(false);

        expect(() => {
          PeopleDataNormalizer.normalizeEmails(extremelyLongEmail);
        }).toThrow(UniversalValidationError);
      });

      it('should handle RFC-compliant length limits efficiently', () => {
        const maxLocalPart = 'a'.repeat(64); // RFC 5321 limit
        const maxDomainPart = 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.com'; // Just within limits
        const maxLengthEmail = maxLocalPart + '@' + maxDomainPart;

        const startTime = performance.now();
        const isValid = isValidEmail(maxLengthEmail);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(10); // Should be very fast
        expect(isValid).toBe(true);
      });

      it('should reject emails exceeding RFC length limits', () => {
        const tooLongLocal = 'a'.repeat(65); // Exceeds 64 char limit
        const tooLongEmail = tooLongLocal + '@domain.com';

        expect(isValidEmail(tooLongEmail)).toBe(false);
      });
    });

    describe('Complex Email Pattern DoS Protection', () => {
      it('should handle complex but valid email patterns efficiently', () => {
        const complexEmails = [
          'user.with.many.dots@sub.domain.co.uk',
          'user+tag+more+tags@domain.com',
          'user.name+tag.more@very.long.subdomain.domain.org',
          'complex.user.123+tag@multi.level.domain.co.uk',
          'user-name.with-dashes+tag@sub-domain.domain-name.com',
        ];

        const startTime = performance.now();

        complexEmails.forEach((email) => {
          expect(isValidEmail(email)).toBe(true);
          expect(() => {
            const result = PeopleDataNormalizer.normalizeEmails(email);
            expect(result).toBeDefined();
          }).not.toThrow();
        });

        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      });
    });
  });

  describe('CRITICAL: Email Validation Configuration Security', () => {
    describe('Strict Mode Security Validation', () => {
      it('should enforce strict validation and throw on all invalid formats', () => {
        const strictConfig: EmailValidationConfig = {
          mode: EmailValidationMode.STRICT,
          logDeprecationWarnings: false,
          logger: mockLogger,
        };

        const invalidEmails = [
          'plainaddress',
          '@missinglocal.com',
          'user@',
          'user@domain',
          'user..double@domain.com',
          'user@domain..double.com',
          'user name@domain.com', // Space
          'user@domain .com', // Space in domain
          '', // Empty
          '   ', // Whitespace only
        ];

        invalidEmails.forEach((invalidEmail) => {
          expect(() => {
            PeopleDataNormalizer.normalizeEmails(invalidEmail, strictConfig);
          }).toThrow(UniversalValidationError);
        });

        expect(mockLogger).not.toHaveBeenCalled(); // No logging in strict mode
      });
    });

    describe('Legacy Mode Security Implications', () => {
      it('should log deprecation warnings in legacy mode', () => {
        const legacyConfig: EmailValidationConfig = {
          mode: EmailValidationMode.LEGACY,
          logDeprecationWarnings: true,
          logger: mockLogger,
        };

        const result = PeopleDataNormalizer.normalizeEmails(
          'invalid-email',
          legacyConfig
        );

        expect(result).toBeUndefined(); // Should silently fail
        expect(mockLogger).toHaveBeenCalledWith(
          expect.stringContaining('DEPRECATION WARNING'),
          'warn'
        );
      });

      it('should not expose security risks through legacy mode', () => {
        const legacyConfig = LEGACY_EMAIL_VALIDATION_CONFIG;

        // Even in legacy mode, dangerous patterns should not be processed
        const dangerousEmails = [
          'user@domain.com\nBcc: attacker@evil.com',
          'user@domain.com\r\nSubject: SPAM',
        ];

        dangerousEmails.forEach((email) => {
          const result = PeopleDataNormalizer.normalizeEmails(
            email,
            legacyConfig
          );
          expect(result).toBeUndefined(); // Should be rejected
        });
      });
    });

    describe('Warn Mode Security Testing', () => {
      it('should log warnings but not throw in warn mode', () => {
        const warnConfig: EmailValidationConfig = {
          mode: EmailValidationMode.WARN,
          logDeprecationWarnings: false,
          logger: mockLogger,
        };

        const result = PeopleDataNormalizer.normalizeEmails(
          'invalid@email',
          warnConfig
        );

        expect(result).toBeUndefined(); // Should silently fail
        expect(mockLogger).toHaveBeenCalledWith(
          expect.stringContaining('WARNING: Invalid email format'),
          'warn'
        );
      });
    });

    describe('Environment Variable Security', () => {
      it('should not allow invalid modes through environment variables', async () => {
        const originalEnv = process.env.EMAIL_VALIDATION_MODE;

        // Test invalid mode
        process.env.EMAIL_VALIDATION_MODE = 'invalid_mode';

        const { getEmailValidationConfig } = await import(
          '../../src/utils/normalization/email-validation-config.js'
        );
        const config = getEmailValidationConfig();
        expect(config.mode).toBe(EmailValidationMode.STRICT); // Should fall back to default

        // Restore original
        process.env.EMAIL_VALIDATION_MODE = originalEnv;
      });
    });
  });

  describe('CRITICAL: Email Normalization Security', () => {
    describe('Case Sensitivity Security', () => {
      it('should normalize email case consistently', () => {
        const testCases = [
          { input: 'USER@DOMAIN.COM', expected: 'user@domain.com' },
          { input: 'User.Name@Domain.Com', expected: 'user.name@domain.com' },
          { input: 'ADMIN@COMPANY.ORG', expected: 'admin@company.org' },
        ];

        testCases.forEach(({ input, expected }) => {
          const normalized = normalizeEmail(input);
          expect(normalized).toBe(expected);

          const result = PeopleDataNormalizer.normalizeEmails(input);
          expect(result![0].email_address).toBe(expected);
        });
      });
    });

    describe('Email Format Consistency Security', () => {
      it('should maintain consistent email object structure', () => {
        const validEmail = 'test@domain.com';
        const result = PeopleDataNormalizer.normalizeEmails(validEmail);

        expect(result).toHaveLength(1);
        expect(result![0]).toMatchObject({
          email_address: expect.any(String),
        });
        expect(result![0].email_address).toBe('test@domain.com');
        expect(Object.keys(result![0])).toEqual(['email_address']);
      });

      it('should preserve email_type when provided securely', () => {
        const emailWithType = {
          email_address: 'work@company.com',
          email_type: 'work',
        };

        const result = PeopleDataNormalizer.normalizeEmails(emailWithType);

        expect(result).toHaveLength(1);
        expect(result![0]).toMatchObject({
          email_address: 'work@company.com',
          email_type: 'work',
        });
      });
    });
  });

  describe('EDGE CASES: Email Security Edge Cases', () => {
    describe('Null and Undefined Handling', () => {
      it('should handle null/undefined inputs safely', () => {
        expect(PeopleDataNormalizer.normalizeEmails(null)).toBeUndefined();
        expect(PeopleDataNormalizer.normalizeEmails(undefined)).toBeUndefined();
        expect(PeopleDataNormalizer.normalizeEmails('')).toBeUndefined();
        expect(PeopleDataNormalizer.normalizeEmails('   ')).toBeUndefined();
      });
    });

    describe('Complex Input Structure Handling', () => {
      it('should handle deeply nested email structures safely', () => {
        const complexInput = {
          user: {
            contact: {
              email_addresses: [
                { email_address: 'valid@domain.com', type: 'work' },
              ],
            },
          },
        };

        // Should not crash on complex nesting
        const result = PeopleDataNormalizer.normalizeEmails(complexInput);
        expect(result).toBeUndefined(); // No direct email fields at root
      });

      it('should handle malformed email objects safely', () => {
        const malformedInputs = [
          { email_address: null },
          { email_address: undefined },
          { email_address: {} },
          { email_address: [] },
          { email_address: 123 },
          { email_addresses: 'not_an_array' },
          { email_addresses: [null, undefined, {}] },
        ];

        malformedInputs.forEach((input) => {
          expect(() => {
            const result = PeopleDataNormalizer.normalizeEmails(input);
            // Should either return undefined or valid result, never crash
            if (result) {
              expect(Array.isArray(result)).toBe(true);
            }
          }).not.toThrow();
        });
      });
    });

    describe('Unicode and Internationalization Security', () => {
      it('should handle international domain names safely', () => {
        // International domain names (should be handled by modern email validation)
        const internationalEmails = [
          'user@münchen.de', // German umlaut
          'user@москва.рф', // Cyrillic
          'user@中国.cn', // Chinese
          'user@日本.jp', // Japanese
        ];

        // Note: Our current validation may not support IDN, which is acceptable for security
        internationalEmails.forEach((email) => {
          // Should either be valid or safely rejected
          const isValid = isValidEmail(email);
          if (!isValid) {
            expect(() => {
              PeopleDataNormalizer.normalizeEmails(email);
            }).toThrow(UniversalValidationError);
          }
        });
      });

      it('should handle emoji and special characters in email safely', () => {
        const specialCharEmails = [
          'user@😀domain.com', // Emoji in domain
          'user😀@domain.com', // Emoji in local part
          'user@domain.com💀', // Emoji at end
          'user+🔒tag@domain.com', // Emoji in tag
        ];

        specialCharEmails.forEach((email) => {
          // Should be safely rejected
          expect(isValidEmail(email)).toBe(false);
          expect(() => {
            PeopleDataNormalizer.normalizeEmails(email);
          }).toThrow(UniversalValidationError);
        });
      });
    });
  });

  describe('PERFORMANCE: Email Validation Performance Security', () => {
    describe('Regex Performance Security (ReDoS Prevention)', () => {
      it('should handle potentially catastrophic regex inputs efficiently', () => {
        // Patterns that could cause regex denial of service
        const redosPatterns = [
          'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com',
          'user@' + 'sub.'.repeat(100) + 'domain.com',
          'user+' + 'tag.'.repeat(100) + '@domain.com',
          'user.' + 'name.'.repeat(50) + '@domain.com',
        ];

        redosPatterns.forEach((pattern) => {
          const startTime = performance.now();
          const result = isValidEmail(pattern);
          const endTime = performance.now();

          // Should complete quickly regardless of result
          expect(endTime - startTime).toBeLessThan(100);

          // If valid, should work with normalizer
          if (result) {
            expect(() => {
              PeopleDataNormalizer.normalizeEmails(pattern);
            }).not.toThrow();
          }
        });
      });
    });

    describe('Memory Usage Security', () => {
      it('should not consume excessive memory during validation', () => {
        const memoryTestEmails = Array.from(
          { length: 10000 },
          (_, i) => `user${i}@domain${i % 100}.com`
        );

        const startMemory = process.memoryUsage().heapUsed;

        // Process in chunks to avoid overwhelming
        for (let i = 0; i < memoryTestEmails.length; i += 100) {
          const chunk = memoryTestEmails.slice(i, i + 100);
          chunk.forEach((email) => {
            isValidEmail(email);
          });
        }

        const endMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = endMemory - startMemory;

        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      });
    });

    describe('Concurrent Validation Security', () => {
      it('should handle concurrent email validation safely', async () => {
        const concurrentEmails = Array.from(
          { length: 100 },
          (_, i) => `concurrent${i}@domain${i % 10}.com`
        );

        const concurrentPromises = concurrentEmails.map((email) =>
          Promise.resolve(isValidEmail(email))
        );

        const startTime = performance.now();
        const results = await Promise.all(concurrentPromises);
        const endTime = performance.now();

        expect(results).toHaveLength(100);
        expect(results.every((result) => result === true)).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      });
    });
  });
});
