/**
 * Request ID Middleware
 * Adds unique request ID to each request for better error tracking
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Middleware to add request ID to requests
 */
export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

