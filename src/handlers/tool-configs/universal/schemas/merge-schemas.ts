export const mergeRecordsSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      description:
        'Object type to merge. This beta operation executes for deals only; people and companies are reserved for later coverage.',
    },
    record_id: {
      type: 'string' as const,
      description: 'Primary/live deal record UUID that should win conflicts',
    },
    secondary_record_id: {
      type: 'string' as const,
      description: 'Leftover deal record UUID to merge into the primary',
    },
    dry_run: {
      type: 'boolean' as const,
      default: true,
      description:
        'Preview the field plan without patching, clearing, or merging',
    },
    confirm: {
      type: 'boolean' as const,
      default: false,
      description: 'Required true in addition to dry_run=false to execute',
    },
    keep_from_leftover: {
      type: 'array' as const,
      items: { type: 'string' as const },
      default: [],
      description:
        'Attribute slugs whose leftover values should patch the primary',
    },
    skip_leftover_attributes: {
      type: 'array' as const,
      items: { type: 'string' as const },
      default: [],
      description: 'Dangerous fill slugs to clear on the leftover before merge',
    },
    override_linked_mismatch: {
      type: 'boolean' as const,
      default: false,
      description:
        'Explicitly allow differing associated person/company records',
    },
  },
  required: [
    'resource_type' as const,
    'record_id' as const,
    'secondary_record_id' as const,
  ],
  additionalProperties: false,
};
