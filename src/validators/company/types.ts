import type { AttributeType } from '../attribute-validator.js';
export interface CachedTypeInfo {
  fieldType: string;
  attioType: string;
  validatorType: AttributeType;
  timestamp: number;
}
