export enum AtlassianErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  CLIENT_NOT_CONFIGURED = 'CLIENT_NOT_CONFIGURED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',

  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AtlassianApiError extends Error {
  constructor(
    public readonly code: AtlassianErrorCode,
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error,
    public readonly responseData?: unknown,
  ) {
    super(message);
    this.name = 'AtlassianApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  static fromStatusCode(statusCode: number, message?: string): AtlassianErrorCode {
    switch (statusCode) {
      case 400:
        return AtlassianErrorCode.BAD_REQUEST;
      case 401:
        return AtlassianErrorCode.UNAUTHORIZED;
      case 403:
        return AtlassianErrorCode.FORBIDDEN;
      case 404:
        return AtlassianErrorCode.NOT_FOUND;
      case 429:
        return AtlassianErrorCode.RATE_LIMIT_EXCEEDED;
      case 500:
        return AtlassianErrorCode.SERVER_ERROR;
      case 503:
        return AtlassianErrorCode.SERVICE_UNAVAILABLE;
      default:
        return AtlassianErrorCode.UNKNOWN_ERROR;
    }
  }

  static fromAxiosError(error: any, product: string): AtlassianApiError {
    if (error.response) {
      const statusCode = error.response.status;
      const errorMessages = error.response.data?.errorMessages || [];
      const message =
        errorMessages[0] ||
        error.response.data?.message ||
        error.response.data?.error ||
        `API Error (${statusCode})`;

      return new AtlassianApiError(
        AtlassianApiError.fromStatusCode(statusCode, message),
        `${product}: ${message}`,
        statusCode,
        error,
        error.response.data,
      );
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return new AtlassianApiError(
          AtlassianErrorCode.TIMEOUT,
          `${product}: Request timeout`,
          undefined,
          error,
        );
      } else if (error.code === 'ECONNREFUSED') {
        return new AtlassianApiError(
          AtlassianErrorCode.CONNECTION_REFUSED,
          `${product}: Connection refused`,
          undefined,
          error,
        );
      } else {
        return new AtlassianApiError(
          AtlassianErrorCode.NETWORK_ERROR,
          `${product}: Network error - ${error.message}`,
          undefined,
          error,
        );
      }
    } else {
      return new AtlassianApiError(
        AtlassianErrorCode.UNKNOWN_ERROR,
        `${product}: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  isRetryable(): boolean {
    return (
      this.code === AtlassianErrorCode.NETWORK_ERROR ||
      this.code === AtlassianErrorCode.TIMEOUT ||
      this.code === AtlassianErrorCode.CONNECTION_REFUSED ||
      this.code === AtlassianErrorCode.RATE_LIMIT_EXCEEDED ||
      this.code === AtlassianErrorCode.SERVER_ERROR ||
      this.code === AtlassianErrorCode.SERVICE_UNAVAILABLE ||
      (this.statusCode !== undefined && this.statusCode >= 500)
    );
  }
}

export class JiraApiError extends AtlassianApiError {
  constructor(
    code: AtlassianErrorCode,
    message: string,
    statusCode?: number,
    originalError?: Error,
    responseData?: unknown,
  ) {
    super(code, `Jira: ${message}`, statusCode, originalError, responseData);
    this.name = 'JiraApiError';
  }
}

export class ConfluenceApiError extends AtlassianApiError {
  constructor(
    code: AtlassianErrorCode,
    message: string,
    statusCode?: number,
    originalError?: Error,
    responseData?: unknown,
  ) {
    super(code, `Confluence: ${message}`, statusCode, originalError, responseData);
    this.name = 'ConfluenceApiError';
  }
}
