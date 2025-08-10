/**
 * Custom error classes for Readwise API
 */

export interface ReadwiseErrorOptions {
  code?: string;
  status?: number;
  retriable?: boolean;
  retryAfter?: number;
}

export class ReadwiseError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly retriable: boolean;
  public readonly retryAfter?: number;

  constructor(message: string, options: ReadwiseErrorOptions = {}) {
    super(message);
    this.name = 'ReadwiseError';
    this.code = options.code;
    this.status = options.status;
    this.retriable = options.retriable ?? this.isRetriableStatus(options.status);
    this.retryAfter = options.retryAfter;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReadwiseError);
    }
  }

  private isRetriableStatus(status?: number): boolean {
    if (!status) return false;
    // 429 (Rate Limited), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
    return status === 429 || (status >= 500 && status < 600);
  }
}

export class RateLimitError extends ReadwiseError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', {
      code: 'RATE_LIMIT',
      status: 429,
      retriable: true,
      retryAfter
    });
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ReadwiseError {
  constructor(message: string = 'Authentication failed') {
    super(message, {
      code: 'AUTH_FAILED',
      status: 401,
      retriable: false
    });
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ReadwiseError {
  constructor(message: string) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      retriable: false
    });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ReadwiseError {
  constructor(message: string) {
    super(message, {
      code: 'NETWORK_ERROR',
      retriable: true
    });
    this.name = 'NetworkError';
  }
}

export class ServerError extends ReadwiseError {
  constructor(status: number, message: string) {
    super(message, {
      code: 'SERVER_ERROR',
      status,
      retriable: status >= 500 && status < 600
    });
    this.name = 'ServerError';
  }
}
