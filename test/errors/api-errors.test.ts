import {
  AttioApiError,
  AuthenticationError,
  AuthorizationError,
  InvalidRequestError,
  RateLimitError,
  ResourceNotFoundError,
  ServerError,
  createApiErrorFromStatus,
  createApiErrorFromAxiosError
} from '../../src/errors/api-errors.js';

describe('api-errors', () => {
  describe('AttioApiError', () => {
    it('should create a base API error with all properties', () => {
      const error = new AttioApiError('Test error', 500, '/test', 'GET', { detail: 'test detail' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe('/test');
      expect(error.method).toBe('GET');
      expect(error.details).toEqual({ detail: 'test detail' });
      expect(error.name).toBe('AttioApiError');
      expect(error instanceof Error).toBe(true);
    });

    it('should format error message correctly', () => {
      const error = new AttioApiError('Test error', 500, '/test', 'GET', { detail: 'test detail' });
      const formatted = error.toFormattedString();
      
      expect(formatted).toContain('AttioApiError (500): Test error');
      expect(formatted).toContain('Endpoint: GET /test');
      expect(formatted).toContain('"detail": "test detail"');
    });
  });

  describe('Specialized error classes', () => {
    it('should create an AuthenticationError with correct defaults', () => {
      const error = new AuthenticationError(undefined, '/auth', 'POST');
      
      expect(error.message).toContain('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
      expect(error instanceof AttioApiError).toBe(true);
    });

    it('should create an AuthorizationError with correct defaults', () => {
      const error = new AuthorizationError(undefined, '/resource', 'GET');
      
      expect(error.message).toContain('Authorization failed');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
      expect(error instanceof AttioApiError).toBe(true);
    });

    it('should create a ResourceNotFoundError with correct formatting', () => {
      const error = new ResourceNotFoundError('Person', '123', '/people/123', 'GET');
      
      expect(error.message).toBe("Person with ID '123' not found");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ResourceNotFoundError');
      expect(error instanceof AttioApiError).toBe(true);
    });

    it('should create an InvalidRequestError', () => {
      const error = new InvalidRequestError('Invalid parameter', '/api', 'POST');
      
      expect(error.message).toBe('Invalid parameter');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('InvalidRequestError');
      expect(error instanceof AttioApiError).toBe(true);
    });

    it('should create a RateLimitError with correct defaults', () => {
      const error = new RateLimitError(undefined, '/api', 'GET');
      
      expect(error.message).toContain('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
      expect(error instanceof AttioApiError).toBe(true);
    });

    it('should create a ServerError with status code in message', () => {
      const error = new ServerError(503, 'Service unavailable', '/api', 'GET');
      
      expect(error.message).toContain('Server error (503)');
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('ServerError');
      expect(error instanceof AttioApiError).toBe(true);
    });
  });

  describe('createApiErrorFromStatus', () => {
    it('should create the correct error type based on status code', () => {
      expect(createApiErrorFromStatus(400, 'Bad request', '/api', 'POST')).toBeInstanceOf(InvalidRequestError);
      expect(createApiErrorFromStatus(401, 'Unauthorized', '/api', 'GET')).toBeInstanceOf(AuthenticationError);
      expect(createApiErrorFromStatus(403, 'Forbidden', '/api', 'GET')).toBeInstanceOf(AuthorizationError);
      expect(createApiErrorFromStatus(404, 'Not found', '/api', 'GET')).toBeInstanceOf(ResourceNotFoundError);
      expect(createApiErrorFromStatus(429, 'Too many requests', '/api', 'GET')).toBeInstanceOf(RateLimitError);
      expect(createApiErrorFromStatus(500, 'Server error', '/api', 'GET')).toBeInstanceOf(ServerError);
      expect(createApiErrorFromStatus(503, 'Service unavailable', '/api', 'GET')).toBeInstanceOf(ServerError);
      
      // Unknown status code should create a base AttioApiError
      expect(createApiErrorFromStatus(418, 'I\'m a teapot', '/api', 'GET')).toBeInstanceOf(AttioApiError);
    });
  });

  describe('createApiErrorFromAxiosError', () => {
    it('should handle Axios error response format', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { 
            message: 'Resource not found',
            error: 'not_found'
          }
        },
        message: 'Request failed with status code 404'
      };

      const error = createApiErrorFromAxiosError(axiosError, '/api/resource', 'GET');
      expect(error).toBeInstanceOf(ResourceNotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual(axiosError.response.data);
    });

    it('should correctly parse resource types from endpoints', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };

      const error = createApiErrorFromAxiosError(
        axiosError, 
        '/objects/people/records/123', 
        'GET'
      );
      
      expect(error).toBeInstanceOf(ResourceNotFoundError);
      expect(error.message).toBe("Person with ID '123' not found");
    });

    it('should handle missing response data', () => {
      const axiosError = {
        message: 'Network Error'
      };

      const error = createApiErrorFromAxiosError(axiosError, '/api', 'GET');
      expect(error).toBeInstanceOf(AttioApiError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('Network Error');
    });
  });
});