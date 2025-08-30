/**
 * Unit tests for personal-name parsing logic
 * Tests the actual parsing function without API dependencies
 */
import { describe, it, expect } from 'vitest';
import { parsePersonalName } from '../../../src/utils/personal-name-parser.js';

describe('Personal Name Parser', () => {
  it('should parse simple string name "John Doe" into structured format', () => {
    const result = parsePersonalName('John Doe');

    expect(result).toEqual({
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
    });
  });

  it('should handle single name "Madonna"', () => {
    const result = parsePersonalName('Madonna');

    expect(result).toEqual({
      first_name: 'Madonna',
      full_name: 'Madonna',
    });
  });

  it('should handle three-part names "John Middle Doe"', () => {
    const result = parsePersonalName('John Middle Doe');

    expect(result).toEqual({
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Middle Doe',
    });
  });

  it('should handle structured input with first and last name', () => {
    const input = {
      first_name: 'Jane',
      last_name: 'Smith',
    };

    const result = parsePersonalName(input);

    expect(result).toEqual({
      first_name: 'Jane',
      last_name: 'Smith',
      full_name: 'Jane Smith',
    });
  });

  it('should preserve title in structured input', () => {
    const input = {
      title: 'Dr.',
      first_name: 'Jane',
      last_name: 'Smith',
    };

    const result = parsePersonalName(input);

    expect(result).toEqual({
      title: 'Dr.',
      first_name: 'Jane',
      last_name: 'Smith',
      full_name: 'Dr. Jane Smith',
    });
  });

  it('should handle empty string by returning null', () => {
    const result = parsePersonalName('');
    expect(result).toBeNull();
  });

  it('should handle whitespace-only string by returning null', () => {
    const result = parsePersonalName('   ');
    expect(result).toBeNull();
  });

  it('should handle null input', () => {
    const result = parsePersonalName(null);
    expect(result).toBeNull();
  });

  it('should handle undefined input', () => {
    const result = parsePersonalName(undefined);
    expect(result).toBeNull();
  });

  it('should preserve existing full_name in structured input', () => {
    const input = {
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'Johnny Doe (JD)',
    };

    const result = parsePersonalName(input);

    expect(result).toEqual({
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'Johnny Doe (JD)',
    });
  });

  it('should handle complex names with multiple middle names', () => {
    const result = parsePersonalName('Jean Claude Van Damme');

    expect(result).toEqual({
      first_name: 'Jean',
      last_name: 'Damme',
      full_name: 'Jean Claude Van Damme',
    });
  });

  it('should handle extra whitespace in names', () => {
    const result = parsePersonalName('  John   Doe  ');

    expect(result).toEqual({
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John   Doe', // Note: Actual implementation uses trimmed variable consistently
    });
  });
});
