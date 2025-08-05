/**
 * Shared types for company modules
 */
export type {
  AttioNote,
  Company,
  FilterConditionType,
  RecordAttributes,
} from '../../types/attio.js';

export type {
  CompanyAttributeUpdate,
  CompanyCreateInput,
  CompanyUpdateInput,
} from '../../types/company-types.js';

// Define more specific types for company attributes
export interface CompanyAttributes {
  name?: string;
  website?: string;
  industry?: string;
  domains?: string[];
  description?: string;
  type?: string;
  type_persona?: string;
  services?: string[];
  categories?: string[];
  estimated_arr_usd?: number;
  funding_raised_usd?: number;
  employee_range?: string;
  foundation_date?: string;
  primary_location?: string;
  [key: string]: any; // Allow for custom fields
}

export interface CompanyFieldUpdate {
  name: string;
  values: any[];
}

// Re-export any company-specific types as needed
