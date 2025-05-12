import { parseResourceUri, formatResourceUri } from '../../src/utils/uri-parser.js';
import { ResourceType } from '../../src/types/attio.js';

describe('uri-parser', () => {
  describe('parseResourceUri', () => {
    it('should correctly parse valid URIs', () => {
      expect(parseResourceUri('attio://people/person123')).toEqual([ResourceType.PEOPLE, 'person123']);
      expect(parseResourceUri('attio://companies/company456')).toEqual([ResourceType.COMPANIES, 'company456']);
    });
    
    it('should throw for invalid URI formats', () => {
      expect(() => parseResourceUri('invalid')).toThrow('Invalid resource URI format');
      expect(() => parseResourceUri('attio://')).toThrow('Invalid resource URI format');
      expect(() => parseResourceUri('attio://invalid/id')).toThrow('Unsupported resource type');
      expect(() => parseResourceUri('http://attio.com/people/123')).toThrow('Invalid resource URI format');
    });

    it('should handle IDs with special characters', () => {
      expect(parseResourceUri('attio://people/user-123_456')).toEqual([ResourceType.PEOPLE, 'user-123_456']);
      expect(parseResourceUri('attio://companies/acme.corp')).toEqual([ResourceType.COMPANIES, 'acme.corp']);
    });

    it('should handle empty IDs but throw appropriate error', () => {
      expect(() => parseResourceUri('attio://people/')).toThrow('Invalid resource URI format');
    });
  });
  
  describe('formatResourceUri', () => {
    it('should correctly format URIs', () => {
      expect(formatResourceUri(ResourceType.PEOPLE, 'person123')).toBe('attio://people/person123');
      expect(formatResourceUri(ResourceType.COMPANIES, 'company456')).toBe('attio://companies/company456');
    });

    it('should handle IDs with special characters', () => {
      expect(formatResourceUri(ResourceType.PEOPLE, 'user-123_456')).toBe('attio://people/user-123_456');
      expect(formatResourceUri(ResourceType.COMPANIES, 'acme.corp')).toBe('attio://companies/acme.corp');
    });

    it('should not validate ID format', () => {
      // This test shows that formatResourceUri doesn't validate the ID format
      // If validation is added later, this test would need to be updated
      expect(formatResourceUri(ResourceType.PEOPLE, '')).toBe('attio://people/');
      expect(formatResourceUri(ResourceType.COMPANIES, ' ')).toBe('attio://companies/ ');
    });
  });

  describe('integration between parse and format', () => {
    it('should be symmetric for valid URIs', () => {
      const originalUri = 'attio://people/person123';
      const [resourceType, id] = parseResourceUri(originalUri);
      const reformattedUri = formatResourceUri(resourceType, id);
      expect(reformattedUri).toBe(originalUri);
    });

    it('should round-trip multiple resource types', () => {
      const testCases = [
        { type: ResourceType.PEOPLE, id: 'person123' },
        { type: ResourceType.COMPANIES, id: 'company456' },
        { type: ResourceType.PEOPLE, id: 'user-with_special.chars' }
      ];

      testCases.forEach(({ type, id }) => {
        const uri = formatResourceUri(type, id);
        const [parsedType, parsedId] = parseResourceUri(uri);
        expect(parsedType).toBe(type);
        expect(parsedId).toBe(id);
      });
    });
  });
});