"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Validation schemas
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters')
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required')
});
// Signup - creates user (parent)
router.post('/signup', async (req, res, next) => {
    try {
        const validatedData = signupSchema.parse(req.body);
        // Check if user exists
        const existingUser = await database_1.default.users.findUnique({
            where: { email: validatedData.email }
        });
        if (existingUser) {
            throw new errorHandler_1.AppError('Email already registered', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 10);
        // Create user
        const user = await database_1.default.users.create({
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
            throw new errorHandler_1.AppError('JWT secret not configured', 500);
        }
        const payload = { userId: user.user_id, email: user.email };
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.AppError(error.errors[0].message, 400));
        }
        next(error);
    }
});
// Login
router.post('/login', async (req, res, next) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        // Find user
        const user = await database_1.default.users.findUnique({
            where: { email: validatedData.email }
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(validatedData.password, user.password_hash);
        if (!isValidPassword) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        // Generate JWT
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new errorHandler_1.AppError('JWT secret not configured', 500);
        }
        const payload = { userId: user.user_id, email: user.email };
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '24h' });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.AppError(error.errors[0].message, 400));
        }
        next(error);
    }
});
// Get current user
router.get('/me', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const user = await database_1.default.users.findUnique({
            where: { user_id: parseInt(req.userId) },
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
            throw new errorHandler_1.AppError('User not found', 404);
        }
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        next(error);
    }
});
// Create student profile
router.post('/student', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { name, age, grade, username, pin } = req.body;
        if (!name || !username || !pin) {
            throw new errorHandler_1.AppError('Name, username, and PIN are required', 400);
        }
        // Check if username exists
        const existingStudent = await database_1.default.students.findUnique({
            where: { username }
        });
        if (existingStudent) {
            throw new errorHandler_1.AppError('Username already taken', 400);
        }
        // Hash PIN
        const pinHash = await bcryptjs_1.default.hash(pin, 10);
        // Create student
        const student = await database_1.default.students.create({
            data: {
                parent_id: parseInt(req.userId),
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
    }
    catch (error) {
        next(error);
    }
});
// Student login
router.post('/student/login', async (req, res, next) => {
    try {
        const { username, pin } = req.body;
        if (!username || !pin) {
            throw new errorHandler_1.AppError('Username and PIN are required', 400);
        }
        const student = await database_1.default.students.findUnique({
            where: { username }
        });
        if (!student) {
            throw new errorHandler_1.AppError('Invalid username or PIN', 401);
        }
        const isValidPin = await bcryptjs_1.default.compare(pin, student.pin_hash);
        if (!isValidPin) {
            throw new errorHandler_1.AppError('Invalid username or PIN', 401);
        }
        // Generate JWT for student
        const token = jsonwebtoken_1.default.sign({ studentId: student.student_id, username: student.username, type: 'student' }, process.env.JWT_SECRET, { expiresIn: '2h' } // Shorter expiry for students
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
