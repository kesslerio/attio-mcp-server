import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { getValidResourceTypes } from '@/utils/resource-types.js';

export function isStandardResourceType(
  resourceType: string
): resourceType is UniversalResourceType {
  return Object.values(UniversalResourceType).includes(
    resourceType as UniversalResourceType
  );
}

export function isConfiguredCustomObjectResourceType(
  resourceType: string
): boolean {
  return (
    !isStandardResourceType(resourceType) &&
    getValidResourceTypes().includes(resourceType)
  );
}

export function isSupportedResourceType(resourceType: string): boolean {
  return (
    isStandardResourceType(resourceType) ||
    isConfiguredCustomObjectResourceType(resourceType)
  );
}
