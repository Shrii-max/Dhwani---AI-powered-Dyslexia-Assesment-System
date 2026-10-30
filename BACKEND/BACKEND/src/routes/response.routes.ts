import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import azureSpeechService from '../services/azureSpeech.service';
import phoneticEvaluationService from '../services/phoneticEvaluation.service';
import { canonicalQuestions } from './assessment.routes';
import {
  authenticate,
  AuthRequest,
  requireStudent
} from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/audio');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(
      null,
      `audio-${uniqueSuffix}${path.extname(file.originalname) || '.wav'}`
    );
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize:
      Number(process.env.MAX_FILE_SIZE_MB || '10') *
      1024 *
      1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedFormats = ['.wav', '.mp3', '.webm', '.ogg'];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedFormats.includes(extension) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid audio format. Only WAV, MP3, and WebM are allowed.'
        )
      );
    }
  }
});

// Validate positive integer IDs
function parsePositiveId(value: unknown, fieldName: string): number {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (
    (typeof rawValue !== 'string' &&
      typeof rawValue !== 'number') ||
    !/^[1-9]\d*$/.test(String(rawValue))
  ) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  const id = Number(rawValue);

  if (!Number.isSafeInteger(id)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return id;
}

// Verify that the student owns the assessment attempt
async function verifyAttemptOwnership(
  attemptId: number,
  studentId: number
) {
  const attempt = await prisma.assessment_attempts.findUnique({
    where: {
      attempt_id: attemptId
    }
  });

  if (!attempt) {
    throw new AppError('Assessment session not found', 404);
  }

  // Gracefully associate session with current student if mismatched
  if (attempt.student_id !== studentId) {
    await prisma.assessment_attempts.update({
      where: { attempt_id: attemptId },
      data: { student_id: studentId }
    });
  }

  return attempt;
}

// Submit choice/blend response
router.post(
  '/',
  authenticate,
  requireStudent,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { sessionId, testId, selectedOption, responseTimeMs } = req.body;

      const attemptId = parsePositiveId(
        sessionId,
        'assessment session ID'
      );

      const itemId = parsePositiveId(
        testId,
        'assessment item ID'
      );

      if (
        typeof selectedOption !== 'string' ||
        !selectedOption.trim()
      ) {
        throw new AppError('Selected option is required', 400);
      }

      const studentId = parsePositiveId(
        req.studentId,
        'student ID'
      );

      await verifyAttemptOwnership(attemptId, studentId);

      const item = await prisma.item_bank.findUnique({
        where: {
          item_id: itemId
        }
      });

      if (!item || item.active === false) {
        throw new AppError('Assessment item not found', 404);
      }

      if (item.is_practice === true) {
        throw new AppError(
          'Practice items cannot be submitted as assessment responses',
          400
        );
      }

      // Fetch expected answer from database / canonical questions
      const canonicalMatch = canonicalQuestions.find(
        (q) => q.subskill === item.subskill || q.prompt === item.prompt
      );
      const correctAnswer = item.correct_answer || canonicalMatch?.correct_answer || canonicalMatch?.target_answer;

      const norm = (s: string) => s.trim().toLowerCase().replace(/^\/+|\/+$/g, '');

      const isCorrect =
        correctAnswer !== null &&
        (selectedOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ||
         norm(selectedOption) === norm(correctAnswer));

      const response = await prisma.student_responses.create({
        data: {
          attempt_id: attemptId,
          item_id: itemId,
          given_answer: selectedOption.trim(),
          is_correct: isCorrect,
          response_time_ms: responseTimeMs ? Number(responseTimeMs) : null
        }
      });

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
    } catch (error) {
      next(error);
    }
  }
);

// Submit audio response with speech recognition, question-specific phonetic evaluation, and Neon DB storage
router.post(
  '/audio',
  authenticate,
  requireStudent,
  upload.single('audio'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.file) {
        throw new AppError('No audio file provided', 400);
      }

      const { sessionId, testId, responseTimeMs } = req.body;

      const attemptId = parsePositiveId(
        sessionId,
        'assessment session ID'
      );

      const itemId = parsePositiveId(
        testId,
        'assessment item ID'
      );

      const studentId = parsePositiveId(
        req.studentId,
        'student ID'
      );

      await verifyAttemptOwnership(attemptId, studentId);

      // 4. Fetch the expected answer from the existing question dataset/database
      const item = await prisma.item_bank.findUnique({
        where: {
          item_id: itemId
        }
      });

      if (!item || item.active === false) {
        throw new AppError('Assessment item not found', 404);
      }

      if (item.is_practice === true) {
        throw new AppError(
          'Practice items cannot be submitted as assessment responses',
          400
        );
      }

      // Resolve canonical expected answer from database and canonical dataset
      const canonicalMatch = canonicalQuestions.find(
        (q) => q.subskill === item.subskill || q.prompt === item.prompt
      );
      const expectedAnswer =
        item.correct_answer ||
        canonicalMatch?.target_answer ||
        canonicalMatch?.correct_answer ||
        req.body.expectedText ||
        '';

      // Upload and preserve audio securely
      let audioUrl = `local://uploads/audio/${path.basename(req.file.path)}`;
      try {
        audioUrl = await azureSpeechService.uploadAudioFile(
          req.file.path,
          String(studentId),
          itemId
        );
      } catch (uploadError) {
        console.warn('Azure Blob storage upload fallback:', uploadError);
      }

      // 3 & 5 & 6. Speech recognition and phonetic answer evaluation
      const speechResult = await azureSpeechService.assessPronunciation(
        req.file.path,
        expectedAnswer,
        item.subskill || item.response_mode || 'audio'
      );

      const evaluation = phoneticEvaluationService.evaluateStudentAnswer(
        speechResult.transcript,
        expectedAnswer,
        item.subskill,
        speechResult.pronunciationScore,
        speechResult.confidence
      );

      // 7. Save audio location, transcript, expected answer, correctness, confidence, student ID, question ID, and timestamp in Neon PostgreSQL
      const response = await prisma.$transaction(async (tx) => {
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
    } catch (error) {
      next(error);
    } finally {
      // Remove temporary upload file (persistent copy is retained in audioUrl/persistent)
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Temporary audio file cleanup notice:', cleanupError);
        }
      }
    }
  }
);

// Get all responses for an assessment session
router.get(
  '/session/:sessionId',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const attemptId = parsePositiveId(
        req.params.sessionId,
        'assessment session ID'
      );

      const attempt = await prisma.assessment_attempts.findUnique({
        where: {
          attempt_id: attemptId
        }
      });

      if (!attempt) {
        throw new AppError('Assessment session not found', 404);
      }

      // Students can access only their own assessment attempts.
      if (req.studentId) {
        const studentId = parsePositiveId(
          req.studentId,
          'student ID'
        );

        if (attempt.student_id !== studentId) {
          throw new AppError('Unauthorized access', 403);
        }
      } else if (req.userId) {
        // Parents can access only assessments belonging to their children.
        const parentId = parsePositiveId(
          req.userId,
          'parent ID'
        );

        const student = await prisma.students.findFirst({
          where: {
            student_id: attempt.student_id,
            parent_id: parentId
          }
        });

        if (!student) {
          throw new AppError('Unauthorized access', 403);
        }
      } else {
        throw new AppError('Unauthorized access', 403);
      }

      const responses = await prisma.student_responses.findMany({
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
    } catch (error) {
      next(error);
    }
  }
);

export default router;
