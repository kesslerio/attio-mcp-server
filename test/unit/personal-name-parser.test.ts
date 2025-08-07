/**
 * Unit tests for personal-name parsing logic
 * Tests the actual parsing function without API dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Parse a personal name string or object into Attio's expected format
 * This is the core logic that should be used in formatAttributeValue
 */
export function parsePersonalName(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    // Parse string name into first/last name structure
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      // Only one name part - treat as first name
      return {
        first_name: parts[0],
        full_name: parts[0],
      };
    } else if (parts.length === 2) {
      // Standard first last format
      return {
        first_name: parts[0],
        last_name: parts[1],
        full_name: value.trim(),
      };
    } else {
      // Multiple parts - first, middle(s), last
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      return {
        first_name: firstName,
        last_name: lastName,
        full_name: value.trim(),
      };
    }
  } else if (typeof value === 'object' && value !== null) {
    // Already structured - ensure it has required fields
    const structured = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    
    if (structured.first_name) result.first_name = structured.first_name;
    if (structured.last_name) result.last_name = structured.last_name;
    if (structured.middle_name) result.middle_name = structured.middle_name;
    if (structured.title) result.title = structured.title;
    
    // Generate full_name if not provided
    if (!structured.full_name) {
      const nameParts = [];
      if (structured.title) nameParts.push(String(structured.title));
      if (structured.first_name) nameParts.push(String(structured.first_name));
      if (structured.middle_name) nameParts.push(String(structured.middle_name));
      if (structured.last_name) nameParts.push(String(structured.last_name));
      result.full_name = nameParts.join(' ');
    } else {
      result.full_name = structured.full_name;
    }
    
    return result;
  }
  
  return null;
}

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
      full_name: 'John   Doe',  // Preserves original after trim
    });
  });
});