export const upsertRecordSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      description:
        "Object type to upsert: 'people', 'companies', 'deals', or any config-discovered custom object slug",
    },
    match: {
      type: 'object' as const,
      properties: {
        attribute: {
          type: 'string' as const,
          description:
            'Attribute slug to exact-match. Use the real Attio slug (e.g., "email_addresses" for person emails, "domains" for company domains) - call discover_record_attributes if unsure.',
        },
        value: {
          type: 'string' as const,
          description:
            'Exact value to match (e.g., "jane@acme.com", "acme.com"). Matched exactly as provided (whitespace-trimmed only); casing is not normalized, so use the same casing the record stores.',
        },
      },
      required: ['attribute', 'value'] as const,
      additionalProperties: false,
      description:
        'Exact-match pair used to locate the existing record. Exactly one match updates, none creates (when allowed), multiple aborts without writing.',
    },
    values: {
      type: 'object' as const,
      additionalProperties: true,
      description:
        'Attributes to set on create or update (plain values; Attio-shaped [{ value }] entries are also accepted). On create the match pair is merged in for any attribute values does not already set.',
    },
    record_id: {
      type: 'string' as const,
      description:
        'Optional UUID of an existing record to target directly. The record is also updated to satisfy the match pair unless values already overrides that attribute; records are never created with a caller-provided id.',
    },
    create_if_missing: {
      type: 'boolean' as const,
      default: true,
      description:
        'Create a new record when no match is found. Set false to make the tool fail instead of inserting. Defaults to true when omitted.',
    },
    dry_run: {
      type: 'boolean' as const,
      default: false,
      description:
        'Preview the action (created/updated/noop) and changed fields without writing. Defaults to false when omitted.',
    },
  },
  required: ['resource_type' as const, 'match' as const, 'values' as const],
  additionalProperties: false,
};
