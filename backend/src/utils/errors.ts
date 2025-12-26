/**
 * Custom Error Classes for Better Error Handling
 * Provides structured error types with proper categorization
 */

import { logger } from './logger';

export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Permission errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Web3/Blockchain errors
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  
  // Business logic errors
  TIP_FAILED = 'TIP_FAILED',
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, context);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(ErrorCode.UNAUTHORIZED, message, 401, context);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(ErrorCode.FORBIDDEN, message, 403, context);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context: ErrorContext = {}) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, context);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: ErrorContext = {}) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, context);
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, context: ErrorContext = {}) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      500,
      {
        ...context,
        originalError: originalError?.message,
      },
      false
    );
  }
}

/**
 * External service error (500/502/503)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 502,
    context: ErrorContext = {}
  ) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service}: ${message}`,
      statusCode,
      { ...context, service },
      false
    );
  }
}

/**
 * Blockchain error
 */
export class BlockchainError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(ErrorCode.BLOCKCHAIN_ERROR, message, 500, context, false);
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends AppError {
  constructor(code: ErrorCode, message: string, context: ErrorContext = {}) {
    super(code, message, 400, context);
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Log error with proper context
   */
  static logError(error: Error | AppError, context: ErrorContext = {}): void {
    const errorContext = {
      ...context,
      ...(error instanceof AppError ? error.context : {}),
    };

    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError && {
          code: error.code,
          statusCode: error.statusCode,
          isOperational: error.isOperational,
        }),
      },
      context: errorContext,
    };

    if (error instanceof AppError && !error.isOperational) {
      // Non-operational errors are critical
      logger.error('Critical error occurred', logData);
    } else {
      logger.error('Error occurred', logData);
    }
  }

  /**
   * Convert unknown error to AppError
   */
  static normalizeError(error: unknown, context: ErrorContext = {}): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to categorize the error
      const message = error.message.toLowerCase();
      
      if (message.includes('validation') || message.includes('invalid')) {
        return new ValidationError(error.message, context);
      }
      
      if (message.includes('unauthorized') || message.includes('authentication')) {
        return new AuthenticationError(error.message, context);
      }
      
      if (message.includes('forbidden') || message.includes('permission')) {
        return new AuthorizationError(error.message, context);
      }
      
      if (message.includes('not found') || message.includes('404')) {
        return new NotFoundError(error.message, context);
      }
      
      if (message.includes('rate limit') || message.includes('429')) {
        return new RateLimitError(error.message, context);
      }
      
      if (message.includes('database') || message.includes('sql')) {
        return new DatabaseError(error.message, error, context);
      }
      
      // Default to internal server error
      return new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.message || 'An unexpected error occurred',
        500,
        context,
        false
      );
    }

    // Unknown error type
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      500,
      context,
      false
    );
  }

  /**
   * Format error for API response
   */
  static formatErrorResponse(error: AppError, includeStack: boolean = false) {
    const response: any = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
      },
    };

    // Include context in development
    if (process.env.NODE_ENV === 'development') {
      response.error.context = error.context;
      if (includeStack) {
        response.error.stack = error.stack;
      }
    }

    // Include request ID if available
    if (error.context.requestId) {
      response.requestId = error.context.requestId;
    }

    return response;
  }
}

