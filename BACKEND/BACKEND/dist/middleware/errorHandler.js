"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    // Unhandled errors
    console.error('ERROR 💥:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
            message: err.message,
            stack: err.stack
        })
    });
};
exports.errorHandler = errorHandler;
