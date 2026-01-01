/**
 * Attribute Discovery Utility for E2E Tests
 *
 * Dynamically discovers available attributes in the Attio workspace,
 * making tests portable across different workspaces with varying schemas.
 *
 * @example
 * ```typescript
 * const discovery = new AttributeDiscovery();
 * await discovery.initialize(['companies', 'people']);
 *
 * // Find email field by semantic intent
 * const emailField = discovery.findByIntent('people', 'EMAIL');
 * ```
 */

export interface AttioAttribute {
  api_slug: string;
  title: string;
  type: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_multiselect?: boolean;
}

export interface AttributeDiscoveryOptions {
  /** Base URL for Attio API (default: https://api.attio.com) */
  baseUrl?: string;
  /** API key (default: from ATTIO_API_KEY env var) */
  apiKey?: string;
}

/**
 * Common attribute type mappings for semantic lookups
 */
export const ATTRIBUTE_INTENTS = {
  /** Industry/segment classification */
  INDUSTRY: ['industry', 'b2b_segment', 'segment', 'category', 'categories'],
  /** Email addresses */
  EMAIL: ['email_addresses', 'email', 'emails', 'primary_email'],
  /** LinkedIn profile */
  LINKEDIN: ['linkedin', 'linkedin_url', 'linkedin_profile'],
  /** Company association */
  COMPANY: ['company', 'companies', 'employer', 'organization'],
  /** Website */
  WEBSITE: ['website', 'domains', 'url', 'web'],
} as const;

export class AttributeDiscovery {
  private cache: Map<string, AttioAttribute[]> = new Map();
  private baseUrl: string;
  private apiKey: string;

  constructor(options: AttributeDiscoveryOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.attio.com';
    this.apiKey = options.apiKey || process.env.ATTIO_API_KEY || '';

    if (!this.apiKey) {
      throw new Error(
        'AttributeDiscovery requires ATTIO_API_KEY environment variable or apiKey option'
      );
    }
  }

  /**
   * Initialize discovery by fetching attributes for specified object types
   */
  async initialize(objectTypes: string[]): Promise<void> {
    const fetchPromises = objectTypes.map((type) => this.fetchAttributes(type));
    await Promise.all(fetchPromises);
  }

  /**
   * Fetch attributes for a specific object type from Attio API
   */
  private async fetchAttributes(objectType: string): Promise<void> {
    if (this.cache.has(objectType)) {
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/objects/${objectType}/attributes`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Auth errors should fail the suite
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed for ${objectType}: ${response.status} - check ATTIO_API_KEY`
          );
        }
        // 404 is acceptable - object type may not exist in workspace
        if (response.status === 404) {
          console.warn(
            `[AttributeDiscovery] ${objectType} not found: ${response.status}`
          );
          this.cache.set(objectType, []);
          return;
        }
        // All other errors (400, 409, 429, 5xx) should fail
        throw new Error(
          `Attio API error for ${objectType}: ${response.status}`
        );
      }

      const data = (await response.json()) as { data: AttioAttribute[] };
      this.cache.set(objectType, data.data || []);
    } catch (error) {
      // Network errors propagate (don't swallow) - only auth/server errors are explicitly handled above
      throw error;
    }
  }

  /**
   * Get all attributes for an object type
   */
  getAttributes(objectType: string): AttioAttribute[] {
    return this.cache.get(objectType) || [];
  }

  /**
   * Find first attribute matching any of the provided slugs
   */
  findBySlugPattern(
    objectType: string,
    slugs: string[]
  ): AttioAttribute | undefined {
    const attrs = this.getAttributes(objectType);
    for (const slug of slugs) {
      const found = attrs.find((a) => a.api_slug === slug);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Find attributes by semantic intent (e.g., "EMAIL", "INDUSTRY")
   */
  findByIntent(
    objectType: string,
    intent: keyof typeof ATTRIBUTE_INTENTS
  ): AttioAttribute | undefined {
    const slugPatterns = ATTRIBUTE_INTENTS[intent];
    return this.findBySlugPattern(objectType, [...slugPatterns]);
  }

  /**
   * Get a summary of available attributes for debugging
   */
  getSummary(objectType: string): string {
    const attrs = this.getAttributes(objectType);
    const byType = new Map<string, string[]>();

    for (const attr of attrs) {
      const list = byType.get(attr.type) || [];
      list.push(attr.api_slug);
      byType.set(attr.type, list);
    }

    const lines = [`Attributes for ${objectType}:`];
    for (const [type, slugs] of byType) {
      lines.push(`  ${type}: ${slugs.join(', ')}`);
    }
    return lines.join('\n');
  }
}
