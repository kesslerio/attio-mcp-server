export enum ErrorType {
  USER_ERROR = 'USER_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  API_ERROR = 'API_ERROR',
}

export enum HttpStatusCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

export class UniversalValidationError extends Error {
  public readonly errorType: ErrorType;
  public readonly suggestion?: string;
  public readonly example?: string;
  public readonly field?: string;
  public readonly httpStatusCode: HttpStatusCode;
  public readonly cause?: Error;

  constructor(
    message: string,
    errorType: ErrorType = ErrorType.USER_ERROR,
    options: {
      suggestion?: string;
      example?: string;
      field?: string;
      cause?: Error;
      httpStatusCode?: HttpStatusCode;
    } = {}
  ) {
    super(message);
    this.name = 'UniversalValidationError';
    this.errorType = errorType;
    this.suggestion = options.suggestion;
    this.example = options.example;
    this.field = options.field;
    this.cause = options.cause;
    this.httpStatusCode =
      options.httpStatusCode ?? this.getDefaultHttpStatus(errorType);
  }

  private getDefaultHttpStatus(errorType: ErrorType): HttpStatusCode {
    switch (errorType) {
      case ErrorType.USER_ERROR:
        return HttpStatusCode.BAD_REQUEST;
      case ErrorType.API_ERROR:
        return HttpStatusCode.BAD_GATEWAY;
      case ErrorType.SYSTEM_ERROR:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
  }

  toErrorResponse() {
    return {
      error: {
        type: this.errorType,
        message: this.message,
        field: this.field,
        suggestion: this.suggestion,
        example: this.example,
        httpStatusCode: this.httpStatusCode,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
