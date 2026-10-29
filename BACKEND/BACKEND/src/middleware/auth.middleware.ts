import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  studentId?: string;
  userType?: 'parent' | 'student';
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, secret) as any;

    // Check if it's a student or parent token
    if (decoded.studentId) {
      req.studentId = decoded.studentId.toString();
      req.userType = 'student';
    } else if (decoded.userId) {
      req.userId = decoded.userId.toString();
      req.userType = 'parent';

      // Auto-resolve or associate a primary student profile for this parent
      const parentId = parseInt(req.userId!, 10);
      let student = await prisma.students.findFirst({
        where: { parent_id: parentId },
        orderBy: { student_id: 'asc' }
      });

      if (!student) {
        const parentUser = await prisma.users.findUnique({
          where: { user_id: parentId }
        });
        const baseName = parentUser?.name || 'Aarav';
        const cleanUser = (parentUser?.email ? parentUser.email.split('@')[0] : 'student') + '_' + parentId;

        student = await prisma.students.create({
          data: {
            parent_id: parentId,
            name: baseName,
            username: cleanUser.replace(/[^a-zA-Z0-9_]/g, ''),
            pin_hash: parentUser?.password_hash || '',
            age: 8,
            grade: '3'
          }
        });
      }

      req.studentId = student.student_id.toString();
    } else {
      throw new AppError('Invalid token format', 401);
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const requireStudent = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.studentId) {
    return next(new AppError('Student authentication required', 403));
  }
  next();
};

export const requireParent = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userId || req.userType !== 'parent') {
    return next(new AppError('Parent authentication required', 403));
  }
  next();
};
