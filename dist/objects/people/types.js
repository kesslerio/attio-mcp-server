/**
 * Shared types for people module
 */
// Error classes for people operations
export class PersonOperationError extends Error {
    operation;
    personId;
    constructor(operation, personId, message) {
        super(`Person ${operation} failed${personId ? ` for ${personId}` : ''}: ${message}`);
        this.operation = operation;
        this.personId = personId;
        this.name = 'PersonOperationError';
    }
}
export class InvalidPersonDataError extends Error {
    constructor(message) {
        super(`Invalid person data: ${message}`);
        this.name = 'InvalidPersonDataError';
    }
}
// Validator for person data
export class PersonValidator {
    static async validateCreate(attributes) {
        // Basic validation - ensure we have at least an email or name
        if (!attributes.email_addresses && !attributes.name) {
            throw new InvalidPersonDataError('Must provide at least an email address or name');
        }
        // Ensure email_addresses is an array if provided
        if (attributes.email_addresses && !Array.isArray(attributes.email_addresses)) {
            attributes.email_addresses = [attributes.email_addresses];
        }
        return attributes;
    }
    static async validateUpdate(personId, attributes) {
        if (!personId || typeof personId !== 'string') {
            throw new InvalidPersonDataError('Person ID must be a non-empty string');
        }
        // Ensure at least one attribute is being updated
        if (!attributes || Object.keys(attributes).length === 0) {
            throw new InvalidPersonDataError('Must provide at least one attribute to update');
        }
        return attributes;
    }
    static async validateAttributeUpdate(personId, attributeName, attributeValue) {
        if (!personId || typeof personId !== 'string') {
            throw new InvalidPersonDataError('Person ID must be a non-empty string');
        }
        if (!attributeName || typeof attributeName !== 'string') {
            throw new InvalidPersonDataError('Attribute name must be a non-empty string');
        }
        // Special validation for email_addresses
        if (attributeName === 'email_addresses' && attributeValue) {
            const emails = Array.isArray(attributeValue) ? attributeValue : [attributeValue];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const email of emails) {
                if (!emailRegex.test(email)) {
                    throw new InvalidPersonDataError(`Invalid email format: ${email}`);
                }
            }
        }
    }
    static validateDelete(personId) {
        if (!personId || typeof personId !== 'string') {
            throw new InvalidPersonDataError('Person ID must be a non-empty string');
        }
    }
}
//# sourceMappingURL=types.js.map