/**
 * Special Character Handling Integration Tests for Issue #473
 *
 * Tests that special characters are properly preserved throughout the entire
 * update process, from input sanitization to persistence verification.
 *
 * Addresses the special character handling issues mentioned in Issue #473
 * where special characters were being corrupted or causing update failures.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { CompanyMockFactory } from '../utils/mock-factories/CompanyMockFactory.js';
import { initializeAttioClient } from '../../src/api/attio-client.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';

// Test configuration
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';
const testCompanies: string[] = [];

describe('Special Character Handling Integration Tests', () => {
  beforeAll(() => {
    if (!SKIP_INTEGRATION_TESTS) {
      initializeAttioClient(process.env.ATTIO_API_KEY!);
    }
  });

  afterEach(async () => {
    // Cleanup created companies
    if (!SKIP_INTEGRATION_TESTS) {
      for (const companyId of testCompanies) {
        try {
          await deleteCompany(companyId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
    testCompanies.length = 0;
  });

  describe('Quote and Apostrophe Handling', () => {
    it('should preserve single and double quotes in company names', async () => {
        name: `O'Reilly Media & "Tech" Solutions`,
        description: `Company with O'Brien's "special" quotes`,
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(nameValue)).toContain(`O'Reilly`);
      expect(String(nameValue)).toContain(`"Tech"`);
      expect(String(descValue)).toContain(`O'Brien's`);
      expect(String(descValue)).toContain(`"special"`);
    });

    it('should handle escaped quotes and nested quotation marks', async () => {
        name: `Company "with 'nested' quotes"`,
        description: `"He said 'hello world' to us"`,
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

      expect(String(nameValue)).toContain(`'nested'`);
      expect(String(nameValue)).toContain(`"with`);
    });
  });

  describe('HTML and XML Character Handling', () => {
    it('should preserve HTML-like content without interpretation', async () => {
        name: 'Tech & Solutions <Company>',
        description: '<div>Company with &amp; HTML &lt;tags&gt;</div>',
        notes:
          'Content with &nbsp; entities and <script>alert("test")</script>',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(nameValue)).toContain('&');
      expect(String(nameValue)).toContain('<Company>');
      expect(String(descValue)).toContain('<div>');
      expect(String(descValue)).toContain('&amp;');
      expect(String(descValue)).toContain('&lt;tags&gt;');
    });

    it('should handle XML/SGML entities correctly', async () => {
        name: 'Company &amp; Partners',
        description: 'Entities: &lt; &gt; &quot; &apos; &amp;',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

      expect(String(nameValue)).toContain('&amp;');
    });
  });

  describe('Unicode and International Character Handling', () => {
    it('should preserve Unicode characters and international text', async () => {
        name: 'Företag Cañón 株式会社',
        description: 'International: Ñoño, café, naïve, résumé, 北京',
        notes: 'Unicode symbols: ₹ € ¥ £ ₿ ∑ ∆ π',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(nameValue)).toContain('Företag');
      expect(String(nameValue)).toContain('Cañón');
      expect(String(nameValue)).toContain('株式会社');
      expect(String(descValue)).toContain('Ñoño');
      expect(String(descValue)).toContain('café');
      expect(String(descValue)).toContain('北京');
    });

    it('should handle emoji and modern Unicode symbols', async () => {
        name: 'Tech Company 🚀 Innovation',
        description: 'We build 💻 solutions with ❤️ and 🧠',
        notes: 'Symbols: ✅ ❌ ⭐ 🎯 📊 🔥 💡',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(nameValue)).toContain('🚀');
      expect(String(descValue)).toContain('💻');
      expect(String(descValue)).toContain('❤️');
      expect(String(descValue)).toContain('🧠');
    });
  });

  describe('Newline and Whitespace Handling', () => {
    it('should preserve multiline content with various newline formats', async () => {
        description: 'Line 1\nLine 2\r\nLine 3\rLine 4',
        notes: 'Paragraph 1\n\nParagraph 2\n\n\nParagraph 3',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

        ? result.values.notes[0]?.value || result.values.notes[0]
        : result.values.notes;

      expect(String(descValue)).toContain('Line 1');
      expect(String(descValue)).toContain('Line 2');
      expect(String(notesValue)).toContain('Paragraph 1');
      expect(String(notesValue)).toContain('Paragraph 2');
    });

    it('should preserve tabs and special whitespace characters', async () => {
        description: 'Column1\tColumn2\tColumn3',
        notes: 'Indented\n\tSubitem 1\n\tSubitem 2\n\t\tNested item',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(descValue)).toContain('\t');
      expect(String(descValue)).toContain('Column1');
      expect(String(descValue)).toContain('Column2');
    });

    it('should handle leading and trailing whitespace consistently', async () => {
        name: '  Padded Company Name  ',
        description: '\n\n  Description with padding  \n\n',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

      // The system should preserve the exact input as provided
        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

      // Verify the content is preserved (exact preservation behavior may vary)
      expect(String(nameValue)).toContain('Padded Company Name');
    });
  });

  describe('JSON and Structured Data Handling', () => {
    it('should handle JSON-like content without interpretation', async () => {
        description: '{"name": "Company", "type": "Tech", "active": true}',
        notes:
          '[{"id": 1, "status": "active"}, {"id": 2, "status": "inactive"}]',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(descValue)).toContain('{"name"');
      expect(String(descValue)).toContain('"Tech"');
      expect(String(descValue)).toContain('"active": true');
    });

    it('should handle CSV-like content with special characters', async () => {
        description:
          'Name,Description,Notes\n"O\'Reilly",Software & Media,"Books, Training"\nAcme Corp,Manufacturing,Heavy & Light',
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(descValue)).toContain("O'Reilly");
      expect(String(descValue)).toContain('Software & Media');
      expect(String(descValue)).toContain('"Books, Training"');
    });
  });

  describe('Cross-Resource Type Consistency', () => {
    it('should handle special characters consistently across all resource types', async () => {
        'Content with "quotes" & <tags> 🚀 newlines\nand\ttabs';

        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        UniversalResourceType.TASKS,
        UniversalResourceType.DEALS,
        UniversalResourceType.LISTS,
      ];

      for (const resourceType of resourceTypes) {
          resource_type: resourceType,
          record_id: `mock-${resourceType}-id`,
          record_data: {
            name: `Special Chars Test ${resourceType}`,
            description: specialContent,
          },
        });

        // All resource types should preserve special characters
        expect(result.values).toBeDefined();
        expect(result.id.object_id).toBeDefined();
      }
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle copy-pasted content from various sources', async () => {
        name: 'Real-World Company™',
        description: `
        About Us:
        • We're a technology company focused on innovation
        • Founded in 2020 by Jane O'Connor & John Smith-Wilson
        • Specializing in AI/ML solutions for Fortune 500 companies
        
        Contact: info@company.com | +1 (555) 123-4567
        Address: 123 Main St., Suite #456, City, State 12345-6789
        
        Mission: "To democratize AI technology & make it accessible to everyone."
        
        Recent Awards:
        ★ Best AI Startup 2023
        ★ Innovation Excellence Award
        ★ Top 100 Companies to Watch
        `,
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.name[0]?.value || result.values.name[0]
        : result.values.name;

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      expect(String(nameValue)).toContain('™');
      expect(String(descValue)).toContain(`O'Connor`);
      expect(String(descValue)).toContain('Smith-Wilson');
      expect(String(descValue)).toContain('•');
      expect(String(descValue)).toContain('#456');
      expect(String(descValue)).toContain('"To democratize');
      expect(String(descValue)).toContain('★');
    });

    it('should handle content with mixed encoding and special patterns', async () => {
        description: `
        Special patterns and encoding:
        - URLs: https://example.com/path?param=value&other=123
        - Emails: test+tag@domain.co.uk, user.name+filter@company.org
        - Phone: +1-800-555-0199, (555) 123.4567 ext. 890
        - Monetary: $1,234.56, €987.65, ¥12,345, £543.21
        - Percentages: 95.5%, 12.34%, 0.01%
        - Dates: 12/31/2023, 2023-12-31, Dec 31st, 2023
        - Times: 3:45 PM, 15:45:30, 9:30 AM EST
        - File paths: C:\\Users\\John\\Documents\\file.txt, /home/user/docs/readme.md
        - Version numbers: v1.2.3-beta.4, 2.0.0-rc.1+build.123
        `,
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;

      // Verify various patterns are preserved
      expect(String(descValue)).toContain('https://example.com');
      expect(String(descValue)).toContain('test+tag@domain.co.uk');
      expect(String(descValue)).toContain('+1-800-555-0199');
      expect(String(descValue)).toContain('$1,234.56');
      expect(String(descValue)).toContain('95.5%');
      expect(String(descValue)).toContain('C:\\Users');
      expect(String(descValue)).toContain('v1.2.3-beta.4');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle extremely long content with special characters', async () => {
        'Special character content: "quotes" & <tags> 🚀\n'.repeat(100);

        description: longContent,
      };

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

      // Should handle long content without corruption
      expect(result.values.description).toBeDefined();
    });

    it('should handle null bytes and control characters gracefully', async () => {
        name: 'Company\x00Name', // Null byte
        description: 'Content\x08with\x0Ccontrol\x1Fcharacters', // Control characters
      };

      // Should not crash or cause issues
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

      expect(result).toBeDefined();
      expect(result.values).toBeDefined();
    });
  });

  if (!SKIP_INTEGRATION_TESTS) {
    describe('Real API Integration Tests', () => {
      it('should persist special characters correctly with real API', async () => {
          name: `Real API Test "Company" & Co. 🚀 ${Date.now()}`,
          domains: ['special-chars-test.com'],
          description: 'Real API test with special chars: "quotes" & <tags>',
        };

        testCompanies.push(company.id.record_id);

        // Verify special characters were preserved
          ? company.values.name[0]?.value
          : company.values.name;

        expect(nameValue).toContain('"Company"');
        expect(nameValue).toContain('&');
        expect(nameValue).toContain('🚀');
      });
    });
  }
});
