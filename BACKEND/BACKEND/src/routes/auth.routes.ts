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
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address (e.g. name@example.com)'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters long')
    .max(100, 'Full name cannot exceed 100 characters')
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

// Signup - creates user (parent)
router.post('/signup', async (req, res, next) => {
  console.log(`[AUTH] POST /api/auth/signup received at ${new Date().toISOString()}`);
  console.log('[AUTH] Request body summary:', {
    name: req.body?.name,
    email: req.body?.email,
    hasPassword: Boolean(req.body?.password)
  });

  try {
    // 1. Validate payload with Zod safeParse
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const validationErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const field = issue.path[0] || 'form';
        if (!validationErrors[field]) {
          validationErrors[field] = issue.message;
        }
      });
      const firstError = parseResult.error.issues[0]?.message || 'Please check the form fields';
      console.warn('[AUTH] Signup validation rejected input:', validationErrors);

      return res.status(400).json({
        success: false,
        error: firstError,
        message: firstError,
        validationErrors
      });
    }

    const validatedData = parseResult.data;

    // 2. Check for duplicate email in Neon database
    let existingUser = null;
    try {
      existingUser = await prisma.users.findFirst({
        where: {
          email: {
            equals: validatedData.email,
            mode: 'insensitive'
          }
        }
      });
    } catch (dbQueryErr: any) {
      console.error('[AUTH] Neon DB connection check failed during signup:', dbQueryErr?.message || dbQueryErr);
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to database server. Please check your network and Neon credentials.',
        message: dbQueryErr?.message || 'Database connection failure.'
      });
    }

    if (existingUser) {
      console.warn('[AUTH] Duplicate email signup rejected:', validatedData.email);
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.',
        message: 'An account with this email address already exists. Please sign in instead.',
        validationErrors: {
          email: 'An account with this email address already exists.'
        }
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 4. Create user in Neon DB
    let user = null;
    try {
      user = await prisma.users.create({
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
      console.log(`[AUTH] Successfully created user in Neon DB: ${user.email} (ID: ${user.user_id})`);
    } catch (dbCreateErr: any) {
      console.error('[AUTH] Failed to create user in Neon DB:', dbCreateErr);
      if (dbCreateErr?.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
          message: 'An account with this email address already exists. Please sign in instead.',
          validationErrors: {
            email: 'An account with this email address already exists.'
          }
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create user record in database. Please inspect server logs.',
        message: dbCreateErr?.message || 'Database insert failed.'
      });
    }

    // 5. Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AUTH] JWT_SECRET is not configured in .env');
      return res.status(500).json({
        success: false,
        error: 'Server authentication configuration error (JWT secret missing).',
        message: 'JWT configuration error.'
      });
    }

    const payload = { userId: user.user_id, email: user.email };
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    console.log(`[AUTH] Successfully issued 24h JWT token for user ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token }
    });
  } catch (error: any) {
    console.error('[AUTH] Unexpected signup route error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'An unexpected error occurred during signup.',
      message: error?.message || 'An unexpected error occurred.'
    });
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user (case-insensitive email matching)
    const user = await prisma.users.findFirst({
      where: {
        email: {
          equals: validatedData.email,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        message: 'Invalid email or password'
      });
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
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === 'ZodError' || Array.isArray(error?.issues)) {
      const issues = (error?.issues || error?.errors || []) as z.ZodIssue[];
      const firstMessage = issues[0]?.message || 'Invalid email or password';
      return res.status(400).json({
        success: false,
        error: firstMessage,
        message: firstMessage
      });
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
