/**
 * Shared error classes for people operations
 */
/**
 * Error class for people operation failures
 */
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
/**
 * Error class for invalid person data
 */
export class InvalidPersonDataError extends Error {
    constructor(message) {
        super(`Invalid person data: ${message}`);
        this.name = 'InvalidPersonDataError';
    }
}
