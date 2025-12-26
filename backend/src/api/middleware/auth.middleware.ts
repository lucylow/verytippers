import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/app';
import { PrismaService } from '../../services/database/prisma.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    verychatId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      
      // Get user from database
      const prisma = PrismaService.getInstance();
      const user = await prisma.prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      req.user = {
        id: user.id,
        walletAddress: user.walletAddress,
        verychatId: user.verychatId
      };
      
      next();
      
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

