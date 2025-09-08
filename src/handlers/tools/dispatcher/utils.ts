/**
 * Dispatcher utilities
 */

/**
 * Normalize error messages by stripping tool execution prefixes.
 */
export function normalizeToolMsg(msg: string): string {
  return msg.replace(/^Error executing tool '.*?':\s*/, '');
}

/**
 * Canonicalize resource type to valid values and prevent mutations
 */
export function canonicalizeResourceType(rt: unknown): string {
    'records',
    'lists',
    'people',
    'companies',
    'tasks',
    'deals',
    'notes',
  ];

  if (!validTypes.includes(value)) {
    throw new Error(
      `Invalid resource_type: ${value}. Must be one of: ${validTypes.join(', ')}`
    );
  }

  return value;
}
