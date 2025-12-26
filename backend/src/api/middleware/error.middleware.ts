import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ErrorHandler, AppError, NotFoundError } from '../../utils/errors';
import { RequestWithId } from './requestId.middleware';

/**
 * Enhanced error handler middleware
 * Uses custom error classes for better error handling
 */
export const errorHandler = (
  err: unknown,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Normalize error to AppError
  const appError = ErrorHandler.normalizeError(err, {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log the error
  ErrorHandler.logError(appError, {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  // Format error response
  const errorResponse = ErrorHandler.formatErrorResponse(
    appError,
    process.env.NODE_ENV === 'development'
  );

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * Not found handler
 */
export const notFoundHandler = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError('Route', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  logger.warn('Route not found', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  const errorResponse = ErrorHandler.formatErrorResponse(error);
  res.status(404).json(errorResponse);
};

