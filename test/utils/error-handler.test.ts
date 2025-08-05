import {
  AttioApiError,
  createApiError,
  createAttioError,
  createErrorResult,
  ErrorType,
  formatErrorResponse,
} from '../../src/utils/error-handler';

describe('error-handler', () => {
  describe('createAttioError', () => {
    it('should return an AttioApiError instance when given an Axios error', () => {
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Resource not found' },
          config: {
            url: '/api/resource',
            method: 'get',
          },
        },
      };

      const result = createAttioError(mockAxiosError);

      expect(result).toBeInstanceOf(Error);
      if (result instanceof AttioApiError) {
        expect(result.status).toBe(404);
        expect(result.path).toBe('/api/resource');
      }
    });

    it('should return the original error when not an Axios error', () => {
      const originalError = new Error('Original error');
      const result = createAttioError(originalError);

      expect(result).toBe(originalError);
    });
  });

  describe('createApiError', () => {
    it('should create a 404 error with appropriate message for resources', () => {
      const error = createApiError(404, '/objects/companies/123', 'GET', {});

      expect(error).toBeInstanceOf(AttioApiError);
      if (error instanceof AttioApiError) {
        expect(error.status).toBe(404);
        expect(error.message).toContain('Company not found');
        expect(error.type).toBe(ErrorType.NOT_FOUND_ERROR);
      }
    });

    it('should create a 401 error with authentication message', () => {
      const error = createApiError(401, '/api/endpoint', 'GET', {});

      expect(error).toBeInstanceOf(AttioApiError);
      if (error instanceof AttioApiError) {
        expect(error.status).toBe(401);
        expect(error.message).toContain('Authentication failed');
        expect(error.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      }
    });

    it('should create a 429 error with rate limit message', () => {
      const error = createApiError(429, '/api/endpoint', 'GET', {});

      expect(error).toBeInstanceOf(AttioApiError);
      if (error instanceof AttioApiError) {
        expect(error.status).toBe(429);
        expect(error.message).toContain('Rate limit exceeded');
        expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR);
      }
    });
  });

  describe('createErrorResult', () => {
    it('should format an AttioApiError correctly', () => {
      const error = new AttioApiError(
        'Test error',
        500,
        'test details',
        '/test',
        'GET',
        ErrorType.SERVER_ERROR,
        { error: 'Test error' }
      );
      const result = createErrorResult(error, '/unused', 'UNUSED');

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        `ERROR [${ErrorType.SERVER_ERROR}]: Test error`
      );
      expect(result.error.code).toBe(500);
      expect(result.error.message).toBe('Test error');
      expect(result.error.type).toBe(ErrorType.SERVER_ERROR);
    });

    it('should create a properly formatted error result from status and response data', () => {
      const error = new Error('Test error');
      const url = '/test/url';
      const method = 'GET';
      const responseData = {
        status: 400,
        headers: { 'content-type': 'application/json' },
        data: { error: 'Bad request' },
      };

      const result = createErrorResult(error, url, method, responseData);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('ERROR'),
          },
        ],
        isError: true,
        error: {
          code: 400,
          message: expect.any(String),
          type: ErrorType.VALIDATION_ERROR,
        },
      });

      // Check that the error type is properly set
      expect(result.error.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should handle missing response data', () => {
      const error = new Error('Test error');
      const url = '/test/url';
      const method = 'GET';
      const responseData = {};

      const result = createErrorResult(error, url, method, responseData);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        `ERROR [${ErrorType.UNKNOWN_ERROR}]`
      );
      expect(result.error.code).toBe(500);
      expect(result.error.message).toBe('Test error');
      expect(result.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe('formatErrorResponse', () => {
    it('should create a properly formatted error response based on error type', () => {
      const error = new Error('Validation error');
      const result = formatErrorResponse(error, ErrorType.VALIDATION_ERROR, {
        field: 'username',
        message: 'Required',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        `ERROR [${ErrorType.VALIDATION_ERROR}]`
      );
      expect(result.error.code).toBe(400);
      expect(result.error.message).toBe('Validation error');
      expect(result.error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.error.details).toEqual({
        field: 'username',
        message: 'Required',
      });
    });

    it('should set the appropriate error code based on error type', () => {
      const testCases = [
        { type: ErrorType.VALIDATION_ERROR, expectedCode: 400 },
        { type: ErrorType.AUTHENTICATION_ERROR, expectedCode: 401 },
        { type: ErrorType.RATE_LIMIT_ERROR, expectedCode: 429 },
        { type: ErrorType.NOT_FOUND_ERROR, expectedCode: 404 },
        { type: ErrorType.SERVER_ERROR, expectedCode: 500 },
        { type: ErrorType.UNKNOWN_ERROR, expectedCode: 500 },
      ];

      testCases.forEach((testCase) => {
        const result = formatErrorResponse(
          new Error('Test error'),
          testCase.type
        );
        expect(result.error.code).toBe(testCase.expectedCode);
      });
    });
  });
});
