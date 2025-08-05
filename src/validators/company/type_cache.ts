import type { CachedTypeInfo } from './types.js';

export class TypeCache {
  private static fieldTypeCache = new Map<string, string>();
  private static attributeTypeCache = new Map<string, CachedTypeInfo>();
  private static CACHE_TTL = 30 * 60 * 1000;

  static getFieldType(field: string): string | undefined {
    return TypeCache.fieldTypeCache.get(field);
  }

  static setFieldType(field: string, type: string): void {
    TypeCache.fieldTypeCache.set(field, type);
  }

  static getAttributeType(field: string): CachedTypeInfo | undefined {
    return TypeCache.attributeTypeCache.get(field);
  }

  static setAttributeType(field: string, info: CachedTypeInfo): void {
    TypeCache.attributeTypeCache.set(field, info);
  }

  static clear(): void {
    TypeCache.fieldTypeCache.clear();
    TypeCache.attributeTypeCache.clear();
  }

  static isFresh(info: CachedTypeInfo, now: number): boolean {
    return now - info.timestamp < TypeCache.CACHE_TTL;
  }

  static get ttl(): number {
    return TypeCache.CACHE_TTL;
  }
}
