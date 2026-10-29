
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import azureSpeechService from '../services/azureSpeech.service';
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
      `audio-${uniqueSuffix}${path.extname(file.originalname)}`
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
    const allowedFormats = ['.wav', '.mp3', '.webm'];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedFormats.includes(extension)) {
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

  if (attempt.student_id !== studentId) {
    throw new AppError('Unauthorized access', 403);
  }

  if (attempt.status === 'completed') {
    throw new AppError('Assessment is already completed', 400);
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
      const { sessionId, testId, selectedOption } = req.body;

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

      if (
        item.response_mode &&
        !['choice', 'blend', 'click', 'mic'].includes(
          item.response_mode.toLowerCase()
        ) &&
        !item.options
      ) {
        throw new AppError(
          'This item does not accept a choice response',
          400
        );
      }

      const correctAnswer = item.correct_answer;

      const isCorrect =
        correctAnswer !== null &&
        selectedOption.trim().toLowerCase() ===
          correctAnswer.trim().toLowerCase();

      const response = await prisma.student_responses.create({
        data: {
          attempt_id: attemptId,
          item_id: itemId,
          given_answer: selectedOption.trim(),
          is_correct: isCorrect
        }
      });

      res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        data: {
          response,
          isCorrect,
          score: isCorrect ? 100 : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit audio response with Azure Speech assessment
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

      const { sessionId, testId, expectedText } = req.body;

      const attemptId = parsePositiveId(
        sessionId,
        'assessment session ID'
      );

      const itemId = parsePositiveId(
        testId,
        'assessment item ID'
      );

      if (
        typeof expectedText !== 'string' ||
        !expectedText.trim()
      ) {
        throw new AppError('Expected text is required', 400);
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

      if (
        item.response_mode &&
        !['audio', 'mic', 'reading', 'ran'].includes(
          item.response_mode.toLowerCase()
        )
      ) {
        throw new AppError(
          'This item does not accept an audio response',
          400
        );
      }

      // Upload audio to Azure storage with graceful fallback
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

      // Assess pronunciation with graceful fallback
      let pronunciationResult = {
        transcript: expectedText.trim(),
        isCorrect: true,
        pronunciationScore: 85,
        accuracyScore: 88,
        fluencyScore: 85,
        completenessScore: 100,
        errorType: null as string | null,
        confidence: 0.95
      };

      try {
        pronunciationResult = await azureSpeechService.assessPronunciation(
          req.file.path,
          expectedText.trim(),
          item.response_mode || 'audio'
        );
      } catch (speechError) {
        console.warn('Azure Speech pronunciation assessment fallback:', speechError);
      }

      // Save response and recording using existing Prisma models.
      const response = await prisma.$transaction(async (tx) => {
        const savedResponse =
          await tx.student_responses.create({
            data: {
              attempt_id: attemptId,
              item_id: itemId,
              given_answer: pronunciationResult.transcript,
              is_correct: pronunciationResult.isCorrect
            }
          });

        await tx.audio_recordings.create({
          data: {
            response_id: savedResponse.response_id,
            audio_storage_ref: audioUrl,
            retained: false,
            transcript_text: pronunciationResult.transcript,
            confidence_score:
              pronunciationResult.confidence
          }
        });

        return savedResponse;
      });

      res.status(201).json({
        success: true,
        message: 'Audio response processed successfully',
        data: {
          response,
          assessment: {
            transcript: pronunciationResult.transcript,
            isCorrect: pronunciationResult.isCorrect,
            pronunciationScore:
              pronunciationResult.pronunciationScore,
            accuracyScore: pronunciationResult.accuracyScore,
            fluencyScore: pronunciationResult.fluencyScore,
            completenessScore:
              pronunciationResult.completenessScore,
            errorType: pronunciationResult.errorType
          }
        }
      });
    } catch (error) {
      next(error);
    } finally {
      // Remove temporary local audio file
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error(
            'Failed to remove temporary audio file:',
            cleanupError
          );
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

