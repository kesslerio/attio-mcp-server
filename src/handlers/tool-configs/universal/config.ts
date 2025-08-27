import { UniversalResourceType } from './types.js';

export const MappingDefaults: Record<
  UniversalResourceType,
  { strictMode: boolean }
> = {
  [UniversalResourceType.COMPANIES]: { strictMode: false },
  [UniversalResourceType.PEOPLE]: { strictMode: false },
  [UniversalResourceType.DEALS]: { strictMode: false },
  [UniversalResourceType.TASKS]: { strictMode: false },
  [UniversalResourceType.RECORDS]: { strictMode: true },
  [UniversalResourceType.NOTES]: { strictMode: true },
  [UniversalResourceType.LISTS]: { strictMode: false },
};

export const strictModeFor = (rt: UniversalResourceType) =>
  MappingDefaults[rt]?.strictMode ?? false;
