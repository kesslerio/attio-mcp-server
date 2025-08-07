/**
 * Shared error classes for people operations
 */

/**
 * Error class for people operation failures
 */
export class PersonOperationError extends Error {
  constructor(
    public operation: string,
    public personId?: string,
    message?: string
  ) {
    super(
      `Person ${operation} failed${
        personId ? ` for ${personId}` : ''
      }: ${message}`
    );
    this.name = 'PersonOperationError';
  }
}

/**
 * Error class for invalid person data
 */
export class InvalidPersonDataError extends Error {
  constructor(message: string) {
    super(`Invalid person data: ${message}`);
    this.name = 'InvalidPersonDataError';
  }
}