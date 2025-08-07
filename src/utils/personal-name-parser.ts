/**
 * Utility for parsing and handling personal-name fields
 * Addresses issue #409 - Personal name field type requires special handling
 */

/**
 * Parse a personal name value into Attio's expected format
 * Supports both string format ("John Doe") and structured format
 * 
 * @param value - The raw name value (string or object)
 * @returns Structured name object or null
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
        full_name: trimmed,
      };
    } else {
      // Multiple parts - first, middle(s), last
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      return {
        first_name: firstName,
        last_name: lastName,
        full_name: trimmed,
      };
    }
  } else if (typeof value === 'object' && value !== null) {
    // Already structured - ensure it has required fields
    const structured = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    
    // Copy over known fields
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
      result.full_name = nameParts.filter(Boolean).join(' ');
    } else {
      result.full_name = structured.full_name;
    }
    
    return result;
  }
  
  return null;
}