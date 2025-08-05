import { ErrorType } from '../../src/utils/error-handler';
import {
  type ValidationSchema,
  validateInput,
  validateRequest,
} from '../../src/utils/validation';

describe('validation', () => {
  describe('validateInput', () => {
    it('should validate a simple object against a schema', () => {
      const input = {
        name: 'Test User',
        age: 30,
        email: 'test@example.com',
      };

      const schema: ValidationSchema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', () => {
      const input = {
        name: 'Test User',
      };

      const schema: ValidationSchema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('email');
      expect(result.errors[0]).toContain('missing');
    });

    it('should validate type mismatches', () => {
      const input = {
        name: 'Test User',
        age: 'thirty',
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('age');
      expect(result.errors[0]).toContain('number');
    });

    it('should validate nested objects', () => {
      const input = {
        name: 'Test User',
        address: {
          street: '123 Main St',
          city: 'Testville',
          zip: 12_345,
        },
      };

      const schema: ValidationSchema = {
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: { type: 'string' },
          address: {
            type: 'object',
            required: ['street', 'city', 'zip'],
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zip: { type: 'number' },
            },
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate arrays', () => {
      const input = {
        name: 'Test User',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate array items', () => {
      const input = {
        name: 'Test User',
        tags: ['tag1', 'tag2', 123],
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('tags[2]');
      expect(result.errors[0]).toContain('string');
    });

    it('should validate string constraints', () => {
      const input = {
        username: 'user',
        password: 'pass',
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
          },
          password: {
            type: 'string',
            minLength: 8,
            pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$',
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('password');
      expect(result.errors[0]).toContain('at least 8');
      expect(result.errors[1]).toContain('password');
      expect(result.errors[1]).toContain('pattern');
    });

    it('should validate number constraints', () => {
      const input = {
        age: 15,
        score: 110,
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          age: {
            type: 'number',
            minimum: 18,
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('age');
      expect(result.errors[0]).toContain('greater than or equal to 18');
      expect(result.errors[1]).toContain('score');
      expect(result.errors[1]).toContain('less than or equal to 100');
    });

    it('should validate enum values', () => {
      const input = {
        status: 'pending',
        priority: 'urgent',
      };

      const schema: ValidationSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'active', 'completed'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
        },
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('priority');
      expect(result.errors[0]).toContain('one of: low, medium, high');
    });
  });

  describe('validateRequest', () => {
    it('should return null for valid input', () => {
      const input = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const schema: ValidationSchema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const errorFormatter = vi.fn((error, type, details) => ({
        error: true,
        message: error.message,
        type,
        details,
      }));

      const result = validateRequest(input, schema, errorFormatter);
      expect(result).toBeNull();
      expect(errorFormatter).not.toHaveBeenCalled();
    });

    it('should return formatted error for invalid input', () => {
      const input = {
        name: 'Test User',
        // missing required email
      };

      const schema: ValidationSchema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const errorFormatter = vi.fn((error, type, details) => ({
        error: true,
        message: error.message,
        type,
        details,
      }));

      const result = validateRequest(input, schema, errorFormatter);
      expect(result).not.toBeNull();
      expect(errorFormatter).toHaveBeenCalledWith(
        expect.any(Error),
        ErrorType.VALIDATION_ERROR,
        expect.objectContaining({
          errors: expect.arrayContaining([expect.stringContaining('email')]),
          input,
        })
      );
    });
  });
});
