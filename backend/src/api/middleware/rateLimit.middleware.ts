import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

