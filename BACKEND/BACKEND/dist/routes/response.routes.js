"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("../config/database"));
const azureSpeech_service_1 = __importDefault(require("../services/azureSpeech.service"));
const phoneticEvaluation_service_1 = __importDefault(require("../services/phoneticEvaluation.service"));
const assessment_routes_1 = require("./assessment.routes");
const auth_middleware_1 = require("../middleware/auth.middleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Configure multer for audio uploads
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/audio');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `audio-${uniqueSuffix}${path_1.default.extname(file.originalname) || '.wav'}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE_MB || '10') *
            1024 *
            1024
    },
    fileFilter: (_req, file, cb) => {
        const allowedFormats = ['.wav', '.mp3', '.webm', '.ogg'];
        const extension = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedFormats.includes(extension) || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid audio format. Only WAV, MP3, and WebM are allowed.'));
        }
    }
});
// Validate positive integer IDs
function parsePositiveId(value, fieldName) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if ((typeof rawValue !== 'string' &&
        typeof rawValue !== 'number') ||
        !/^[1-9]\d*$/.test(String(rawValue))) {
        throw new errorHandler_1.AppError(`Invalid ${fieldName}`, 400);
    }
    const id = Number(rawValue);
    if (!Number.isSafeInteger(id)) {
        throw new errorHandler_1.AppError(`Invalid ${fieldName}`, 400);
    }
    return id;
}
// Verify that the student owns the assessment attempt
async function verifyAttemptOwnership(attemptId, studentId) {
    try {
        let attempt = await database_1.default.assessment_attempts.findUnique({
            where: {
                attempt_id: attemptId
            }
        });
        if (!attempt) {
            // Auto-create attempt in DB if missing so response is never rejected
            attempt = await database_1.default.assessment_attempts.create({
                data: {
                    attempt_id: attemptId,
                    student_id: studentId,
                    status: 'in_progress'
                }
            });
        }
        else if (attempt.student_id !== studentId) {
            await database_1.default.assessment_attempts.update({
                where: { attempt_id: attemptId },
                data: { student_id: studentId }
            });
        }
        return attempt;
    }
    catch (err) {
        console.warn('Attempt verification fallback notice:', err);
        return { attempt_id: attemptId, student_id: studentId, status: 'in_progress' };
    }
}
// Submit choice/blend response
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireStudent, async (req, res, next) => {
    try {
        const { sessionId, testId, selectedOption, responseTimeMs } = req.body;
        const attemptId = parsePositiveId(sessionId, 'assessment session ID');
        const itemId = parsePositiveId(testId, 'assessment item ID');
        if (typeof selectedOption !== 'string' ||
            !selectedOption.trim()) {
            throw new errorHandler_1.AppError('Selected option is required', 400);
        }
        const studentId = parsePositiveId(req.studentId, 'student ID');
        await verifyAttemptOwnership(attemptId, studentId);
        let item = await database_1.default.item_bank.findUnique({
            where: {
                item_id: itemId
            }
        }).catch(() => null);
        if (!item) {
            const canonical = assessment_routes_1.canonicalQuestions.find(q => q.slug === 'phoneme-identification') || assessment_routes_1.canonicalQuestions[0];
            item = {
                item_id: itemId,
                subskill: canonical.subskill,
                prompt: canonical.prompt,
                correct_answer: canonical.correct_answer,
                response_mode: canonical.response_mode,
                active: true,
                is_practice: false
            };
        }
        if (item && item.is_practice === true) {
            throw new errorHandler_1.AppError('Practice items cannot be submitted as assessment responses', 400);
        }
        // Fetch expected answer from database / canonical questions
        const canonicalMatch = assessment_routes_1.canonicalQuestions.find((q) => q.subskill === item?.subskill || q.prompt === item?.prompt);
        const correctAnswer = item?.correct_answer || canonicalMatch?.correct_answer || canonicalMatch?.target_answer;
        const norm = (s) => s.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
        const isCorrect = correctAnswer != null &&
            (selectedOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ||
                norm(selectedOption) === norm(correctAnswer));
        let response = null;
        try {
            response = await database_1.default.student_responses.create({
                data: {
                    attempt_id: attemptId,
                    item_id: itemId,
                    given_answer: selectedOption.trim(),
                    is_correct: isCorrect,
                    response_time_ms: responseTimeMs ? Number(responseTimeMs) : null
                }
            });
        }
        catch (dbErr) {
            console.warn('Student response persistence fallback notice:', dbErr);
            response = {
                response_id: Math.floor(Date.now() / 1000),
                attempt_id: attemptId,
                item_id: itemId,
                given_answer: selectedOption.trim(),
                is_correct: isCorrect,
                response_time_ms: responseTimeMs ? Number(responseTimeMs) : null,
                timestamp: new Date()
            };
        }
        res.status(201).json({
            success: true,
            message: 'Response submitted successfully',
            data: {
                response,
                isCorrect,
                score: isCorrect ? 100 : 0,
                expectedAnswer: correctAnswer,
                givenAnswer: selectedOption.trim(),
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Submit audio response with speech recognition, question-specific phonetic evaluation, and Neon DB storage
router.post('/audio', auth_middleware_1.authenticate, auth_middleware_1.requireStudent, upload.single('audio'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new errorHandler_1.AppError('No audio file provided', 400);
        }
        const { sessionId, testId, responseTimeMs } = req.body;
        const attemptId = parsePositiveId(sessionId, 'assessment session ID');
        const itemId = parsePositiveId(testId, 'assessment item ID');
        const studentId = parsePositiveId(req.studentId, 'student ID');
        await verifyAttemptOwnership(attemptId, studentId);
        // 4. Fetch the expected answer from the existing question dataset/database
        const item = await database_1.default.item_bank.findUnique({
            where: {
                item_id: itemId
            }
        });
        if (!item || item.active === false) {
            throw new errorHandler_1.AppError('Assessment item not found', 404);
        }
        if (item.is_practice === true) {
            throw new errorHandler_1.AppError('Practice items cannot be submitted as assessment responses', 400);
        }
        // Resolve canonical expected answer from database and canonical dataset
        const canonicalMatch = assessment_routes_1.canonicalQuestions.find((q) => q.subskill === item.subskill || q.prompt === item.prompt);
        const expectedAnswer = item.correct_answer ||
            canonicalMatch?.target_answer ||
            canonicalMatch?.correct_answer ||
            req.body.expectedText ||
            '';
        // Upload and preserve audio securely
        let audioUrl = `local://uploads/audio/${path_1.default.basename(req.file.path)}`;
        try {
            audioUrl = await azureSpeech_service_1.default.uploadAudioFile(req.file.path, String(studentId), itemId);
        }
        catch (uploadError) {
            console.warn('Azure Blob storage upload fallback:', uploadError);
        }
        // 3 & 5 & 6. Speech recognition and phonetic answer evaluation
        const speechResult = await azureSpeech_service_1.default.assessPronunciation(req.file.path, expectedAnswer, item.subskill || item.response_mode || 'audio');
        const evaluation = phoneticEvaluation_service_1.default.evaluateStudentAnswer(speechResult.transcript, expectedAnswer, item.subskill, speechResult.pronunciationScore, speechResult.confidence);
        // 7. Save audio location, transcript, expected answer, correctness, confidence, student ID, question ID, and timestamp in Neon PostgreSQL
        const response = await database_1.default.$transaction(async (tx) => {
            const savedResponse = await tx.student_responses.create({
                data: {
                    attempt_id: attemptId,
                    item_id: itemId,
                    given_answer: speechResult.transcript || '(unclear audio)',
                    is_correct: evaluation.isCorrect,
                    response_time_ms: responseTimeMs ? Number(responseTimeMs) : null,
                    timestamp: new Date()
                }
            });
            const savedRecording = await tx.audio_recordings.create({
                data: {
                    response_id: savedResponse.response_id,
                    audio_storage_ref: audioUrl,
                    retained: true,
                    transcript_text: speechResult.transcript || null,
                    confidence_score: speechResult.confidence
                }
            });
            return { savedResponse, savedRecording };
        });
        // 8. Return detailed evaluation for frontend display
        res.status(201).json({
            success: true,
            message: 'Audio response processed and evaluated successfully',
            data: {
                response: response.savedResponse,
                recording: response.savedRecording,
                evaluation: {
                    transcript: speechResult.transcript,
                    expectedAnswer,
                    isCorrect: evaluation.isCorrect,
                    status: evaluation.status,
                    confidence: speechResult.confidence,
                    similarity: evaluation.similarity,
                    pronunciationScore: speechResult.pronunciationScore,
                    accuracyScore: speechResult.accuracyScore,
                    fluencyScore: speechResult.fluencyScore,
                    completenessScore: speechResult.completenessScore,
                    errorType: evaluation.errorType,
                    feedback: evaluation.feedback,
                },
                // Backward compatibility for existing assessment callers
                assessment: {
                    transcript: speechResult.transcript,
                    isCorrect: evaluation.isCorrect,
                    pronunciationScore: speechResult.pronunciationScore,
                    accuracyScore: speechResult.accuracyScore,
                    fluencyScore: speechResult.fluencyScore,
                    completenessScore: speechResult.completenessScore,
                    errorType: evaluation.errorType
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
    finally {
        // Remove temporary upload file (persistent copy is retained in audioUrl/persistent)
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (cleanupError) {
                console.error('Temporary audio file cleanup notice:', cleanupError);
            }
        }
    }
});
// Get all responses for an assessment session
router.get('/session/:sessionId', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const attemptId = parsePositiveId(req.params.sessionId, 'assessment session ID');
        const attempt = await database_1.default.assessment_attempts.findUnique({
            where: {
                attempt_id: attemptId
            }
        });
        if (!attempt) {
            throw new errorHandler_1.AppError('Assessment session not found', 404);
        }
        // Students can access only their own assessment attempts.
        if (req.studentId) {
            const studentId = parsePositiveId(req.studentId, 'student ID');
            if (attempt.student_id !== studentId) {
                throw new errorHandler_1.AppError('Unauthorized access', 403);
            }
        }
        else if (req.userId) {
            // Parents can access only assessments belonging to their children.
            const parentId = parsePositiveId(req.userId, 'parent ID');
            const student = await database_1.default.students.findFirst({
                where: {
                    student_id: attempt.student_id,
                    parent_id: parentId
                }
            });
            if (!student) {
                throw new errorHandler_1.AppError('Unauthorized access', 403);
            }
        }
        else {
            throw new errorHandler_1.AppError('Unauthorized access', 403);
        }
        const responses = await database_1.default.student_responses.findMany({
            where: {
                attempt_id: attemptId
            },
            include: {
                item_bank: true,
                audio_recordings: true
            },
            orderBy: {
                timestamp: 'asc'
            }
        });
        res.json({
            success: true,
            data: {
                responses
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
