/**
 * Unit tests for company notes formatter
 * Tests the fix for issue #338 - notes content not being displayed
 */

import { describe, it, expect } from 'vitest';

      return `- ${title} (Created: ${timestamp})\n  ${
        content
          ? content.length > 200
            ? content.substring(0, 200) + '...'
            : content
          : 'No content'
      }`;
    })
    .join('\n\n')}`;
}

describe('Company Notes Formatter', () => {
  describe('Content Extraction', () => {
    it('should extract content from standard note structure', () => {
        {
          id: { note_id: 'note1' },
          title: 'Test Note',
          content: 'This is the note content',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Test Note');
      expect(result).toContain('This is the note content');
      expect(result).toContain('2024-01-01T00:00:00Z');
      expect(result).not.toContain('No content');
    });

    it('should extract content from nested data structure', () => {
        {
          id: { note_id: 'note2' },
          title: 'Nested Note',
          data: {
            content: 'Content in data field',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      ];


      expect(result).toContain('Nested Note');
      expect(result).toContain('Content in data field');
      expect(result).not.toContain('No content');
    });

    it('should extract content from values structure (Attio-style)', () => {
        {
          id: { note_id: 'note3' },
          title: 'Values Note',
          values: {
            content: 'Content in values field',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      ];


      expect(result).toContain('Values Note');
      expect(result).toContain('Content in values field');
      expect(result).not.toContain('No content');
    });

    it('should handle alternative content field names', () => {
        {
          id: { note_id: 'note4' },
          title: 'Text Note',
          text: 'Content in text field',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Text Note');
      expect(result).toContain('Content in text field');
      expect(result).not.toContain('No content');
    });

    it('should handle body field as content source', () => {
        {
          id: { note_id: 'note5' },
          title: 'Body Note',
          body: 'Content in body field',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Body Note');
      expect(result).toContain('Content in body field');
      expect(result).not.toContain('No content');
    });
  });

  describe('Fallback Handling', () => {
    it('should show "No content" when no content fields are present', () => {
        {
          id: { note_id: 'note6' },
          title: 'Empty Note',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Empty Note');
      expect(result).toContain('No content');
    });

    it('should handle missing title gracefully', () => {
        {
          id: { note_id: 'note7' },
          content: 'Content without title',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Untitled');
      expect(result).toContain('Content without title');
    });

    it('should handle missing timestamp gracefully', () => {
        {
          id: { note_id: 'note8' },
          title: 'Note without timestamp',
          content: 'Content without timestamp',
        },
      ];


      expect(result).toContain('Note without timestamp');
      expect(result).toContain('Content without timestamp');
      expect(result).toContain('Created: unknown');
    });
  });

  describe('Content Truncation', () => {
    it('should truncate long content at 200 characters', () => {
        {
          id: { note_id: 'note9' },
          title: 'Long Note',
          content: longContent,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Long Note');
      expect(result).toContain('A'.repeat(200) + '...');
      expect(result).not.toContain('A'.repeat(250));
    });

    it('should not truncate short content', () => {
        {
          id: { note_id: 'note10' },
          title: 'Short Note',
          content: shortContent,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];


      expect(result).toContain('Short Note');
      expect(result).toContain('Short content');
      expect(result).not.toContain('...');
    });
  });

  describe('Multiple Notes', () => {
    it('should handle multiple notes with different structures', () => {
        {
          id: { note_id: 'note11' },
          title: 'Standard Note',
          content: 'Standard content',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: { note_id: 'note12' },
          title: 'Nested Note',
          data: {
            content: 'Nested content',
            created_at: '2024-01-02T00:00:00Z',
          },
        },
      ];


      expect(result).toContain('Found 2 notes');
      expect(result).toContain('Standard Note');
      expect(result).toContain('Standard content');
      expect(result).toContain('Nested Note');
      expect(result).toContain('Nested content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notes array', () => {
      expect(result).toBe('No notes found for this company.');
    });

    it('should handle null notes', () => {
      expect(result).toBe('No notes found for this company.');
    });

    it('should handle undefined notes', () => {
      expect(result).toBe('No notes found for this company.');
    });
  });
});
