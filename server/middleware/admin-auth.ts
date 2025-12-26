import { Request, Response, NextFunction } from 'express';

/**
 * Simple admin authentication middleware
 * Checks for ADS_ADMIN_API_KEY in Authorization header or query param
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminKey = process.env.ADS_ADMIN_API_KEY || 'changeme';
  
  // Check Authorization header
  const authHeader = req.headers.authorization;
  const headerKey = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  // Check query parameter (for convenience in dev)
  const queryKey = req.query.apiKey as string | undefined;

  const providedKey = headerKey || queryKey;

  if (!providedKey || providedKey !== adminKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin access required'
    });
    return;
  }

  next();
}

