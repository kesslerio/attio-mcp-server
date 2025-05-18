/**
 * Shared types for company modules
 */
export type { 
  Company,
  AttioNote,
  FilterConditionType,
  RecordAttributes 
} from "../../types/attio.js";

export type { 
  CompanyCreateInput, 
  CompanyUpdateInput,
  CompanyAttributeUpdate 
} from "../../types/company-types.js";

// Re-export any company-specific types as needed