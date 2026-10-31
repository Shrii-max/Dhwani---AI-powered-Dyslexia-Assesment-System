"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const assessment_routes_1 = __importStar(require("./routes/assessment.routes"));
const response_routes_1 = __importDefault(require("./routes/response.routes"));
const results_routes_1 = __importDefault(require("./routes/results.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Universal CORS configuration supporting credentials and all origins
const corsOptions = {
    origin: (origin, callback) => {
        // Dynamically allow requesting origin (e.g. http://localhost:8443, 5173, etc.)
        callback(null, origin || true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Range',
        'Cache-Control',
        'x-client-info'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Dhwani Backend API'
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/assessments', assessment_routes_1.default);
app.use('/api/responses', response_routes_1.default);
app.use('/api/results', results_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Dhwani Backend Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8443'}`);
    // Safe question verification and synchronization on startup
    (0, assessment_routes_1.auditAndSyncDatabaseQuestions)()
        .then((r) => console.log('✅ Question data audit & sync status:', r))
        .catch((err) => console.warn('Question audit/sync notice:', err));
});
exports.default = app;
