/**
 * Shared types for company modules
 */
export type {
  Company,
  AttioNote,
  FilterConditionType,
  RecordAttributes,
} from '../../types/attio.js';

export type {
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanyAttributeUpdate,
} from '../../types/company-types.js';

// Define more specific types for company attributes (based on actual Attio API)
export interface CompanyAttributes {
  domains?: string[];
  name?: string;
  description?: string;
  team?: string[]; // Record reference to people
  categories?: string[];
  primary_location?: string;
  angellist?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  associated_deals?: string[]; // Record reference to deals
  associated_workspaces?: string[]; // Record reference to workspaces
  [key: string]: any; // Allow for custom fields
}

export interface CompanyFieldUpdate {
  name: string;
  values: unknown[];
}

// Re-export any company-specific types as needed
