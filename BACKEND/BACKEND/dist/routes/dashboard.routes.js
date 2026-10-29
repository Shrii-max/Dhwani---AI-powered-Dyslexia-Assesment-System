"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Helper: Normalize strings for fuzzy matching
function normalize(value) {
    return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Get user's assessment progress
router.get('/progress', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const studentId = req.studentId ? parseInt(req.studentId, 10) : null;
        if (!studentId) {
            return res.json({
                success: true,
                data: {
                    progress: {
                        totalTests: 10,
                        completedTests: 0,
                        percentage: 0,
                        categories: [
                            { name: 'Phonological Awareness', total: 6, completed: 0, status: 'Not started' },
                            { name: 'Word Reading', total: 3, completed: 0, status: 'Not started' },
                            { name: 'Rapid Automatized Naming', total: 1, completed: 0, status: 'Not started' }
                        ]
                    }
                }
            });
        }
        // Get latest session (in-progress or completed)
        const latestSession = await database_1.default.assessment_attempts.findFirst({
            where: { student_id: studentId },
            orderBy: { attempt_id: 'desc' },
            include: {
                student_responses: {
                    include: { item_bank: true }
                }
            }
        });
        if (!latestSession) {
            return res.json({
                success: true,
                data: {
                    progress: {
                        totalTests: 10,
                        completedTests: 0,
                        percentage: 0,
                        categories: [
                            { name: 'Phonological Awareness', total: 6, completed: 0, status: 'Not started' },
                            { name: 'Word Reading', total: 3, completed: 0, status: 'Not started' },
                            { name: 'Rapid Automatized Naming', total: 1, completed: 0, status: 'Not started' }
                        ]
                    }
                }
            });
        }
        // Calculate category progress from student responses
        const responses = latestSession.student_responses;
        const phonologicalCount = responses.filter(r => {
            const sec = normalize(r.item_bank.section);
            const sub = normalize(r.item_bank.subskill);
            return sec.includes('phonolog') || sec.includes('phoneme') || sub.includes('phon');
        }).length;
        const wordReadingCount = responses.filter(r => {
            const sec = normalize(r.item_bank.section);
            const sub = normalize(r.item_bank.subskill);
            return sec.includes('word') || sec.includes('reading') || sub.includes('reading') || sub.includes('pseudoword');
        }).length;
        const rapidNamingCount = responses.filter(r => {
            const sec = normalize(r.item_bank.section);
            const sub = normalize(r.item_bank.subskill);
            return sec.includes('rapid') || sec.includes('ran') || sub.includes('ran');
        }).length;
        const categories = [
            {
                name: 'Phonological Awareness',
                total: 6,
                completed: Math.min(phonologicalCount, 6),
                status: phonologicalCount >= 6 ? 'Complete' : phonologicalCount > 0 ? 'In progress' : 'Next'
            },
            {
                name: 'Word Reading',
                total: 3,
                completed: Math.min(wordReadingCount, 3),
                status: wordReadingCount >= 3 ? 'Complete' : wordReadingCount > 0 ? 'In progress' : (phonologicalCount >= 6 ? 'Next' : 'Later')
            },
            {
                name: 'Rapid Automatized Naming',
                total: 1,
                completed: Math.min(rapidNamingCount, 1),
                status: rapidNamingCount >= 1 ? 'Complete' : (phonologicalCount >= 6 && wordReadingCount >= 3 ? 'Next' : 'Later')
            }
        ];
        const completedTests = Math.min(responses.length, 10);
        const percentage = Math.round((completedTests / 10) * 100);
        res.json({
            success: true,
            data: {
                progress: {
                    sessionId: latestSession.attempt_id,
                    totalTests: 10,
                    completedTests,
                    percentage,
                    categories,
                    status: latestSession.status
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Get recommended practice activities
router.get('/recommendations', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const studentId = req.studentId ? parseInt(req.studentId, 10) : null;
        if (!studentId) {
            return res.json({
                success: true,
                data: { activities: getDefaultActivities() }
            });
        }
        // Get student's latest assessment result
        const latestResult = await database_1.default.overall_screening_result.findFirst({
            where: {
                assessment_attempts: { student_id: studentId }
            },
            orderBy: { attempt_id: 'desc' },
            include: {
                assessment_attempts: {
                    include: { section_scores: true }
                }
            }
        });
        if (!latestResult) {
            return res.json({
                success: true,
                data: { activities: getDefaultActivities() }
            });
        }
        const activities = generatePersonalizedActivities(latestResult);
        res.json({
            success: true,
            data: { activities }
        });
    }
    catch (error) {
        next(error);
    }
});
// Get dashboard summary
router.get('/summary', auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const studentId = req.studentId ? parseInt(req.studentId, 10) : null;
        const parentId = req.userId ? parseInt(req.userId, 10) : null;
        let student = null;
        let parent = null;
        if (studentId) {
            student = await database_1.default.students.findUnique({
                where: { student_id: studentId },
                include: { users: true }
            });
        }
        if (parentId && !student) {
            parent = await database_1.default.users.findUnique({
                where: { user_id: parentId }
            });
        }
        const effectiveStudentId = student?.student_id || studentId;
        let latestSession = null;
        let completedAttemptsCount = 0;
        if (effectiveStudentId) {
            latestSession = await database_1.default.assessment_attempts.findFirst({
                where: { student_id: effectiveStudentId },
                orderBy: { attempt_id: 'desc' },
                include: {
                    student_responses: true,
                    overall_screening_result: true
                }
            });
            completedAttemptsCount = await database_1.default.assessment_attempts.count({
                where: {
                    student_id: effectiveStudentId,
                    status: 'completed'
                }
            });
        }
        const userName = student?.name || parent?.name || 'Aarav';
        const assessmentProgress = latestSession ? Math.min(latestSession.student_responses.length, 10) : 0;
        const latestResult = latestSession?.overall_screening_result;
        res.json({
            success: true,
            data: {
                summary: {
                    userName,
                    assessmentProgress,
                    totalTests: 10,
                    practiceSessionsCompleted: completedAttemptsCount,
                    latestResult: latestResult ? {
                        dyslexiaRiskLevel: latestResult.profile_indicator,
                        dyslexiaRiskPercent: latestResult.composite_score,
                        interpretation: latestResult.interpretation
                    } : null
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Helper: Get default activities
function getDefaultActivities() {
    return [
        {
            title: 'Sound Detective',
            description: 'Find the first sound in words',
            duration: '8 min',
            category: 'Phonological Awareness',
            difficulty: 'beginner'
        },
        {
            title: 'Blend and Build',
            description: 'Join sounds into words',
            duration: '10 min',
            category: 'Phonological Awareness',
            difficulty: 'intermediate'
        },
        {
            title: 'Word Pathways',
            description: 'Practice familiar patterns',
            duration: '7 min',
            category: 'Word Reading',
            difficulty: 'beginner'
        }
    ];
}
// Helper: Generate personalized activities based on assessment results
function generatePersonalizedActivities(result) {
    const activities = [];
    const riskIndicator = result.profile_indicator?.toUpperCase() || '';
    const compositeScore = result.composite_score || 0;
    if (riskIndicator === 'HIGH' || compositeScore > 60) {
        activities.push({
            title: 'Targeted Phoneme Practice',
            description: 'Strengthen sound awareness and substitution',
            duration: '10 min',
            category: 'Phonological Awareness',
            difficulty: 'targeted',
            priority: 'high'
        });
    }
    if (riskIndicator === 'MODERATE' || (compositeScore >= 30 && compositeScore <= 60)) {
        activities.push({
            title: 'Sound Blending Exercises',
            description: 'Practice combining sounds smoothly into words',
            duration: '8 min',
            category: 'Phonological Awareness',
            difficulty: 'intermediate',
            priority: 'high'
        });
    }
    activities.push(...getDefaultActivities());
    return activities.slice(0, 4);
}
exports.default = router;
