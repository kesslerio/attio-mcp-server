/**
 * Type definitions for company operations
 */

/**
 * Input type for creating a company
 */
export interface CompanyCreateInput {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  domain?: string;
  size?: string;
  linkedin_url?: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  [key: string]: unknown; // Allow additional properties
}

/**
 * Input type for updating a company
 */
export interface CompanyUpdateInput {
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  domain?: string;
  size?: string;
  linkedin_url?: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  [key: string]: unknown; // Allow additional properties
}

/**
 * Type for a company attribute update
 */
export interface CompanyAttributeUpdate {
  companyId: string;
  attributeName: string;
  attributeValue: string | number | boolean | object | null;
}
