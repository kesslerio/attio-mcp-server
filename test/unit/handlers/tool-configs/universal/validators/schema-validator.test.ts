/**
 * Unit tests for InputSanitizer and validateUniversalToolParams
 * @see Issue #1052: Preserve line breaks in note content
 * @see Issue #1099: Fix task immutability for nested values
 */
import { describe, it, expect } from 'vitest';
import {
  InputSanitizer,
  validateUniversalToolParams,
} from '../../../../../../src/handlers/tool-configs/universal/validators/schema-validator.js';

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    it('should collapse whitespace to single spaces', () => {
      const input = 'hello   world\t\ttab\n\nnewline';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('hello world tab newline');
    });

    it('should remove HTML tags', () => {
      const input = '<b>bold</b> and <i>italic</i>';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('bold and italic');
    });

    it('should remove script tags but keep content', () => {
      const input = '<script>alert("xss")</script>safe';
      const result = InputSanitizer.sanitizeString(input);
      // Script tags are removed, content is kept (XSS execution blocked)
      expect(result).toBe('alert("xss")safe');
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeMultilineString', () => {
    it('should preserve single newlines', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
      expect(result.split('\n').length).toBe(3);
    });

    it('should preserve double newlines (paragraph breaks)', () => {
      const input = 'Paragraph 1\n\nParagraph 2';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should normalize excessive blank lines to max 2', () => {
      const input = 'Line 1\n\n\n\n\nLine 2';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should preserve markdown formatting', () => {
      const input = '# Heading\n\n- Bullet 1\n- Bullet 2\n\n**Bold text**';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toContain('# Heading');
      expect(result).toContain('- Bullet 1');
      expect(result).toContain('- Bullet 2');
      expect(result).toContain('**Bold text**');
      expect(result.split('\n').length).toBeGreaterThan(3);
    });

    it('should normalize whitespace within lines but keep newlines', () => {
      const input = 'Line 1  with   spaces\nLine 2\twith\ttabs';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Line 1 with spaces\nLine 2 with tabs');
    });

    it('should still sanitize XSS in multiline content', () => {
      const input = '<script>alert("xss")</script>\nSafe line\n<b>Bold</b>';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<b>');
      expect(result).toContain('\n'); // Still has newlines
      expect(result).toContain('Safe line');
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  \n  Line 1\nLine 2  \n  ';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('Line 1\nLine 2');
    });

    it('should handle non-string input', () => {
      expect(InputSanitizer.sanitizeMultilineString(123)).toBe('123');
      expect(InputSanitizer.sanitizeMultilineString(null)).toBe('null');
      expect(InputSanitizer.sanitizeMultilineString(undefined)).toBe(
        'undefined'
      );
    });

    it('should preserve leading indentation for nested markdown', () => {
      const input = '- Item 1\n  - Nested Item\n    - Deeply nested';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('- Item 1\n  - Nested Item\n    - Deeply nested');
      // Verify leading spaces are preserved
      expect(result.split('\n')[1]).toMatch(/^ {2}-/);
      expect(result.split('\n')[2]).toMatch(/^ {4}-/);
    });

    it('should preserve indentation for code blocks', () => {
      const input = '```\n  function foo() {\n    return bar;\n  }\n```';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toContain('  function');
      expect(result).toContain('    return');
    });

    it('should preserve tab indentation', () => {
      const input = '- Item 1\n\t- Tab indented\n\t\t- Double tab';
      const result = InputSanitizer.sanitizeMultilineString(input);
      expect(result).toBe('- Item 1\n\t- Tab indented\n\t\t- Double tab');
    });
  });

  describe('sanitizeObject - field-aware sanitization', () => {
    it('should preserve newlines in content field', () => {
      const input = {
        title: 'Test Note',
        content: 'Line 1\nLine 2\n\nLine 3',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.content).toBe('Line 1\nLine 2\n\nLine 3');
      expect((result.content as string).split('\n').length).toBe(4);
    });

    it('should NOT preserve newlines in title field', () => {
      const input = {
        title: 'Title with\nnewline',
        content: 'Content with\nnewline',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.title).toBe('Title with newline'); // Collapsed
      expect(result.content).toBe('Content with\nnewline'); // Preserved
    });

    it('should preserve newlines in description field', () => {
      const input = {
        name: 'Test Company',
        description: 'Line 1\nLine 2',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.description).toBe('Line 1\nLine 2');
    });

    it('should preserve newlines in body field', () => {
      const input = {
        subject: 'Email Subject',
        body: 'Dear User,\n\nThis is a message.\n\nBest regards',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.body).toBe(
        'Dear User,\n\nThis is a message.\n\nBest regards'
      );
    });

    it('should preserve newlines in content_markdown field', () => {
      const input = {
        content_markdown: '# Heading\n\n- Item 1\n- Item 2',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.content_markdown).toBe('# Heading\n\n- Item 1\n- Item 2');
    });

    it('should preserve newlines in content_plaintext field', () => {
      const input = {
        content_plaintext: 'Line 1\nLine 2\nLine 3',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.content_plaintext).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should preserve newlines in notes field', () => {
      const input = {
        notes: 'Note line 1\nNote line 2',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.notes).toBe('Note line 1\nNote line 2');
    });

    it('should handle nested objects with content fields', () => {
      const input = {
        note: {
          title: 'Nested Title',
          content: 'Nested\nContent',
        },
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      const nestedNote = result.note as Record<string, unknown>;
      expect(nestedNote.content).toBe('Nested\nContent');
    });

    it('should handle case-insensitive field names', () => {
      const input = {
        Content: 'Line 1\nLine 2',
        CONTENT: 'Line 3\nLine 4',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;
      expect(result.Content).toBe('Line 1\nLine 2');
      expect(result.CONTENT).toBe('Line 3\nLine 4');
    });

    it('should preserve markdown in create_note params structure', () => {
      // Simulates the actual parameter structure used by create_note tool
      const input = {
        resource_type: 'companies',
        record_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Meeting Notes',
        content:
          '# Summary\n\n## Attendees\n- John\n- Jane\n\n## Action Items\n1. Follow up\n2. Schedule demo',
        format: 'markdown',
      };
      const result = InputSanitizer.sanitizeObject(input) as Record<
        string,
        unknown
      >;

      // Title should NOT have newlines (it's not in MULTILINE_FIELDS)
      expect(result.title).not.toContain('\n');

      // Content should preserve all newlines
      expect(result.content).toContain('# Summary');
      expect(result.content).toContain('\n');
      expect(result.content).toContain('## Attendees');
      expect(result.content).toContain('- John');
      expect((result.content as string).split('\n').length).toBeGreaterThan(5);
    });
  });
});

