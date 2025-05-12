import { createErrorResult, AttioApiError, createApiError, createAttioError } from '../../src/utils/error-handler.js';

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
            method: 'get'
          }
        }
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
      }
    });

    it('should create a 401 error with authentication message', () => {
      const error = createApiError(401, '/api/endpoint', 'GET', {});
      
      expect(error).toBeInstanceOf(AttioApiError);
      if (error instanceof AttioApiError) {
        expect(error.status).toBe(401);
        expect(error.message).toContain('Authentication failed');
      }
    });

    it('should create a 429 error with rate limit message', () => {
      const error = createApiError(429, '/api/endpoint', 'GET', {});
      
      expect(error).toBeInstanceOf(AttioApiError);
      if (error instanceof AttioApiError) {
        expect(error.status).toBe(429);
        expect(error.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('createErrorResult', () => {
    it('should format an AttioApiError correctly', () => {
      const error = new AttioApiError('Test error', 500, 'test details', '/test', 'GET', { error: 'Test error' });
      const result = createErrorResult(error, '/unused', 'UNUSED');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ERROR: Test error');
      expect(result.content[0].text).toContain('Method: GET');
      expect(result.content[0].text).toContain('URL: /test');
      expect(result.content[0].text).toContain('Status: 500');
      expect(result.error.code).toBe(500);
      expect(result.error.message).toBe('Test error');
    });

    it('should create a properly formatted error result from status and response data', () => {
      const error = new Error('Test error');
      const url = '/test/url';
      const method = 'GET';
      const responseData = {
        status: 400,
        headers: { 'content-type': 'application/json' },
        data: { error: 'Bad request' }
      };

      const result = createErrorResult(error, url, method, responseData);

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('ERROR:')
          }
        ],
        isError: true,
        error: {
          code: 400,
          message: expect.any(String),
          details: expect.any(String)
        }
      });

      // Check that all required information is included in the text
      const text = result.content[0].text;
      expect(text).toContain('Method: GET');
      expect(text).toContain('URL: /test/url');
      expect(text).toContain('Status: 400');
    });

    it('should handle missing response data', () => {
      const error = new Error('Test error');
      const url = '/test/url';
      const method = 'GET';
      const responseData = {};

      const result = createErrorResult(error, url, method, responseData);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('ERROR: Test error')
          }
        ],
        isError: true,
        error: {
          code: 500,
          message: 'Test error',
          details: 'Unknown error occurred'
        }
      });
    });
  });
});
