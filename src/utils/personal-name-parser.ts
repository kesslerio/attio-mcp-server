/**
 * Utility for parsing and handling personal-name fields
 * Addresses issue #409 - Personal name field type requires special handling
 */

/**
 * Parse a personal name value into Attio's expected format
 * Supports both string format ("John Doe") and structured format
 *
 * @param value - The raw name value (string or object)
 *   - String: Will be parsed into first_name, last_name, and full_name
 *   - Object: Expected to contain first_name, last_name, middle_name, title fields
 *   - null/undefined: Returns null
 *
 * @returns Structured name object with the following fields, or null:
 *   - first_name: The person's first name
 *   - last_name: The person's last name (optional)
 *   - middle_name: The person's middle name (optional, preserved from object input)
 *   - title: Professional title (optional, preserved from object input)
 *   - full_name: Complete name string (auto-generated if not provided)
 *
 * @example
 * // String input
 * parsePersonalName('John Doe')
 * // Returns: { first_name: 'John', last_name: 'Doe', full_name: 'John Doe' }
 *
 * @example
 * // Object input
 * parsePersonalName({ first_name: 'Jane', last_name: 'Smith', title: 'Dr.' })
 * // Returns: { first_name: 'Jane', last_name: 'Smith', title: 'Dr.', full_name: 'Dr. Jane Smith' }
 *
 * @example
 * // Single name
 * parsePersonalName('Madonna')
 * // Returns: { first_name: 'Madonna', full_name: 'Madonna' }
 */
export function parsePersonalName(
  value: unknown
): Record<string, unknown> | null {
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

    // Normalize string values by trimming
    const safeString = (v: unknown): string | undefined =>
      typeof v === 'string' ? v.trim() : undefined;

    // Copy over known fields
    const firstName = safeString(structured.first_name);
    const lastName = safeString(structured.last_name);
    const middleName = safeString(structured.middle_name);
    const title = safeString(structured.title);

    if (firstName) result.first_name = firstName;
    if (lastName) result.last_name = lastName;
    if (middleName) result.middle_name = middleName;
    if (title) result.title = title;

    // Generate full_name if not provided
    if (!structured.full_name) {
      const nameParts = [];
      if (title) nameParts.push(title);
      if (firstName) nameParts.push(firstName);
      if (middleName) nameParts.push(middleName);
      if (lastName) nameParts.push(lastName);
      result.full_name = nameParts.filter(Boolean).join(' ');
    } else {
      const fullName = safeString(structured.full_name);
      if (fullName) {
        result.full_name = fullName;
      }
    }

    return result;
  }

  return null;
}
