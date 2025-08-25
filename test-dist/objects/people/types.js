/**
 * Shared types for people module
 */
import { isValidEmail } from '../../utils/validation/email-validation.js';
import { InvalidPersonDataError } from './errors.js';
// Re-export error classes for backward compatibility
export { PersonOperationError, InvalidPersonDataError } from './errors.js';
// Validator for person data
export class PersonValidator {
    static async validateCreate(attributes) {
        // Basic validation - ensure we have at least an email or name
        if (!attributes.email_addresses && !attributes.name) {
            throw new InvalidPersonDataError('Must provide at least an email address or name');
        }
        // Ensure email_addresses is an array if provided
        if (attributes.email_addresses &&
            !Array.isArray(attributes.email_addresses)) {
            attributes.email_addresses = [attributes.email_addresses];
        }
        // Validate email format
        if (attributes.email_addresses) {
            for (const emailItem of attributes.email_addresses) {
                let emailAddress;
                // Handle different email formats (same logic as ValidationService)
                if (typeof emailItem === 'string') {
                    emailAddress = emailItem;
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'email_address' in emailItem) {
                    const emailValue = emailItem.email_address;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: email_address must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'email' in emailItem) {
                    const emailValue = emailItem.email;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: email must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'value' in emailItem) {
                    const emailValue = emailItem.value;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: value must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else {
                    throw new InvalidPersonDataError(`Invalid email format: "${JSON.stringify(emailItem)}". Please provide a valid email address (e.g., user@example.com)`);
                }
                if (!isValidEmail(emailAddress)) {
                    throw new InvalidPersonDataError(`Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`);
                }
            }
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
            const emails = Array.isArray(attributeValue)
                ? attributeValue
                : [attributeValue];
            for (const emailItem of emails) {
                let emailAddress;
                // Handle different email formats (same logic as ValidationService)
                if (typeof emailItem === 'string') {
                    emailAddress = emailItem;
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'email_address' in emailItem) {
                    const emailValue = emailItem.email_address;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: email_address must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'email' in emailItem) {
                    const emailValue = emailItem.email;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: email must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else if (typeof emailItem === 'object' &&
                    emailItem &&
                    'value' in emailItem) {
                    const emailValue = emailItem.value;
                    if (typeof emailValue === 'string') {
                        emailAddress = emailValue;
                    }
                    else {
                        throw new InvalidPersonDataError(`Invalid email format: value must be a string, got ${typeof emailValue}. Please provide a valid email address (e.g., user@example.com)`);
                    }
                }
                else {
                    throw new InvalidPersonDataError(`Invalid email format: "${JSON.stringify(emailItem)}". Please provide a valid email address (e.g., user@example.com)`);
                }
                if (!isValidEmail(emailAddress)) {
                    throw new InvalidPersonDataError(`Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`);
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
