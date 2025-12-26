/**
 * Error utilities for Express server
 * Provides error handling helpers and custom error classes
 */

import { Request, Response } from 'express';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
}

export interface ErrorContext {
  userId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { context: this.context }),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context: ErrorContext = {}) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: ErrorContext = {}) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, 502, context);
  }
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: (error?: unknown) => void) => Promise<void>
) => {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error handler middleware
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: (error?: unknown) => void
) => {
  // Normalize error
  const appError = err instanceof AppError
    ? err
    : new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        err instanceof Error ? err.message : 'An unexpected error occurred',
        500,
        {
          path: req.path,
          method: req.method,
          originalError: err instanceof Error ? err.message : String(err),
        }
      );

  // Log error (use console.error for now, can be replaced with proper logger)
  console.error('Error occurred:', {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    path: req.path,
    method: req.method,
    stack: appError.stack,
    context: appError.context,
  });

  // Send error response
  res.status(appError.statusCode).json(appError.toJSON());
};

