import {
  formatSuccessResponse,
  formatListResponse,
  formatRecordResponse,
  formatJsonResponse,
  formatMarkdownResponse,
  formatMultiPartResponse,
  formatEmptyResponse,
  formatErrorResponse,
} from '../../src/utils/response-formatter';

describe('response-formatter', () => {
  describe('formatSuccessResponse', () => {
    it('should create a simple success response', () => {

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation successful');
      expect(result.metadata).toBeUndefined();
    });

    it('should include metadata if provided', () => {

      expect(result.isError).toBe(false);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('formatListResponse', () => {
    it('should format a list of items', () => {
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ];


      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Items:');
      expect(result.content[0].text).toContain('Item 1 (ID: 1)');
      expect(result.content[0].text).toContain('Item 2 (ID: 2)');
      expect(result.content[0].text).toContain('Item 3 (ID: 3)');
      expect(result.content[0].text).toContain('Showing 3 items');
      expect(result.metadata?.items).toEqual(items);
    });

    it('should handle empty list', () => {
      const items: unknown[] = [];

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Empty List:');
      expect(result.content[0].text).toContain('No items found');
      expect(result.content[0].text).toContain('Showing 0 items');
    });

    it('should include pagination info if provided', () => {
        'Test Items',
        items,
        formatter,
        pagination
      );

      expect(result.content[0].text).toContain('1 of 100 total');
      expect(result.content[0].text).toContain('More items available');
      expect(result.metadata?.pagination).toEqual(pagination);
    });
  });

  describe('formatRecordResponse', () => {
    it('should format a single record', () => {
        `Name: ${r.name}\nID: ${r.id}\nValue: ${r.value}`;

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Record Details:');
      expect(result.content[0].text).toContain('Name: Test Record');
      expect(result.content[0].text).toContain('ID: 123');
      expect(result.content[0].text).toContain('Value: 42');
      expect(result.metadata?.record).toEqual(record);
    });
  });

  describe('formatJsonResponse', () => {
    it('should format data as JSON', () => {
        id: '123',
        nested: {
          key: 'value',
        },
        array: [1, 2, 3],
      };

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('JSON Data:');
      expect(result.content[0].text).toContain('"id": "123"');
      expect(result.content[0].text).toContain('"key": "value"');
      expect(result.content[0].text).toContain('"array": [');
      expect(result.metadata?.data).toEqual(data);
    });
  });

  describe('formatMarkdownResponse', () => {
    it('should format markdown content', () => {
        '## Subtitle\n\nThis is some **bold** text with a [link](https://example.com).';

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('markdown');
      expect(result.content[0].text).toContain('# Markdown Example');
      expect(result.content[0].text).toContain('## Subtitle');
      expect(result.content[0].text).toContain('**bold**');
      expect(result.content[0].text).toContain('[link](https://example.com)');
    });
  });

  describe('formatMultiPartResponse', () => {
    it('should combine multiple content parts', () => {
        { type: 'text' as const, text: 'This is a text part' },
        { type: 'markdown' as const, text: '**This** is a _markdown_ part' },
      ];

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(3); // Title + 2 parts
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Multi-part Response');
      expect(result.content[1]).toEqual(parts[0]);
      expect(result.content[2]).toEqual(parts[1]);
    });
  });

  describe('formatEmptyResponse', () => {
    it('should create a response with no content', () => {

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(0);
      expect(result.metadata).toBeUndefined();
    });

    it('should include metadata if provided', () => {

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(0);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('formatErrorResponse', () => {
    it('should create a standardized error response', () => {
        'Something went wrong',
        500,
        'internal_error'
      );

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ERROR [internal_error]');
      expect(result.content[0].text).toContain('Something went wrong');
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(500);
      expect(result.error?.message).toBe('Something went wrong');
      expect(result.error?.type).toBe('internal_error');
    });

    it('should include details if provided', () => {
        'Validation failed',
        400,
        'validation_error',
        details
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR [validation_error]');
      expect(result.content[0].text).toContain('Details:');
      expect(result.content[0].text).toContain('"field": "username"');
      expect(result.error?.details).toEqual(details);
    });

    it('should use default values if not provided', () => {

      expect(result.isError).toBe(true);
      expect(result.error?.code).toBe(500);
      expect(result.error?.type).toBe('unknown_error');
    });
  });
});
