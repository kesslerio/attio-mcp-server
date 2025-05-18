/**
 * Shared types for people module
 */
export declare class PersonOperationError extends Error {
    operation: string;
    personId?: string | undefined;
    constructor(operation: string, personId?: string | undefined, message?: string);
}
export declare class InvalidPersonDataError extends Error {
    constructor(message: string);
}
export declare class PersonValidator {
    static validateCreate(attributes: any): Promise<any>;
    static validateUpdate(personId: string, attributes: any): Promise<any>;
    static validateAttributeUpdate(personId: string, attributeName: string, attributeValue: any): Promise<void>;
    static validateDelete(personId: string): void;
}
//# sourceMappingURL=types.d.ts.map