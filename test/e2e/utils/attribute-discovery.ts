/**
 * Attribute Discovery Utility for E2E Tests
 *
 * Dynamically discovers available attributes in the Attio workspace,
 * making tests portable across different workspaces with varying schemas.
 *
 * Instead of hardcoding attribute slugs like 'industry' or 'email',
 * tests can request attributes by type or pattern, and this utility
 * finds appropriate attributes that actually exist.
 *
 * @example
 * ```typescript
 * const discovery = new AttributeDiscovery();
 * await discovery.initialize(['companies', 'people']);
 *
 * // Find any text field for companies
 * const textField = discovery.findByType('companies', 'text');
 *
 * // Find email field with fallbacks
 * const emailField = discovery.findBySlugPattern('people', ['email_addresses', 'email', 'emails']);
 *
 * // Check if attribute exists before using
 * if (discovery.hasAttribute('companies', 'industry')) {
 *   // use it
 * }
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
  /** Any field that could be empty for data quality checks */
  EMPTY_CHECK_TEXT: ['description', 'about', 'notes', 'bio', 'summary'],
  /** Industry/segment classification */
  INDUSTRY: ['industry', 'b2b_segment', 'segment', 'category', 'categories'],
  /** Email addresses */
  EMAIL: ['email_addresses', 'email', 'emails', 'primary_email'],
  /** Phone numbers */
  PHONE: ['phone_numbers', 'phone', 'phones', 'primary_phone'],
  /** LinkedIn profile */
  LINKEDIN: ['linkedin', 'linkedin_url', 'linkedin_profile'],
  /** Company association */
  COMPANY: ['company', 'companies', 'employer', 'organization'],
  /** Job title */
  JOB_TITLE: ['job_title', 'title', 'position', 'role'],
  /** Website */
  WEBSITE: ['website', 'domains', 'url', 'web'],
  /** Employee count */
  EMPLOYEES: ['employees', 'employee_count', 'employee_range', 'headcount'],
} as const;

export class AttributeDiscovery {
  private cache: Map<string, AttioAttribute[]> = new Map();
  private baseUrl: string;
  private apiKey: string;
  private initialized = false;

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
    this.initialized = true;
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
        // Auth/server errors should fail the suite, not silently skip
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed for ${objectType}: ${response.status} - check ATTIO_API_KEY`
          );
        }
        if (response.status >= 500) {
          throw new Error(
            `Attio API error for ${objectType}: ${response.status}`
          );
        }
        // 404 is acceptable - object type may not exist in workspace
        console.warn(
          `[AttributeDiscovery] ${objectType} not found: ${response.status}`
        );
        this.cache.set(objectType, []);
        return;
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
   * Check if a specific attribute exists
   */
  hasAttribute(objectType: string, slug: string): boolean {
    const attrs = this.getAttributes(objectType);
    return attrs.some((a) => a.api_slug === slug);
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
   * Find first attribute of a specific type
   */
  findByType(objectType: string, attrType: string): AttioAttribute | undefined {
    const attrs = this.getAttributes(objectType);
    return attrs.find((a) => a.type === attrType);
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
   * Find multiple attributes by type
   */
  findAllByType(objectType: string, attrType: string): AttioAttribute[] {
    const attrs = this.getAttributes(objectType);
    return attrs.filter((a) => a.type === attrType);
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

  /**
   * Check if discovery has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