describe('validateUniversalToolParams', () => {
  describe('update_record - input normalization', () => {
    it('should normalize data field to record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        data: { name: 'Test Company' },
      };
      const result = validateUniversalToolParams('update_record', params);
      expect(result.record_data).toEqual({ name: 'Test Company' });
    });

    it('should collect extra fields into record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test Company',
        website: 'https://example.com',
      };
      const result = validateUniversalToolParams('update_record', params);
      expect(result.record_data).toEqual({
        name: 'Test Company',
        website: 'https://example.com',
      });
    });

    it('should not mutate original params when normalizing', () => {
      const original = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test Company',
      };
      const originalCopy = JSON.parse(JSON.stringify(original));

      validateUniversalToolParams('update_record', original);

      // Original should be unchanged (except for sanitization of existing fields)
      expect(original.resource_type).toBe(originalCopy.resource_type);
      expect(original.record_id).toBe(originalCopy.record_id);
    });
  });

  describe('update_record - task immutability validation', () => {
    it('should reject task content updates at top level', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { content: 'Updated content' },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should reject task content_markdown updates at top level', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { content_markdown: '# Updated' },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should reject task content_plaintext updates at top level', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { content_plaintext: 'Plain text' },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should reject task content updates in nested values structure', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { values: { content: 'Updated content' } },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should reject task content_markdown updates in nested values', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { values: { content_markdown: '# Updated' } },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should reject task content_plaintext updates in nested values', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { values: { content_plaintext: 'Plain text' } },
      };
      expect(() =>
        validateUniversalToolParams('update_record', params)
      ).toThrow('Task content is immutable');
    });

    it('should allow task status updates (not content)', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { status: 'completed' },
      };
      const result = validateUniversalToolParams('update_record', params);
      expect(result.record_data).toEqual({ status: 'completed' });
    });

    it('should allow task status updates in nested values structure', () => {
      const params = {
        resource_type: 'tasks',
        record_id: 'task_123',
        record_data: { values: { status: 'completed', assignees: 'user_123' } },
      };
      const result = validateUniversalToolParams('update_record', params);
      expect(result.record_data).toEqual({
        values: { status: 'completed', assignees: 'user_123' },
      });
    });
  });
});
