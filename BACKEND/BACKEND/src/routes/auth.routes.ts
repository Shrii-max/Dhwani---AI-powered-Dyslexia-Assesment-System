import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Signup - creates user (parent)
router.post('/signup', async (req, res, next) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        email: validatedData.email,
        password_hash: hashedPassword,
        name: validatedData.name
      },
      select: {
        user_id: true,
        email: true,
        name: true,
        created_at: true
      }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const payload = { userId: user.user_id, email: user.email };
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.users.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.password_hash
    );

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const payload = { userId: user.user_id, email: user.email };
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: { user_id: parseInt(req.userId!) },
      select: {
        user_id: true,
        email: true,
        name: true,
        created_at: true,
        students: {
          select: {
            student_id: true,
            name: true,
            username: true,
            age: true,
            grade: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Create student profile
router.post('/student', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, age, grade, username, pin } = req.body;

    if (!name || !username || !pin) {
      throw new AppError('Name, username, and PIN are required', 400);
    }

    // Check if username exists
    const existingStudent = await prisma.students.findUnique({
      where: { username }
    });

    if (existingStudent) {
      throw new AppError('Username already taken', 400);
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Create student
    const student = await prisma.students.create({
      data: {
        parent_id: parseInt(req.userId!),
        name,
        age: age ? parseInt(age) : null,
        grade,
        username,
        pin_hash: pinHash
      }
    });

    res.status(201).json({
      success: true,
      message: 'Student profile created',
      data: { student }
    });
  } catch (error) {
    next(error);
  }
});

// Student login
router.post('/student/login', async (req, res, next) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      throw new AppError('Username and PIN are required', 400);
    }

    const student = await prisma.students.findUnique({
      where: { username }
    });

    if (!student) {
      throw new AppError('Invalid username or PIN', 401);
    }

    const isValidPin = await bcrypt.compare(pin, student.pin_hash);

    if (!isValidPin) {
      throw new AppError('Invalid username or PIN', 401);
    }

    // Generate JWT for student
    const token = jwt.sign(
      { studentId: student.student_id, username: student.username, type: 'student' },
      process.env.JWT_SECRET as string,
      { expiresIn: '2h' } // Shorter expiry for students
    );

    res.json({
      success: true,
      message: 'Student login successful',
      data: {
        student: {
          student_id: student.student_id,
          name: student.name,
          username: student.username,
          age: student.age,
          grade: student.grade
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
