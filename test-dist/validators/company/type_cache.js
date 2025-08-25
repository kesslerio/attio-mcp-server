export class TypeCache {
    static fieldTypeCache = new Map();
    static attributeTypeCache = new Map();
    static CACHE_TTL = 30 * 60 * 1000;
    static getFieldType(field) {
        return this.fieldTypeCache.get(field);
    }
    static setFieldType(field, type) {
        this.fieldTypeCache.set(field, type);
    }
    static getAttributeType(field) {
        return this.attributeTypeCache.get(field);
    }
    static setAttributeType(field, info) {
        this.attributeTypeCache.set(field, info);
    }
    static clear() {
        this.fieldTypeCache.clear();
        this.attributeTypeCache.clear();
    }
    static isFresh(info, now) {
        return now - info.timestamp < this.CACHE_TTL;
    }
    static get ttl() {
        return this.CACHE_TTL;
    }
}
