import { UniversalResourceType } from '../types.js';

/**
 * Return plural form label for universal resource types. Used solely for result formatting.
 */
export function getPluralResourceType(
  resourceType: UniversalResourceType
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'companies';
    case UniversalResourceType.PEOPLE:
      return 'people';
    case UniversalResourceType.LISTS:
      return 'lists';
    case UniversalResourceType.RECORDS:
      return 'records';
    case UniversalResourceType.DEALS:
      return 'deals';
    case UniversalResourceType.TASKS:
      return 'tasks';
    case UniversalResourceType.NOTES:
      return 'notes';
    default:
      return 'records';
  }
}
