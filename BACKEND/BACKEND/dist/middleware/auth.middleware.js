"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireParent = exports.requireStudent = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const database_1 = __importDefault(require("../config/database"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('No token provided', 401);
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new errorHandler_1.AppError('JWT secret not configured', 500);
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Check if it's a student or parent token
        if (decoded.studentId) {
            req.studentId = decoded.studentId.toString();
            req.userType = 'student';
        }
        else if (decoded.userId) {
            req.userId = decoded.userId.toString();
            req.userType = 'parent';
            // Auto-resolve or associate a primary student profile for this parent
            const parentId = parseInt(req.userId, 10);
            let student = await database_1.default.students.findFirst({
                where: { parent_id: parentId },
                orderBy: { student_id: 'asc' }
            });
            if (!student) {
                const parentUser = await database_1.default.users.findUnique({
                    where: { user_id: parentId }
                });
                const baseName = parentUser?.name || 'Aarav';
                const cleanUser = (parentUser?.email ? parentUser.email.split('@')[0] : 'student') + '_' + parentId;
                student = await database_1.default.students.create({
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
        }
        else {
            throw new errorHandler_1.AppError('Invalid token format', 401);
        }
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errorHandler_1.AppError('Invalid token', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errorHandler_1.AppError('Token expired', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const requireStudent = (req, res, next) => {
    if (!req.studentId) {
        return next(new errorHandler_1.AppError('Student authentication required', 403));
    }
    next();
};
exports.requireStudent = requireStudent;
const requireParent = (req, res, next) => {
    if (!req.userId || req.userType !== 'parent') {
        return next(new errorHandler_1.AppError('Parent authentication required', 403));
    }
    next();
};
exports.requireParent = requireParent;
