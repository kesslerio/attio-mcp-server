import { CachedTypeInfo } from './types.js';

export class TypeCache {
  private static fieldTypeCache = new Map<string, string>();
  private static attributeTypeCache = new Map<string, CachedTypeInfo>();
  private static CACHE_TTL = 30 * 60 * 1000;

  static getFieldType(field: string): string | undefined {
    return this.fieldTypeCache.get(field);
  }

  static setFieldType(field: string, type: string): void {
    this.fieldTypeCache.set(field, type);
  }

  static getAttributeType(field: string): CachedTypeInfo | undefined {
    return this.attributeTypeCache.get(field);
  }

  static setAttributeType(field: string, info: CachedTypeInfo): void {
    this.attributeTypeCache.set(field, info);
  }

  static clear(): void {
    this.fieldTypeCache.clear();
    this.attributeTypeCache.clear();
  }

  static isFresh(info: CachedTypeInfo, now: number): boolean {
    return now - info.timestamp < this.CACHE_TTL;
  }

  static get ttl(): number {
    return this.CACHE_TTL;
  }
}
