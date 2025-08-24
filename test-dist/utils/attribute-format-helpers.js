/**
 * Attribute format helpers to convert common user mistakes to correct API formats
 *
 * This module provides automatic format conversion for common attribute mistakes
 * to improve user experience and reduce errors.
 */
/**
 * Converts common attribute format mistakes to correct API format
 *
 * @param resourceType - The type of resource (companies, people, etc.)
 * @param attributes - The attributes object with potential format issues
 * @returns Corrected attributes object
 */
export function convertAttributeFormats(resourceType, attributes) {
    let corrected = { ...attributes };
    switch (resourceType) {
        case 'companies':
            corrected = convertCompanyAttributes(corrected);
            break;
        case 'people':
            corrected = convertPeopleAttributes(corrected);
            break;
    }
    return corrected;
}
/**
 * Converts company attribute formats
 */
function convertCompanyAttributes(attributes) {
    const corrected = { ...attributes };
    // Convert 'domain' to 'domains' array
    if ('domain' in corrected && !('domains' in corrected)) {
        corrected.domains = Array.isArray(corrected.domain)
            ? corrected.domain
            : [corrected.domain];
        delete corrected.domain;
        console.error(`[Format Helper] Converted 'domain' to 'domains' array`);
    }
    // Ensure domains is always an array
    if (corrected.domains && !Array.isArray(corrected.domains)) {
        corrected.domains = [corrected.domains];
        console.error(`[Format Helper] Converted domains to array format`);
    }
    // Handle common typos
    if ('typpe' in corrected && !('type' in corrected)) {
        corrected.type = corrected.typpe;
        delete corrected.typpe;
        console.error(`[Format Helper] Fixed typo: 'typpe' -> 'type'`);
    }
    return corrected;
}
/**
 * Converts people attribute formats
 */
function convertPeopleAttributes(attributes) {
    const corrected = { ...attributes };
    // Convert name from object format to string
    if (corrected.name && typeof corrected.name === 'object') {
        const nameObj = corrected.name;
        let fullName = '';
        // Handle various name object formats
        if (nameObj.first_name || nameObj.firstName) {
            fullName = nameObj.first_name || nameObj.firstName;
        }
        if (nameObj.last_name || nameObj.lastName) {
            fullName = fullName
                ? `${fullName} ${nameObj.last_name || nameObj.lastName}`
                : nameObj.last_name || nameObj.lastName;
        }
        if (nameObj.middle_name || nameObj.middleName) {
            // Insert middle name between first and last
            const parts = fullName.split(' ');
            if (parts.length >= 2) {
                parts.splice(1, 0, nameObj.middle_name || nameObj.middleName);
                fullName = parts.join(' ');
            }
        }
        corrected.name = fullName.trim() || 'Unknown';
        console.error(`[Format Helper] Converted name object to string: "${corrected.name}"`);
    }
    // Convert email_addresses from object format to string array
    if (corrected.email_addresses && Array.isArray(corrected.email_addresses)) {
        const converted = corrected.email_addresses.map((item) => {
            if (typeof item === 'object' && item.email_address) {
                console.error(`[Format Helper] Converting email object format to string`);
                return item.email_address;
            }
            return item;
        });
        corrected.email_addresses = converted;
    }
    // Ensure email_addresses is always an array
    if (corrected.email_addresses && !Array.isArray(corrected.email_addresses)) {
        corrected.email_addresses = [corrected.email_addresses];
        console.error(`[Format Helper] Converted email_addresses to array format`);
    }
    // Convert phone_numbers from object format to string array
    if (corrected.phone_numbers && Array.isArray(corrected.phone_numbers)) {
        const converted = corrected.phone_numbers.map((item) => {
            if (typeof item === 'object' && (item.phone_number || item.number)) {
                console.error(`[Format Helper] Converting phone object format to string`);
                return item.phone_number || item.number;
            }
            return item;
        });
        corrected.phone_numbers = converted;
    }
    return corrected;
}
/**
 * Generates helpful error message with correct format examples
 */
export function getFormatErrorHelp(resourceType, attributeName, error) {
    const examples = {
        companies: {
            domains: `
Correct format for 'domains':
- domains: ["example.com", "www.example.com"]
- NOT: domain: "example.com"
- NOT: domains: "example.com" (must be array)

Note: Use 'domains' (plural) to avoid creating duplicate companies!`,
            type: `
The 'type' field requires a valid select option from your workspace.
Common values might include: "Customer", "Partner", "Prospect", etc.
Check your Attio workspace for valid options.`,
        },
        people: {
            name: `
Correct format for 'name':
- name: "John Doe"
- name: "Jane Smith"
- NOT: name: {first_name: "John", last_name: "Doe"}
- NOT: name: {firstName: "John", lastName: "Doe"}

The name field should be a simple string, not an object.`,
            email_addresses: `
Correct format for 'email_addresses':
- email_addresses: ["user@example.com", "alt@example.com"]
- NOT: email_addresses: [{email_address: "user@example.com"}]
- NOT: email_addresses: "user@example.com" (must be array)`,
            phone_numbers: `
Correct format for 'phone_numbers':
- phone_numbers: ["+1234567890", "+0987654321"]
- NOT: phone_numbers: [{phone_number: "+1234567890"}]`,
            company: `
Correct format for 'company' (record reference):
- company: "company_id_here"
- company: {record_id: "company_id_here"}
- NOT: company: "Company Name" (use ID, not name)`,
        },
    };
    const helpText = examples[resourceType]?.[attributeName];
    if (helpText) {
        return `${error}\n${helpText}`;
    }
    return error;
}
