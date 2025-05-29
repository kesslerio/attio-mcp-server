/**
 * Type definitions for people tool configurations
 */

export interface CompanyFilterAttribute {
  slug: 'companies.id' | 'companies.name';
}

export interface CompanyFilter {
  attribute: CompanyFilterAttribute;
  condition: 'equals' | 'contains' | 'starts_with' | 'ends_with';
  value: string | { record_id: string };
}

export interface CompanyFilterRequest {
  companyFilter: {
    filters: CompanyFilter[];
    matchAny?: boolean;
  };
}

export interface PersonSearchResult {
  id: {
    record_id: string;
  };
  values: {
    name?: Array<{
      full_name: string;
      first_name?: string;
      last_name?: string;
    }>;
  };
}
