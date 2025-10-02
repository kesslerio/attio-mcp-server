export type AttributeMetadata = Record<string, unknown>;
export type AttributeMetadataIndex = Record<string, AttributeMetadata>;

const ATTRIBUTE_KEY_CANDIDATES = [
  'api_slug',
  'attribute_slug',
  'slug',
  'title',
  'name',
  'label',
];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function addKey(
  index: AttributeMetadataIndex,
  key: string,
  metadata: AttributeMetadata
): void {
  const normalized = normalizeKey(key);
  if (!normalized) return;

  index[normalized] = metadata;
  // Also map underscored variations to support space-separated titles
  const underscored = normalized.replace(/[\s.-]+/g, '_');
  index[underscored] = metadata;
}

export function buildAttributeMetadataIndex(
  attributes: unknown[]
): AttributeMetadataIndex {
  const index: AttributeMetadataIndex = {};

  attributes.forEach((attribute) => {
    if (!attribute || typeof attribute !== 'object') {
      return;
    }

    const metadata = attribute as AttributeMetadata;

    ATTRIBUTE_KEY_CANDIDATES.forEach((candidate) => {
      const value = metadata[candidate];
      if (typeof value === 'string' && value.trim().length > 0) {
        addKey(index, value, metadata);
      }
    });
  });

  return index;
}

export function findAttributeMetadata(
  field: string,
  index?: AttributeMetadataIndex
): AttributeMetadata | undefined {
  if (!index || !field) {
    return undefined;
  }

  const normalized = normalizeKey(field);
  if (normalized in index) {
    return index[normalized];
  }

  const underscored = normalized.replace(/[\s.-]+/g, '_');
  if (underscored in index) {
    return index[underscored];
  }

  return undefined;
}
